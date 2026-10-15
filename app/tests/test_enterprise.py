import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from unittest.mock import MagicMock
from types import SimpleNamespace

from fastapi import HTTPException
from pydantic import ValidationError
from hr_demo.backend.auth import Principal
from hr_demo.backend.store import Store
from hr_demo.backend import enterprise as service
from hr_demo.backend.enterprise_models import RunIn, Scope, IngestIn, FileBatchIn, PlanIn, DecisionIn, ExplainIn, ValueIn, value_case


class EnterpriseWorkflow(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.store = Store(local_path=str(Path(temporary.name)/"enterprise.sqlite"))
        self.store.initialize()
        self.hq = Principal("hq", "Group reviewer", "test", ("action:write",))
        self.local = Principal("local-fr", "France reviewer", "test", ("enterprise:read",))
        self.addCleanup(patch.stopall)
        patch.dict(os.environ, {"HR_DEMO_ENTERPRISE_ACCESS": json.dumps({"local-fr": {"role":"reader", "entities":["FR"], "tenant":"aster"}})}, clear=True).start()
        self.run = service.create_run(self.store, self.hq, RunIn(label="Rehearsal"))
        self.scope = Scope(run_id=self.run["id"], entity="FR")

    def ingest(self, batch, revision=1, key="batch-0001"):
        return service.ingest(self.store, self.hq, IngestIn(run_id=self.run["id"], expected_revision=revision, batch_key=key, batch=batch))

    def proposal(self):
        return service.propose(self.store,self.hq,PlanIn(**self.scope.model_dump(),expected_revision=1,rationale="Synthetic delivery plan for review"))

    def decide(self, proposal, decision, confirmed=True):
        return service.decide(self.store,self.hq,DecisionIn(proposal_id=proposal["id"],expected_version=proposal["version"],decision=decision,note="AUTOMATED TEST - no actual human approval",human_confirmed=confirmed))

    def test_source_sql_reconciliation_and_temporal_rollup(self):
        data = service.snapshot(self.store,self.hq,Scope(run_id=self.run["id"]))
        self.assertEqual(len(data["rows"]),24)
        self.assertEqual(data["totals"]["local_workforce"],data["totals"]["employees"]+data["totals"]["contractors"])
        self.assertEqual(data["totals"]["eur_cost_cents"],sum(r["eur_cost_cents"] for r in data["rows"]))
        august = service.snapshot(self.store,self.hq,Scope(run_id=self.run["id"],entity="DE",period="2026-08"))
        september = service.snapshot(self.store,self.hq,Scope(run_id=self.run["id"],entity="DE"))
        self.assertEqual({r["group_name"] for r in august["rows"]},{"Aster Services"})
        self.assertEqual({r["group_name"] for r in september["rows"]},{"Aster Platforms"})
        self.assertEqual({r["fiscal_period"] for r in data["rows"] if r["entity"]=="IN"},{"FY2026-P06"})

    def test_local_identity_is_scoped_and_suppresses_small_cohorts(self):
        data = service.snapshot(self.store,self.local,Scope(run_id=self.run["id"]))
        self.assertEqual({r["entity"] for r in data["rows"]},{"FR"})
        self.assertEqual(data["batches"],[])
        self.assertIsNone(next(r for r in data["rows"] if r["department"]=="People")["survey_responses"])
        with self.assertRaises(HTTPException) as error:
            service.snapshot(self.store,self.local,Scope(run_id=self.run["id"],entity="DE"))
        self.assertEqual(error.exception.status_code,403)
        with self.assertRaises(HTTPException):
            service.create_run(self.store,self.local,RunIn(label="Not allowed"))

    def test_tenant_boundary(self):
        with patch.dict(os.environ,{"HR_DEMO_ENTERPRISE_ACCESS":json.dumps({"hq":{"role":"editor","entities":["FR"],"tenant":"other"}})}):
            with self.assertRaises(HTTPException) as error:
                service.snapshot(self.store,self.hq,self.scope)
            self.assertEqual(error.exception.status_code,404)

    def test_idempotent_batch_and_atomic_failed_ingestion_recovery(self):
        before = service.snapshot(self.store,self.hq,self.scope)
        first = self.ingest("demand_shift")
        self.assertEqual(first,self.ingest("demand_shift"))
        after = service.snapshot(self.store,self.hq,self.scope)
        self.assertEqual(after["totals"]["gap_centi"]-before["totals"]["gap_centi"],3000)
        failed = self.ingest("invalid_source",2,"batch-invalid")
        self.assertEqual(failed["status"],"rejected")
        unchanged = service.snapshot(self.store,self.hq,self.scope)
        self.assertEqual(unchanged["evidence_hash"],after["evidence_hash"])
        self.assertEqual(self.ingest("recover",2,"batch-recover")["revision"],3)
        recovered = service.snapshot(self.store,self.hq,self.scope)
        self.assertEqual(recovered["totals"],before["totals"])

    def test_changed_source_blocks_prior_proposal(self):
        proposal=self.proposal()
        self.ingest("demand_shift")
        with self.assertRaises(HTTPException) as error:
            self.decide(proposal,"approve")
        self.assertEqual(error.exception.status_code,409)

    def test_human_confirmation_and_commit_readback(self):
        proposal=self.proposal()
        with self.assertRaises(HTTPException):
            self.decide(proposal,"approve",False)
        approved=self.decide(proposal,"approve")
        self.assertEqual(approved["state"],"approved")
        committed=self.decide(approved,"commit")
        self.assertEqual(committed["state"],"committed")
        duplicate=self.decide(approved,"commit")
        self.assertTrue(duplicate["duplicate"])
        reread=service.snapshot(Store(local_path=self.store.local_path),self.hq,self.scope)
        self.assertEqual(reread["proposals"][0]["state"],"committed")
        self.assertEqual(reread["proposals"][0]["review_note"],"AUTOMATED TEST - no actual human approval")
        self.assertEqual(reread["proposals"][0]["parameters"]["cost_eur"],736000)

    def test_over_budget_and_expired_approval(self):
        proposal=service.propose(self.store,self.hq,PlanIn(**self.scope.model_dump(),expected_revision=1,budget_eur=100,rationale="Synthetic budget failure test"))
        with self.assertRaises(HTTPException): self.decide(proposal,"approve")
        approved=self.decide(self.proposal(),"approve")
        with self.store.connection() as db:
            db.execute("UPDATE demo_enterprise_proposals SET updated_at='2020-01-01T00:00:00+00:00' WHERE id=?",(approved["id"],))
        with self.assertRaises(HTTPException): self.decide(approved,"commit")

    def test_rehearsal_reset_is_a_new_run_preserving_history(self):
        service.create_run(self.store,self.hq,RunIn(label="Fresh rehearsal"))
        self.assertEqual(len(service.catalogue(self.store,self.hq)["runs"]),2)
        self.assertEqual(service.snapshot(self.store,self.hq,self.scope)["run"]["revision"],1)

    def test_uploaded_source_is_reconciled_idempotent_and_recoverable(self):
        before=service.snapshot(self.store,self.hq,self.scope)
        row=next(r for r in service.source_rows() if r["entity"]=="FR" and r["period"]=="2026-09")
        row["demand_centi"]+=700
        batch=FileBatchIn(run_id=self.run["id"],expected_revision=1,batch_key="uploaded-0001",synthetic=True,rows=[row])
        accepted=service.ingest(self.store,self.hq,batch)
        self.assertEqual(accepted,service.ingest(self.store,self.hq,batch))
        self.assertEqual(service.snapshot(self.store,self.hq,self.scope)["totals"]["gap_centi"],before["totals"]["gap_centi"]+700)
        invalid=dict(row,overdue=row["cases"]+1)
        rejected=service.ingest(self.store,self.hq,FileBatchIn(run_id=self.run["id"],expected_revision=2,batch_key="uploaded-0002",synthetic=True,rows=[invalid]))
        self.assertEqual(rejected["status"],"rejected")
        self.assertEqual(service.snapshot(self.store,self.hq,self.scope)["run"]["revision"],2)
        with self.assertRaises(HTTPException): service.ingest(self.store,self.local,batch)
        self.ingest("recover",2,"uploaded-recovery")
        self.assertEqual(service.snapshot(self.store,self.hq,self.scope)["totals"],before["totals"])

    def test_source_duplicates_and_out_of_scale_are_rejected(self):
        row=next(service.source_rows())
        for i,rows in enumerate(([row,row],[dict(row,centre=2,key=row["key"][:-1]+"2")])):
            result=service.ingest(self.store,self.hq,FileBatchIn(run_id=self.run["id"],expected_revision=1,batch_key=f"invalid-file-{i}",synthetic=True,rows=rows))
            self.assertEqual(result["status"],"rejected")

    def test_proxy_subject_bindings_keep_enterprise_reader_separate(self):
        from starlette.requests import Request
        from hr_demo.backend.auth import principal, require_permission
        with patch.dict(os.environ,{"DATABRICKS_APP_NAME":"test","HR_DEMO_SUBJECT_BINDINGS":json.dumps({"trusted-fr-subject":"local-fr"})}):
            request=Request({"type":"http","headers":[(b"x-forwarded-user",b"trusted-fr-subject")]})
            actor=principal(request)
            self.assertEqual(actor.id,"local-fr")
            self.assertEqual(actor.permissions,("enterprise:read",))
            with self.assertRaises(HTTPException): require_permission(actor,"candidate:read")

    def test_live_explanation_normalizes_text_and_excludes_reasoning(self):
        expected="Synthetic France capacity requires local HR review."
        for content in (expected,[{"type":"reasoning","text":"MUST NOT LEAVE PROVIDER"},{"type":"text","text":expected}]):
            client=MagicMock()
            provider=client.serving_endpoints.get_open_ai_client.return_value.__enter__.return_value
            provider.chat.completions.create.return_value=SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))],usage=None)
            with patch.dict(os.environ,{"HR_DEMO_ENTERPRISE_MODEL":"test-model"}):
                result=service.explain(self.store,self.hq,client,ExplainIn(**self.scope.model_dump(),question="What needs review?"))
            self.assertEqual(result["answer"],expected)
            self.assertNotIn("MUST NOT",json.dumps(result))

    def test_empty_unsupported_and_unbounded_model_content_is_rejected(self):
        for content in (None,"  ",[{"type":"reasoning","text":"hidden"}],{"text":"unsupported"},"x"*10001):
            with self.assertRaises(ValueError): service.explanation_text(content)
        self.assertEqual(service.explanation_text([{"type":"output_text","text":"one"},{"type":"text","text":"two"}]),"one\n\ntwo")

    def test_representative_scale_does_not_change_per_person_units(self):
        large=service.create_run(self.store,self.hq,RunIn(label="Scale",scale=20))
        first=service.snapshot(self.store,self.hq,self.scope)
        larger=service.snapshot(self.store,self.hq,Scope(run_id=large["id"],entity="FR"))
        self.assertEqual(larger["totals"]["employees"],20*first["totals"]["employees"])
        self.assertIsNone(next(r for r in larger["rows"] if r["department"]=="People")["survey_responses"])


class ValueModel(unittest.TestCase):
    def body(self):
        return dict(hourly_cost_eur=50,horizon_months=12,realization_low_pct=50,realization_high_pct=100,
                    alternatives=[dict(id=identifier,implementation_eur=10000,monthly_platform_eur=1000,monthly_operations_hours=10,
                                       monthly_cash_benefit_eur=4000,monthly_hours_released=100,time_to_value_months=2)
                                  for identifier in ("hr_suite","bi","internal","databricks")])

    def test_cash_and_productivity_are_separate_and_delay_is_counted(self):
        result=value_case(ValueIn(**self.body()))["results"][0]
        self.assertEqual(result["tco_eur"],28000)
        self.assertEqual(result["productive_months"],10)
        self.assertEqual(result["scenarios"][0]["cash_benefit_eur"],20000)
        self.assertEqual(result["scenarios"][0]["net_cash_eur"],-8000)
        self.assertEqual(result["scenarios"][0]["hours_released"],500)
        self.assertEqual(result["scenarios"][0]["payback_months"],28)

    def test_zero_cost_and_no_cash_payback(self):
        body=self.body()
        for alternative in body["alternatives"]:
            alternative.update(implementation_eur=0,monthly_platform_eur=0,monthly_operations_hours=0,monthly_cash_benefit_eur=0)
        result=value_case(ValueIn(**body))["results"][0]["scenarios"][0]
        self.assertIsNone(result["roi_pct"])
        self.assertIsNone(result["payback_months"])

    def test_invalid_ranges_duplicates_and_boolean_numbers_rejected(self):
        for mutate in (lambda b:b.update(realization_low_pct=101),lambda b:b.update(realization_low_pct=90,realization_high_pct=30),
                       lambda b:b["alternatives"][0].update(id="bi"),lambda b:b.update(hourly_cost_eur=True)):
            body=self.body();mutate(body)
            with self.assertRaises(ValidationError): ValueIn(**body)
