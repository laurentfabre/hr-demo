"""Generate a disclosed GCP-export simulation in the portable source contract."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/"app/src"))
from hr_demo.data.enterprise import source_rows


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out",type=Path,required=True)
    parser.add_argument("--demand-increase",type=int,default=30)
    args=parser.parse_args()
    if args.out.exists(): raise SystemExit("Preserve previous simulated source exports")
    if not 0<=args.demand_increase<=1000: raise SystemExit("Demand increase must be 0..1000 FTE")
    rows=list(source_rows())
    for row in rows:
        if row["entity"]=="FR" and row["period"]=="2026-09" and row["department"]=="Engineering":
            row["demand_centi"]+=100*args.demand_increase
    payload=dict(synthetic=True,rows=rows)
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(payload,indent=2)+"\n")
    print(json.dumps(dict(file=str(args.out),sha256=hashlib.sha256(args.out.read_bytes()).hexdigest(),rows=len(rows),source="simulated_gcp_export",real_gcp_connection=False)))


if __name__=="__main__": main()
