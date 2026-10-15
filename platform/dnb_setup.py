"""Provision new DNB specialists alongside (never replacing) the historical demo.

Explicit target is the user-approved FEVM registry. SQL generates only synthetic
cohort aggregates in parallel on the existing SQL warehouse; no person data.
Each mode writes a fresh evidence directory and saves created resource IDs early.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import uuid

from databricks.sdk import WorkspaceClient
from databricks.sdk.service import apps, iam, supervisoragents

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "demo/app/src"))
from hr_demo.data.dnb import DOMAINS, METRICS, USE_CASES, reference_sql

TARGET = ROOT / "resources.deadline-fevm.local.json"
SUPERVISOR_INSTRUCTIONS = """You supervise four specialist Genie Agents for a fictional Digital Native Business HR demonstration. Always call the relevant Genie tool(s) for data questions. Route capacity/headcount/budget/cost to workforce; recruiting/offers/time-to-fill/mobility to talent; historical attrition/survey/manager span/learning to retention; onboarding/SLA/payroll exceptions/policy self-service/reconciliation to operations. For cross-domain questions call every relevant specialist and synthesize only their returned results, not guessed numbers. Preserve the user's exact scenario, region and month filters in each tool request. Monthly snapshots must never be summed across months; group by month for trends. Scenarios are alternate fictional assumptions, not a trained forecast or measured intervention effects. Answer in the requested language with concise Markdown, quantitative observations, source metric-view names, scope, limitations, and one next question for human review. These are synthetic aggregate data, not Logfood customer records. No individual risk, health inference, candidate ranking, personal salaries, employment decisions or external actions. Refuse unsupported data requests. Never claim correlation is causation. If a tool fails, say which domain is unavailable; do not fill missing evidence. Do not output internal reasoning."""


def now(): return datetime.now(timezone.utc).isoformat()
def sha(value): return hashlib.sha256(value).hexdigest()
def uid(value): return uuid.uuid5(uuid.NAMESPACE_URL, "dnb-hr-20260929:"+value).hex
def scrub(value):
    if isinstance(value,dict):
        return {k:"[REDACTED]" if re.search(r"token|secret|password|authorization|creator|created_by|user_name|email",k,re.I) else scrub(v) for k,v in value.items()}
    if isinstance(value,list): return [scrub(v) for v in value]
    if isinstance(value,str): return re.sub(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}","[EMAIL_REDACTED]",value)
    return value


def source_sql(domain, namespace):
    common = """WITH grid AS (
 SELECT s.scenario,r.region,r.weight,d.department,d.base_count,d.monthly_cost,m.id+1 AS month_number,
   add_months(DATE'2026-01-01',CAST(m.id AS INT)) AS month,
   CASE WHEN s.scenario='hiring_surge' THEN 1.20 WHEN s.scenario='balanced' THEN 1.05 ELSE 1.0 END AS factor,
   CASE WHEN d.department='Engineering' AND r.region='EMEA' AND m.id>=3 THEN 1 ELSE 0 END AS hotspot
 FROM VALUES ('baseline'),('hiring_surge'),('balanced') AS s(scenario)
 CROSS JOIN VALUES ('AMER',1.3),('EMEA',1.0),('APJ',0.7) AS r(region,weight)
 CROSS JOIN VALUES ('Engineering',240,9500),('Product',100,8500),('Customer Success',160,6000),('Corporate',80,7000) AS d(department,base_count,monthly_cost)
 CROSS JOIN range(6) m
), cohorts AS (
 SELECT *,CAST(ROUND(base_count*weight*factor+month_number*2) AS BIGINT) AS hc,
 CAST(ROUND((5+month_number)*weight*factor+hotspot*5) AS BIGINT) AS hires
 FROM grid
) SELECT scenario,region,department,month,"""
    fields = {
        "workforce": """hc AS headcount,hc+8+hotspot*12 AS planned_headcount,
 CAST(hc*0.94 AS DECIMAL(14,2)) AS available_fte,
 CAST(hc*0.94+6+hotspot*24-CASE WHEN scenario='balanced' THEN 5 ELSE 0 END AS DECIMAL(14,2)) AS demand_fte,
 CAST(hc*monthly_cost*(1+hotspot*0.08) AS DECIMAL(18,2)) AS personnel_cost_eur,
 CAST(hc*monthly_cost*1.03 AS DECIMAL(18,2)) AS personnel_budget_eur""",
        "talent": """hires*24 AS applications,hires*5 AS interviews,
 hires+3+hotspot*4 AS offers,hires+1 AS accepted_offers,hires,
 hires*(32+month_number+hotspot*28-CASE WHEN scenario='balanced' THEN 7 ELSE 0 END) AS fill_days_total,
 CAST(hires*(3500+hotspot*2200) AS DECIMAL(18,2)) AS recruitment_cost_eur,
 GREATEST(1,CAST(hires*(CASE WHEN scenario='balanced' THEN 0.4 ELSE 0.18 END) AS BIGINT)) AS internal_fills""",
        "retention": """CAST(hc-1 AS DECIMAL(14,2)) AS average_headcount,
 GREATEST(1,CAST(hc*(0.009+hotspot*0.019-CASE WHEN scenario='balanced' THEN 0.003 ELSE 0 END) AS BIGINT)) AS voluntary_exits,
 hc AS survey_invited,CAST(hc*(0.78-hotspot*0.22) AS BIGINT) AS survey_responses,
 CAST(hc*(0.78-hotspot*0.22)*(0.79-hotspot*0.17) AS BIGINT) AS survey_favorable,
 GREATEST(3,CAST(hc/(8+hotspot*5) AS BIGINT)) AS managers,
 CAST(hc*1.5 AS BIGINT) AS learning_assigned,
 CAST(hc*1.5*(0.86-hotspot*0.25) AS BIGINT) AS learning_completed""",
        "operations": """hires AS onboarding_due,GREATEST(0,hires-1-hotspot*4) AS onboarding_completed,
 12+month_number+hotspot*25 AS open_cases,2+hotspot*11 AS overdue_cases,
 hc AS payroll_checked,1+hotspot*7 AS payroll_exceptions,
 50+month_number*4+hotspot*40 AS policy_requests,
 38+month_number*3+hotspot*8 AS policy_resolved,
 hc*5 AS records_checked,2+hotspot*19 AS unreconciled_records""",
    }[domain]
    return f"CREATE TABLE {namespace}.dnb_{domain}_cohorts USING DELTA COMMENT 'Synthetic alternate-world DNB cohort aggregates. One row per scenario, region, department, month. 216 rows. No employees or customer data. Jan-Jun2026; EMEA Engineering support/capacity hotspot from April; no causal claims.' TBLPROPERTIES ('hr_demo.synthetic'='true','hr_demo.purpose'='dnb-top20') AS " + common + fields + " FROM cohorts"


def metric_definition(domain, namespace):
    # JSON is a strict YAML subset and preserves all semantic metadata verbatim.
    definitions = {"scenario":"One alternate fictional world: baseline, hiring_surge or balanced. Never sum or average scenarios together.",
                   "region":"Mutually exclusive synthetic regions AMER, EMEA and APJ. Unrelated to Logfood research counts.",
                   "department":"Mutually exclusive synthetic department cohort; no individual data.",
                   "month":"Calendar month start, Jan-Jun2026. For snapshots filter one month or group by month; default June2026."}
    body = dict(version="1.1",source=f"{namespace}.dnb_{domain}_cohorts",
                comment="Synthetic DNB "+DOMAINS[domain][1]+". "+DOMAINS[domain][2]+" Monthly cohort grain; alternate scenarios must be filtered, not combined.",
                dimensions=[dict(name=k,expr=k,comment=v,display_name=k.capitalize(),synonyms={"scenario":["scénario"],"region":["région"],"department":["département","team"],"month":["mois"]}[k]) for k,v in definitions.items()],
                measures=[dict(name=n,expr=e,comment=c,display_name=n) for n,e,c in METRICS[domain]])
    return body


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode",choices=["supervisor","data","agents","connect","readiness","reference"])
    parser.add_argument("--out",type=Path,required=True)
    args=parser.parse_args(); args.out.mkdir(parents=True,exist_ok=False)
    config=json.loads(TARGET.read_text()); assert config["profile"]=="fevm-gdpr2"
    namespace=config["catalog"]+"."+config["schema"]
    assert re.fullmatch(r"[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+",namespace)
    bindings=config.setdefault("dnb_agents",dict(specialists={}))
    record=dict(mode=args.mode,profile=config["profile"],started_at=now(),source_commit=subprocess.check_output(["git","rev-parse","HEAD"],text=True).strip(),
                script_sha256=sha(Path(__file__).read_bytes()),contract_sha256=sha((ROOT/"demo/app/src/hr_demo/data/dnb.py").read_bytes()),operations=[],credentials_stored=False,gate_promotion=False)
    def save(): (args.out/"execution.json").write_text(json.dumps(scrub(record),indent=2,default=str)+"\n")
    def bind():
        current=json.loads(TARGET.read_text());current["dnb_agents"]=bindings
        TARGET.write_text(json.dumps(current,indent=2)+"\n"); TARGET.chmod(0o600)
    def op(name,request,fn):
        try:
            result=fn(); result=result.as_dict() if hasattr(result,"as_dict") else result
            record["operations"].append(dict(name=name,request=request,result=result,at=now(),succeeded=True)); save(); return result
        except Exception as error:
            record["operations"].append(dict(name=name,at=now(),succeeded=False,error_type=type(error).__name__))
            save();raise
    for key in list(os.environ):
        if key.startswith("DATABRICKS_"): del os.environ[key]
    w=WorkspaceClient(profile=config["profile"])
    def query(sql):
        def execute():
            response=w.statement_execution.execute_statement(statement=sql,warehouse_id=config["warehouse_id"],wait_timeout="50s",row_limit=500)
            deadline=time.monotonic()+180
            while response.status.state.value in {"PENDING","RUNNING"} and time.monotonic()<deadline:
                time.sleep(2);response=w.statement_execution.get_statement(response.statement_id)
            if response.status.state.value!="SUCCEEDED":
                record["statement_failure"]=response.as_dict();save();raise RuntimeError("Statement failed; inspect scrubbed execution.json")
            return response
        return op("sql",dict(statement=sql),execute)
    try:
        if args.mode=="supervisor":
            if bindings.get("supervisor_id"): raise ValueError("Dedicated Supervisor already registered")
            spec=supervisoragents.SupervisorAgent(display_name="DNB HR · Top 20 Supervisor",description="Read-only worldwide DNB HR orchestration across four dedicated Genie specialists; twenty research-informed questions over synthetic data.",instructions=SUPERVISOR_INSTRUCTIONS)
            result=op("create_supervisor",spec.as_dict(),lambda:w.supervisor_agents.create_supervisor_agent(spec))
            bindings.update(supervisor_id=result.get("supervisor_agent_id") or result.get("id"),supervisor_resource_name=result["name"],supervisor_endpoint=result["endpoint_name"]);bind()
        elif args.mode=="data":
            query(f"CREATE SCHEMA IF NOT EXISTS {namespace}")
            inventory=query(f"SELECT table_name,table_type FROM {config['catalog']}.information_schema.tables WHERE table_schema='{config['schema']}' AND (table_type='METRIC_VIEW' OR table_name LIKE 'dnb_%') ORDER BY table_name")
            existing={r[0] for r in inventory.get("result",{}).get("data_array",[])}
            # Never replace unknown or partially-created objects silently.
            if any(n.startswith("dnb_") for n in existing): raise ValueError("DNB objects already exist; inspect before rerun")
            suggestions={"namespace":namespace,"materialization":False,"assumptions":"Three alternate fictional worlds; monthly aggregate cohorts only; no causal or forecast claims.","metric_views":[]}
            for domain in DOMAINS:
                sql=source_sql(domain,namespace);(args.out/f"{domain}-data.sql").write_text(sql+"\n");query(sql)
                body=metric_definition(domain,namespace);suggestions["metric_views"].append(body)
                ddl=f"CREATE VIEW {namespace}.dnb_{domain}_metrics WITH METRICS LANGUAGE YAML AS $$\n"+json.dumps(body,indent=2)+"\n$$"
                (args.out/f"{domain}-metrics.sql").write_text(ddl+"\n");query(ddl)
                query(f"SELECT m.scenario,m.month,MEASURE(m.`{METRICS[domain][0][0]}`) AS value FROM {namespace}.dnb_{domain}_metrics m GROUP BY ALL ORDER BY 1,2 LIMIT 50")
            (args.out/"suggestions.yaml").write_text(json.dumps(suggestions,indent=2)+"\n")
        elif args.mode in {"agents","reference"}:
            for case in USE_CASES:
                result=query(reference_sql(case,namespace));record.setdefault("reference",{})[case["id"]]=result;save()
            if args.mode=="agents":
                for domain,(_,title,description) in DOMAINS.items():
                    if domain in bindings["specialists"]: continue
                    table=f"{namespace}.dnb_{domain}_metrics"; definition=metric_definition(domain,namespace)
                    configs=[dict(column_name=d["name"],description=[d["comment"]],synonyms=d.get("synonyms",[]),enable_entity_matching=d["name"] in {"region","department","scenario"},enable_format_assistance=True) for d in definition["dimensions"]]
                    configs += [dict(column_name=m["name"],description=[m["comment"]]) for m in definition["measures"]]
                    cases=[c for c in USE_CASES if c["domain"]==domain]
                    # Examples teach query shapes on an alternate scope, not benchmark answers.
                    examples=[]
                    for c in cases[:2]:
                        examples.append(dict(id=uid("example"+c["id"]),question=[c["question"]["en"]+" Use balanced scenario, APJ, May2026."],sql=[reference_sql(c,namespace,"balanced","APJ","2026-05-01")]))
                    text="## CONSTRAINTS\n- Synthetic aggregates only. No individual risk, candidate ranking, health inference, personal pay or employment actions.\n\n## DISAMBIGUATION\n- If no scope is supplied, use baseline, all regions, June2026. Scenarios are alternate fictional worlds, never achieved intervention effects.\n\n## Instructions you must follow when providing summaries\n- State scenario, region and month, cite the metric view, disclose synthetic data. Answer in requested French or English.\n- Report observations only, not causes or predictions. If unsupported, explain the missing evidence."
                    payload=dict(version=2,config={"sample_questions":sorted([dict(id=uid("sample"+c["id"]),question=[c["question"]["en"]]) for c in cases],key=lambda x:x["id"])},
                        data_sources={"metric_views":[dict(identifier=table,column_configs=sorted(configs,key=lambda x:x["column_name"]))]},
                        instructions=dict(example_question_sqls=sorted(examples,key=lambda x:x["id"]),text_instructions=[dict(id=uid("global"+domain),content=[text])]),
                        benchmarks={"questions":sorted([dict(id=uid("benchmark"+c["id"]),question=[c["question"]["en"]+" Use baseline, all regions, June2026."],answer=[dict(format="SQL",content=[reference_sql(c,namespace)])]) for c in cases],key=lambda x:x["id"])})
                    (args.out/f"{domain}-space.json").write_text(json.dumps(payload,indent=2)+"\n")
                    result=op("create_genie",dict(domain=domain,title=title,payload=payload),lambda:w.genie.create_space(config["warehouse_id"],json.dumps(payload),title="DNB HR · "+title,description=description+" Governed monthly metrics across AMER/EMEA/APJ, Jan-Jun2026, three synthetic scenarios. No real customer/employee data."))
                    bindings["specialists"][domain]=dict(space_id=result["space_id"],tables=[table],url=w.config.host.rstrip('/')+"/genie/rooms/"+result["space_id"]);bind()
        elif args.mode=="connect":
            parent=bindings["supervisor_resource_name"];sp=config["get_app"]["service_principal_client_id"]
            existing={t.tool_id:t for t in w.supervisor_agents.list_tools(parent)}
            resources=list(w.apps.get(config["app_name"]).resources or [])
            names={r.name for r in resources}
            for domain,details in bindings["specialists"].items():
                name="dnb_"+domain
                tool=supervisoragents.Tool(tool_type="genie_space",description=DOMAINS[domain][2]+" Preserve requested scenario/region/month filters. Return actual query results and metric-view citation.",genie_space=supervisoragents.GenieSpace(id=details["space_id"]))
                if name not in existing: op("attach_genie",dict(name=name,space_id=details["space_id"]),lambda:w.supervisor_agents.create_tool(parent,tool,name))
                elif existing[name].genie_space.id!=details["space_id"]: raise ValueError("Tool conflict")
                op("grant_genie",dict(domain=domain,permission="CAN_RUN"),lambda:w.permissions.update("genie",details["space_id"],access_control_list=[iam.AccessControlRequest(service_principal_name=sp,permission_level=iam.PermissionLevel.CAN_RUN)]))
                for table in details["tables"]: query(f"GRANT SELECT ON VIEW {table} TO `{sp}`")
                resource_name="dnb-"+domain
                if resource_name not in names: resources.append(apps.AppResource(name=resource_name,genie_space=apps.AppResourceGenieSpace(name="DNB HR "+domain,space_id=details["space_id"],permission=apps.AppResourceGenieSpaceGenieSpacePermission.CAN_RUN)))
            query(f"GRANT USE CATALOG ON CATALOG {config['catalog']} TO `{sp}`");query(f"GRANT USE SCHEMA ON SCHEMA {namespace} TO `{sp}`")
            if "dnb-supervisor" not in names: resources.append(apps.AppResource(name="dnb-supervisor",serving_endpoint=apps.AppResourceServingEndpoint(name=bindings["supervisor_endpoint"],permission=apps.AppResourceServingEndpointServingEndpointPermission.CAN_QUERY)))
            op("app_resources",dict(resources=[r.as_dict() for r in resources]),lambda:w.apps.create_update(config["app_name"],"resources",app=apps.App(name=config["app_name"],resources=resources)).result())
        elif args.mode=="readiness":
            op("supervisor",dict(name=bindings["supervisor_resource_name"]),lambda:w.supervisor_agents.get_supervisor_agent(bindings["supervisor_resource_name"]))
            op("endpoint",dict(name=bindings["supervisor_endpoint"]),lambda:w.serving_endpoints.get(bindings["supervisor_endpoint"]))
            op("tools",{},lambda:[t.as_dict() for t in w.supervisor_agents.list_tools(bindings["supervisor_resource_name"])])
        record["succeeded"]=True
    except Exception as error:
        record.update(succeeded=False,error_type=type(error).__name__,error=scrub(str(error)))
    record["finished_at"]=now();save()
    print(json.dumps({"out":str(args.out),"succeeded":record["succeeded"],"error":record.get("error")}))
    return 0 if record["succeeded"] else 1


if __name__=="__main__": raise SystemExit(main())
