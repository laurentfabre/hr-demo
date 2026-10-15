"""Explicit-target Enterprise demo lifecycle, usable outside the authoring repo."""
import argparse
from datetime import datetime, timezone
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.request
from urllib.parse import urlsplit

from databricks.sdk import WorkspaceClient
from databricks.sdk.service import apps

ROOT=Path(__file__).resolve().parents[1]


def load_target(path, profile):
    config=json.loads(path.read_text())
    if config.get("profile")!=profile: raise ValueError("Selected profile differs from target configuration")
    if not re.fullmatch(r"[a-z][a-z0-9-]{1,25}",config.get("app_name","")): raise ValueError("Invalid target App name")
    if any(marker in json.dumps(config) for marker in ("CHOOSE_","SELECTED","RESOLVE_FROM_")):
        raise ValueError("Resolve target.example.json placeholders before execution")
    return config


def client_for(profile):
    for key in list(os.environ):
        if key.startswith("DATABRICKS_") and key!="DATABRICKS_AUTH_STORAGE": del os.environ[key]
    return WorkspaceClient(profile=profile)


def app_request(client, url, path, body=None):
    parsed=urlsplit(url)
    if parsed.scheme!="https" or not parsed.hostname or not parsed.hostname.endswith(".databricksapps.com"):
        raise ValueError("Unexpected Apps origin")
    headers={k:v for k,v in client.config.authenticate().items() if k.lower()=="authorization"}
    headers["Content-Type"]="application/json"
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self,req,fp,code,msg,hdrs,newurl): return None
    request=urllib.request.Request(url.rstrip("/")+path,headers=headers,data=json.dumps(body).encode() if body is not None else None)
    with urllib.request.build_opener(NoRedirect).open(request,timeout=100) as response: return json.load(response)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode",choices=["preflight","provision","deploy","verify","reset","stop","teardown"])
    parser.add_argument("--profile",required=True);parser.add_argument("--config",type=Path,required=True)
    parser.add_argument("--out",type=Path,required=True);parser.add_argument("--confirm-app")
    args=parser.parse_args()
    if args.out.exists(): raise SystemExit("Preserve prior lifecycle evidence; use a new output file")
    config=load_target(args.config,args.profile)
    record=dict(mode=args.mode,profile=args.profile,app_name=config["app_name"],started_at=datetime.now(timezone.utc).isoformat(),credentials_stored=False)
    args.out.parent.mkdir(parents=True,exist_ok=True)
    def save(): args.out.write_text(json.dumps(record,indent=2,default=str)+"\n")
    try:
        client=client_for(args.profile)
        user=client.current_user.me()
        if str(user.id)!=str(config["presenter_user_id"]) or (user.user_name or "").casefold()!=config["presenter_user_name"].casefold():
            raise ValueError("Authenticated operator differs from the configured presenter")
        if args.mode=="preflight":
            endpoint=client.postgres.get_endpoint(config["lakebase_connection"]["HR_DEMO_LAKEBASE_ENDPOINT"])
            model=client.serving_endpoints.get(config["enterprise"]["model_endpoint"])
            record.update(identity_verified=True,lakebase_endpoint_found=bool(endpoint.name),model_ready=bool(model.state and model.state.ready.value=="READY"),target_host=client.config.host)
            if not record["model_ready"]: raise ValueError("Selected model is not ready")
        elif args.mode=="provision":
            from databricks.sdk.errors import NotFound
            try: application=client.apps.get(config["app_name"])
            except NotFound:
                application=client.apps.create(app=apps.App(name=config["app_name"])).result()
                config["delivery_owned_app"]=True
            resources=list(application.resources or [])
            selected=config.get("lakebase_resource")
            if selected is None:
                previous=next((r for r in resources if r.postgres),None)
                if previous is None: raise ValueError("Select a dedicated Lakebase database in lakebase_resource")
                selected=dict(branch=previous.postgres.branch,database=previous.postgres.database)
            resources=[r for r in resources if r.name not in {"enterprise-explanation","lakebase"}]
            resources += [apps.AppResource.from_dict(dict(name="lakebase",postgres=dict(**selected,permission="CAN_CONNECT_AND_CREATE"))),
                          apps.AppResource.from_dict(dict(name="enterprise-explanation",serving_endpoint=dict(name=config["enterprise"]["model_endpoint"],permission="CAN_QUERY")))]
            client.apps.create_update(config["app_name"],"resources",app=apps.App(name=config["app_name"],resources=resources)).result()
            application=client.apps.get(config["app_name"])
            config["lakebase_connection"]["PGUSER"]=application.service_principal_client_id
            config["lakebase_resource"]=selected
            args.config.write_text(json.dumps(config,indent=2)+"\n");args.config.chmod(0o600)
            record.update(resource_count=len(resources),app_ready=bool(application.service_principal_client_id))
        elif args.mode=="deploy":
            command=[sys.executable,str(ROOT/"app/tools/deploy.py"),"--profile",args.profile,"--config",str(args.config.resolve()),"--out",str(args.out.with_suffix(".deployment.json").resolve())]
            result=subprocess.run(command,capture_output=True,text=True)
            record["deployment_exit_code"]=result.returncode
            if result.returncode: raise RuntimeError("Deploy failed; inspect the retained deployment artifact")
            record["deployment"]=json.loads(args.out.with_suffix(".deployment.json").read_text())
        elif args.mode in {"verify","reset"}:
            application=client.apps.get(config["app_name"])
            catalog=app_request(client,application.url,"/api/enterprise/catalog")
            record.update(app_url=application.url,stories=len(catalog["stories"]),model_configured=catalog["model_configured"],scope=catalog["access"]["entities"])
            if args.mode=="reset":
                record["new_run"]=app_request(client,application.url,"/api/enterprise/runs",dict(label="Portable rehearsal "+datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),scale=1))
            if record["stories"]!=3: raise ValueError("Enterprise catalog is incomplete")
        elif args.mode=="stop":
            client.apps.stop(config["app_name"]).result();record["database_preserved"]=True
        elif args.mode=="teardown":
            if args.confirm_app!=config["app_name"] or config.get("delivery_owned_app") is not True:
                raise ValueError("Teardown requires the exact name and an App created by this delivery workflow")
            client.apps.delete(config["app_name"]);record["shared_resources_preserved"]=True
        record["status"]="PASS"
    except Exception as error:
        record.update(status="FAIL",error_type=type(error).__name__,reason=str(error) if isinstance(error,ValueError) else "Operation failed; inspect target readiness and permissions")
    finally:
        record["finished_at"]=datetime.now(timezone.utc).isoformat();save()
    print(json.dumps(dict(status=record["status"],mode=args.mode,out=str(args.out))))
    raise SystemExit(0 if record["status"]=="PASS" else 1)


if __name__=="__main__": main()
