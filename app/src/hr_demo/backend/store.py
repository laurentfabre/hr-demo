"""Transactional synthetic action queue; Lakebase in Apps, explicit local dev DB."""
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import threading
import time
import uuid
from typing import Any

from databricks.sdk import WorkspaceClient

from fastapi import HTTPException

from .auth import Principal


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def digest(value) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


class Store:
    def __init__(self, client: WorkspaceClient | None = None, local_path: str | None = None):
        self.client = client
        self.local_path = local_path
        self.lock = threading.Lock()
        self.initialized = False
        self.token = None
        self.token_at = 0.0

    @property
    def kind(self) -> str:
        return "sqlite_local_development" if self.local_path else "lakebase"

    def table(self, name: str) -> str:
        return ("" if self.local_path else "app.") + "demo_" + name

    def execute(self, db, sql, params=()):
        return db.execute(sql if self.local_path else sql.replace("?", "%s"), params)

    @contextmanager
    def connection(self):
        if self.local_path:
            path = Path(self.local_path)
            path.parent.mkdir(parents=True, exist_ok=True)
            db = sqlite3.connect(path, timeout=10)
            db.row_factory = sqlite3.Row
            db.execute("PRAGMA foreign_keys=ON")
            db.execute("BEGIN IMMEDIATE")
        else:
            import psycopg
            from psycopg.rows import dict_row
            endpoint = os.environ["HR_DEMO_LAKEBASE_ENDPOINT"]
            if self.client is None:
                raise RuntimeError("Injected Databricks client required for Lakebase")
            with self.lock:
                if not self.token or time.monotonic() - self.token_at > 600:
                    self.token = self.client.postgres.generate_database_credential(endpoint=endpoint).token
                    self.token_at = time.monotonic()
            db = psycopg.Connection[dict[str, Any]].connect(host=os.environ["PGHOST"], port=int(os.getenv("PGPORT", "5432")),
                                  dbname=os.environ["PGDATABASE"], user=os.environ["PGUSER"], password=self.token,
                                  sslmode="require", connect_timeout=10, row_factory=dict_row)
        try:
            yield db
            db.commit()
        except BaseException:
            db.rollback()
            raise
        finally:
            db.close()

    def initialize(self):
        if self.initialized:
            return
        with self.connection() as db:
            if not self.local_path:
                db.execute("CREATE SCHEMA IF NOT EXISTS app")
            self.execute(db, f"""CREATE TABLE IF NOT EXISTS {self.table('actions')} (
                id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, option_id TEXT NOT NULL,
                state TEXT NOT NULL CHECK(state IN ('proposed','reviewed','approved','rejected','committed','reflected')),
                version INTEGER NOT NULL, rationale TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
                review_note TEXT, evidence_hash TEXT NOT NULL, parameters_hash TEXT NOT NULL, approver_id TEXT)""")
            self.execute(db, f"""CREATE TABLE IF NOT EXISTS {self.table('audit')} (
                id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, event_at TEXT NOT NULL, action TEXT NOT NULL,
                outcome TEXT NOT NULL, actor_label TEXT NOT NULL, detail TEXT NOT NULL)""")
            self.execute(db, f"""CREATE TABLE IF NOT EXISTS {self.table('commits')} (
                actor_id TEXT NOT NULL, idempotency_key TEXT NOT NULL, action_id TEXT NOT NULL,
                request_hash TEXT NOT NULL, PRIMARY KEY(actor_id,idempotency_key),
                FOREIGN KEY(action_id) REFERENCES {self.table('actions')}(id))""")
            if self.local_path:
                for operation in ("UPDATE", "DELETE"):
                    self.execute(db, f"""CREATE TRIGGER IF NOT EXISTS demo_audit_no_{operation.lower()}
                        BEFORE {operation} ON demo_audit BEGIN SELECT RAISE(ABORT,'append-only audit'); END""")
            else:
                db.execute("""CREATE OR REPLACE FUNCTION app.demo_immutable_audit() RETURNS trigger
                    LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'append-only audit'; END $$""")
                db.execute("""DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='demo_audit_immutable'
                    AND tgrelid='app.demo_audit'::regclass) THEN CREATE TRIGGER demo_audit_immutable
                    BEFORE UPDATE OR DELETE ON app.demo_audit FOR EACH ROW EXECUTE FUNCTION app.demo_immutable_audit();
                    END IF; END $$""")
        self.initialized = True

    def _audit(self, db, actor, action, outcome, detail):
        identifier = str(uuid.uuid4())
        self.execute(db, f"INSERT INTO {self.table('audit')} VALUES (?,?,?,?,?,?,?)",
                     (identifier, actor.id, now(), action, outcome, actor.label, detail))
        return identifier

    def audit(self, actor, action, outcome, detail):
        with self.connection() as db:
            return self._audit(db, actor, action, outcome, detail)

    def _action(self, db, actor, identifier, lock=False):
        suffix = " FOR UPDATE" if lock and not self.local_path else ""
        row = self.execute(db, f"SELECT * FROM {self.table('actions')} WHERE id=? AND actor_id=?" + suffix,
                           (identifier, actor.id)).fetchone()
        if row is None:
            raise HTTPException(404, "Action not found in the authenticated scope")
        return dict(row)

    @staticmethod
    def public(row):
        return {key: row[key] for key in ("id", "option_id", "state", "version", "rationale", "created_at", "updated_at", "review_note")}

    def propose(self, actor: Principal, option, evidence, rationale):
        identifier, instant = str(uuid.uuid4()), now()
        with self.connection() as db:
            self.execute(db, f"""INSERT INTO {self.table('actions')}
                (id,actor_id,option_id,state,version,rationale,created_at,updated_at,evidence_hash,parameters_hash)
                VALUES (?,?,?,'proposed',1,?,?,?,?,?)""",
                (identifier, actor.id, option["option_id"], rationale, instant, instant, evidence, digest(option)))
            self._audit(db, actor, "proposal_created", "proposed", identifier + ": " + option["option_id"])
            return self.public(self._action(db, actor, identifier))

    def review(self, actor, identifier, version, decision, note, evidence):
        with self.connection() as db:
            row = self._action(db, actor, identifier, True)
            if row["version"] != version or row["state"] != "proposed" or row["evidence_hash"] != evidence:
                raise HTTPException(409, "Action version, state or evidence changed; review the current proposal")
            target = "approved" if decision == "approve" else "rejected"
            self.execute(db, f"UPDATE {self.table('actions')} SET state='reviewed',version=version+1,updated_at=? WHERE id=?",
                         (now(), identifier))
            self._audit(db, actor, "human_review", "reviewed", identifier)
            self.execute(db, f"UPDATE {self.table('actions')} SET state=?,version=version+1,review_note=?,approver_id=?,updated_at=? WHERE id=?",
                         (target, note, actor.id, now(), identifier))
            self._audit(db, actor, "human_decision", target, identifier)
            return self.public(self._action(db, actor, identifier))

    def commit(self, actor, identifier, version, key, option, evidence):
        request_hash = digest({"id": identifier, "expected_version": version,
                               "parameters_hash": digest(option), "evidence_hash": evidence})
        with self.connection() as db:
            row = self._action(db, actor, identifier, True)
            prior = self.execute(db, f"SELECT * FROM {self.table('commits')} WHERE actor_id=? AND idempotency_key=?", (actor.id, key)).fetchone()
            if prior:
                if prior["request_hash"] != request_hash or prior["action_id"] != identifier:
                    raise HTTPException(409, "Idempotency key already used for another request")
                return self.public(row)
            if row["version"] != version or row["state"] != "approved" or row["approver_id"] != actor.id:
                raise HTTPException(409, "A current explicit authorized human approval is required")
            approval_age = (datetime.now(timezone.utc) - datetime.fromisoformat(row["updated_at"])).total_seconds()
            if approval_age < 0 or approval_age > 900:
                raise HTTPException(409, "Approval expired; create and review a fresh proposal")
            if row["evidence_hash"] != evidence or row["parameters_hash"] != digest(option):
                raise HTTPException(409, "Approved evidence or scenario parameters changed")
            self.execute(db, f"INSERT INTO {self.table('commits')} VALUES (?,?,?,?)", (actor.id, key, identifier, request_hash))
            self.execute(db, f"UPDATE {self.table('actions')} SET state='committed',version=version+1,updated_at=? WHERE id=?", (now(), identifier))
            self._audit(db, actor, "synthetic_action_committed", "committed", identifier + ": demo queue only; no vendor write")
            return self.public(self._action(db, actor, identifier))

    def read(self, actor):
        with self.connection() as db:
            suffix = " FOR UPDATE" if not self.local_path else ""
            rows = self.execute(db, f"SELECT * FROM {self.table('actions')} WHERE actor_id=? ORDER BY created_at DESC" + suffix, (actor.id,)).fetchall()
            actions = []
            for value in rows:
                row = dict(value)
                if row["state"] == "committed":
                    row.update(state="reflected", version=row["version"] + 1, updated_at=now())
                    self.execute(db, f"UPDATE {self.table('actions')} SET state='reflected',version=?,updated_at=? WHERE id=?", (row["version"], row["updated_at"], row["id"]))
                    self._audit(db, actor, "next_read_reflected", "reflected", row["id"])
                actions.append(self.public(row))
            audit = self.execute(db, f"SELECT id,event_at,action,outcome,actor_label,detail FROM {self.table('audit')} WHERE actor_id=? ORDER BY event_at DESC LIMIT 100", (actor.id,)).fetchall()
            return actions, [dict(row) for row in audit]


_stores: dict[str, Store] = {}
_store_lock = threading.Lock()


def get_store(client) -> Store:
    deployed = bool(os.getenv("DATABRICKS_APP_NAME"))
    if os.getenv("PGHOST") and os.getenv("HR_DEMO_LAKEBASE_ENDPOINT"):
        key, path = "lakebase", None
    elif not deployed and os.getenv("HR_DEMO_LOCAL_DEVELOPMENT") == "true":
        path = os.getenv("HR_DEMO_LOCAL_STATE_PATH")
        if not path:
            raise HTTPException(503, "Explicit local action-store path required")
        key = "local:" + path
    else:
        raise HTTPException(503, "Lakebase action queue is not available")
    with _store_lock:
        if key not in _stores:
            _stores[key] = Store(client, path)
        store = _stores[key]
    try:
        store.initialize()
    except Exception:
        raise HTTPException(503, "Action queue is temporarily unavailable; no action was taken") from None
    return store
