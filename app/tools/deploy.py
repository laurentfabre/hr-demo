"""Deploy only the built HR Demo package to an explicitly selected workspace.

Credentials are resolved by the selected SDK profile, never serialized. The
configuration file contains resource identifiers and presenter allowlist only.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess

from databricks.sdk import WorkspaceClient
from databricks.sdk.service.apps import AppDeployment
from databricks.sdk.service.workspace import ImportFormat


APP_ROOT = Path(__file__).resolve().parents[1]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_version():
    manifest = APP_ROOT.parent / "MANIFEST.json"
    if manifest.is_file():
        release = json.loads(manifest.read_text())
        return release["source_commit"]
    return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=APP_ROOT, text=True).strip()


def prepare(config, build):
    wheels = list(build.glob("*.whl"))
    if len(wheels) != 1 or not (build / "requirements.txt").is_file():
        raise ValueError("Run apx build first; exactly one built wheel is required")
    connection = config["lakebase_connection"]
    required = ("PGHOST", "PGPORT", "PGDATABASE", "PGUSER", "HR_DEMO_LAKEBASE_ENDPOINT")
    environment = {key: str(connection[key]) for key in required}
    environment["HR_DEMO_PRESENTER_IDS"] = str(config["presenter_user_id"])
    environment["HR_DEMO_PRESENTER_BINDINGS"] = json.dumps({
        **config.get("presenter_bindings", {}),
        config["presenter_user_name"].strip().casefold(): str(config["presenter_user_id"])
    })
    enterprise = config.get("enterprise", {})
    if config.get("subject_bindings"):
        environment["HR_DEMO_SUBJECT_BINDINGS"] = json.dumps(config["subject_bindings"])
    if enterprise.get("access"):
        environment["HR_DEMO_ENTERPRISE_ACCESS"] = json.dumps(enterprise["access"])
    if enterprise.get("model_endpoint"):
        environment["HR_DEMO_ENTERPRISE_MODEL"] = enterprise["model_endpoint"]
    agents = config.get("agents", {})
    if config.get("dnb_agents"):
        environment["HR_DEMO_DNB_AGENTS"] = json.dumps(config["dnb_agents"])
    if agents.get("tables"):
        environment["HR_DEMO_GENIE_TABLES"] = json.dumps(agents["tables"])
    for field, variable in (("genie_space_id", "HR_DEMO_GENIE_SPACE_ID"),
                            ("genie_url", "HR_DEMO_GENIE_URL"),
                            ("supervisor_endpoint", "HR_DEMO_SUPERVISOR_ENDPOINT")):
        if agents.get(field):
            environment[variable] = agents[field]
    # JSON scalar quoting is also valid YAML and avoids value interpolation.
    # Reviewed captures are immutable package resources and safe across workers.
    contents = 'command: ["uvicorn", "hr_demo.backend.app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]\nenv:\n'
    for key, value in environment.items():
        if not value:
            raise ValueError("Empty runtime binding: " + key)
        contents += f"  - name: {key}\n    value: {json.dumps(value)}\n"
    (build / "app.yml").write_text(contents)
    return [build / "app.yml", build / "requirements.txt", wheels[0]]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", required=True)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--prepare-only", action="store_true")
    args = parser.parse_args()
    config = json.loads(args.config.read_text())
    if args.profile != config["profile"]:
        raise SystemExit("Selected profile differs from the explicit target configuration")
    if args.out.exists():
        raise SystemExit("Refusing to overwrite prior deployment evidence")
    files = prepare(config, APP_ROOT / ".build")
    record = {
        "started_at": datetime.now(timezone.utc).isoformat(),
        "profile": args.profile, "app_name": config["app_name"],
        "source_commit": source_version(),
        "files": [{"name": path.name, "sha256": sha(path)} for path in files],
        "credentials_stored": False, "full_certification": "pending",
        "mode": "prepare_only" if args.prepare_only else "deploy",
    }
    if not args.prepare_only:
        # No profile fallback: the user-selected profile is always passed.
        for key in list(os.environ):
            if key.startswith("DATABRICKS_"):
                del os.environ[key]
        client = WorkspaceClient(profile=args.profile)
        actual_user = client.current_user.me()
        if str(actual_user.id) != str(config["presenter_user_id"]):
            raise SystemExit("Authenticated deployment identity differs from configured presenter")
        if (actual_user.user_name or "").strip().casefold() != config["presenter_user_name"].strip().casefold():
            raise SystemExit("Authenticated deployment username differs from configured presenter binding")
        source = f"/Workspace/Users/{actual_user.user_name}/{config['app_name']}"
        client.workspace.mkdirs(source)
        for path in files:
            client.workspace.upload(source + "/" + path.name, path.read_bytes(), format=ImportFormat.AUTO, overwrite=True)
        deployed = client.apps.deploy(config["app_name"], AppDeployment(source_code_path=source)).result()
        app = client.apps.get(config["app_name"])
        record.update(deployment_id=deployed.deployment_id,
                      status=deployed.status.as_dict() if deployed.status else None,
                      app_url=app.url,
                      source_code_path="/Workspace/Users/[PRESENTER]/" + config["app_name"])
    record["finished_at"] = datetime.now(timezone.utc).isoformat()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(record, indent=2) + "\n")
    print(json.dumps(record, indent=2))


if __name__ == "__main__":
    main()
