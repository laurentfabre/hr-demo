"""External read-only HR tool client. Tokens are never printed or persisted."""
import argparse
import json
import os
from pathlib import Path
import time
from urllib.parse import urlsplit
import urllib.request

from databricks.sdk import WorkspaceClient


def invoke(base_url, profile, scope):
    parsed = urlsplit(base_url)
    if parsed.scheme != "https" or not parsed.hostname or not parsed.hostname.endswith(".databricksapps.com") or parsed.path not in ("", "/"):
        raise ValueError("Use the explicitly selected HTTPS Databricks Apps origin")
    for name in list(os.environ):
        if name.startswith("DATABRICKS_") and name != "DATABRICKS_AUTH_STORAGE":
            del os.environ[name]
    client = WorkspaceClient(profile=profile)
    headers = {k:v for k,v in client.config.authenticate().items() if k.lower()=="authorization"}
    headers["Content-Type"] = "application/json"
    request = urllib.request.Request(base_url.rstrip("/")+"/api/enterprise/tools/query",data=json.dumps(scope).encode(),headers=headers,method="POST")
    # Never forward a bearer credential to a redirect destination.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, hdrs, newurl):
            return None
    started = time.perf_counter()
    with urllib.request.build_opener(NoRedirect).open(request,timeout=90) as response:
        result=json.load(response)
    return dict(transport="external_authenticated_http_client",elapsed_ms=round((time.perf_counter()-started)*1000),result=result)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url",required=True);parser.add_argument("--profile",required=True)
    parser.add_argument("--run-id",required=True);parser.add_argument("--entity",default="ALL")
    parser.add_argument("--period",default="2026-09");parser.add_argument("--out",type=Path,required=True)
    args=parser.parse_args()
    if args.out.exists(): raise SystemExit("Output already exists")
    result=invoke(args.url,args.profile,dict(run_id=args.run_id,entity=args.entity,period=args.period,story="self_service"))
    args.out.parent.mkdir(parents=True,exist_ok=True);args.out.write_text(json.dumps(result,indent=2)+"\n")
    print(json.dumps(dict(status="PASS",revision=result["result"]["run"]["revision"],entities=result["result"]["entities"],elapsed_ms=result["elapsed_ms"])))


if __name__=="__main__": main()
