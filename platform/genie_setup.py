"""Provision aggregate-only Genie and native Supervisor for the selected HR FEVM."""
import argparse
from datetime import datetime, timezone
from decimal import Decimal
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time
import uuid

from databricks.sdk import WorkspaceClient
from databricks.sdk.service import apps, iam, supervisoragents

ROOT = Path(__file__).resolve().parents[2]
TARGET = ROOT / "resources.deadline-fevm.local.json"
OUT = ROOT / "validation/agents/provision-01"
SNAPSHOT = ROOT / "demo/app/src/hr_demo/data/snapshot.json"
NAMESPACE = "gdpr2_catalog.hr_demo"
SUPERVISOR_TITLE = "HR Demo 20260914 Supervisor"
GENIE_TITLE = "HR Demo 20260914 Aggregate People Intelligence"
INSTRUCTIONS = """You are the read-only HR Demo Supervisor for four disclosed fictional personas: CPO, HRBP, Talent Acquisition and People Analytics. Always call the aggregate_people_intelligence Genie tool before answering data questions or generating a persona briefing. Base every numeric claim on its SQL result; retain source/table citations. Answer in the requested French or English. Default to the fictional Care Coordination Platform hero cohort and compare with the synthetic company when useful; company includes hero, never add the two scopes. Briefings should explain the persona's aggregate priorities and propose questions or a scenario for HUMAN REVIEW, without executing anything. All data is synthetic and frozen as of 2026-09-14. The capacity ratio and intervention outcomes are scenario assumptions, not trained predictions or causal effects. Do not provide individual risk, protected/health/salary details, candidate ranking, autonomous approvals or vendor-system actions. Persona is presentation context and grants no permissions. Refuse requests outside aggregate scope. If a source is missing or unavailable, state the limitation without inventing data. This Supervisor has only a read-only Genie tool."""
INSTRUCTIONS += """ Mandatory briefing format: exactly THREE short plain-text bullets, maximum 130 words total, no title or Markdown emphasis, then one source line. Respect the user's persona focus. Use the exact current rows requested, without inventing SQL literals or conclusions. Never mention Q4 or any quarter, commitment, schedule or deadline: none is in the sources; capacity scenarios span six months. The blended option is RETAIN 5 + HIRE 4 + REDEPLOY 2, never promotion; no promote-only plan exists. Do-nothing costs zero, so blended is cheaper only than recruit-only. people_roles means PEOPLE MANAGER / MANAGER D'ÉQUIPE, not an HR department vacancy. Historical 72/48-day medians cover all filled roles, not engineering specifically. headcount counts people; active_fte counts FTE; company1512 and hero84 are separate overlapping scopes. Attrition percent uses exits / (person-days/365) *100; it is not future turnover risk. Company compression is NULL/unavailable; hero has18 aggregate exposures, not18 case records or targets for intervention. Six overdue cases are onboarding/mobility/payroll, not employee relations. The1.8 ratio is assumed capacity-gap intensity, not an intervention ratio or shared-service workload. No pipeline-quality assessment, causal analysis, individual needs or cumulative hiring-capacity delay has been established. State only observations, the explicit assumptions and one neutral question for human review; no invented rationale or business context."""

def now(): return datetime.now(timezone.utc).isoformat()
def sha(data): return hashlib.sha256(data).hexdigest()
def stable_id(name): return uuid.uuid5(uuid.NAMESPACE_URL, "hr-demo-20260914:" + name).hex
def scrub(value):
    if isinstance(value, dict):
        return {key: "[REDACTED]" if re.search(r"(?i)token|secret|password|authorization|creator|created_by|updated_by|user_name|email", key) else scrub(item) for key, item in value.items()}
    if isinstance(value, list): return [scrub(item) for item in value]
    if isinstance(value, str): return re.sub(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", "[EMAIL_REDACTED]", value)
    return value
def literal(value):
    if value is None: return "NULL"
    if isinstance(value, bool): return "TRUE" if value else "FALSE"
    if isinstance(value, (int, Decimal)): return str(value)
    # Spark SQL concatenates adjacent quoted literals; SQL-standard doubled
    # apostrophes lose characters here. Escape backslashes and apostrophes.
    return "'" + str(value).replace("\\", "\\\\").replace("'", "\\'") + "'"

def definitions(snapshot):
    common = {"scenario_id": snapshot["scenario_id"], "as_of": snapshot["as_of"][:10], "synthetic": True}
    scope_rows = []
    for kind, row in snapshot["reference"]["scopes"].items():
        scope_rows.append(dict(common, scope_kind=kind,
            scope_label="Care Coordination Platform" if kind == "hero" else "Synthetic company including hero cohort",
            country_codes=", ".join(row["membership"]["country_codes"]),
            headcount=row["headcount"], active_fte=Decimal(row["active_fte_milli"])/1000,
            voluntary_exits=row["voluntary_exits"], person_days=row["person_days"],
            historical_attrition_pct=Decimal(row["display"]["attrition_percent"]),
            median_time_to_fill_days=Decimal(row["fill_median_numerator"])/Decimal(row["fill_median_denominator"]),
            assumed_capacity_ratio=Decimal(row["capacity_ratio_numerator"])/Decimal(row["capacity_ratio_denominator"]),
            critical_open_roles=row["critical_open_roles"], engineering_roles=row["engineering_roles"], product_roles=row["product_roles"], people_roles=row["people_roles"],
            overdue_cases=row["overdue_cases"], onboarding_cases=row["onboarding_cases"], mobility_cases=row["mobility_cases"], payroll_cases=row["payroll_cases"],
            eligible_profile_count=row["eligible_candidates"], pay_compression_exposure=row["pay_compression_exposure"],
            pay_unavailable_reason=row["pay_unavailable_reason"], source_reference="validation/reference_query.sql"))
    options=[]
    for row in snapshot["reference"]["options"]:
        options.append(dict(common, option_id=row["option_id"], retain=row["retain"], hire=row["hire"], redeploy=row["redeploy"],
            gross_gap_fte_months=Decimal(row["gross_gap_milli"])/1000,
            residual_gap_fte_months=Decimal(row["residual_gap_milli"])/1000,
            cost_eur=Decimal(row["cost_eur_cents"])/100,
            budget_eur=Decimal(row["budget_eur_cents"])/100,
            retain_cost_eur=Decimal(row["retain_cost_cents"])/100,
            hire_cost_eur=Decimal(row["hire_cost_cents"])/100,
            redeploy_cost_eur=Decimal(row["redeploy_cost_cents"])/100,
            within_budget=row["within_budget"], requires_human_review=True,
            model_status="scenario_assumption_not_trained_prediction", source_reference="validation/reference_query.sql"))
    metric_rows=[dict(common, metric_id=row["id"], label_fr=row["label_fr"], label_en=row["label_en"], definition_fr=row["definition_fr"], definition_en=row["definition_en"], unit=row["unit"], source_reference=row["source"]) for row in snapshot["definitions"]]
    source_rows=[dict(common, source_id=row["id"], illustrative_system=row["label"], generated_event_count=row["event_count"], connection_status="illustrative_only_not_a_live_connection", source_reference="fixtures/hero_scenario.yaml") for row in snapshot["sources"]]
    rows={"genie_scope_metrics":scope_rows,"genie_scenario_options":options,"genie_metric_definitions":metric_rows,"genie_source_inventory":source_rows}
    descriptions={
        "genie_scope_metrics":"Frozen aggregate synthetic People metrics. Exactly one row per scope (hero or company), snapshot 2026-09-14. Company includes hero; scopes overlap and must never be summed. No person-level data.",
        "genie_scenario_options":"Three hypothetical six-month capacity scenarios for the hero cohort. Costs EUR, capacity FTE-months. Synthetic assumptions and proposals for human review; no achieved intervention outcomes.",
        "genie_metric_definitions":"Authoritative bilingual definitions copied from the approved synthetic SQL reference; use to explain units, formulas and limitations.",
        "genie_source_inventory":"Five illustrative source-system labels and generated synthetic event counts. Customer systems are unconfirmed and these are not live connector counts.",
    }
    notes={
        "scope_kind":"hero or company. Company includes hero; never aggregate these rows together.",
        "scope_label":"Fictional cohort name or full synthetic company. Default hero cohort is Care Coordination Platform.",
        "historical_attrition_pct":"Historical voluntary exits / (person_days / 365) * 100, rounded to one decimal. Aggregate past observation; never individual resignation probability.",
        "median_time_to_fill_days":"Median calendar days from opening to filling among roles filled in preceding365days. Cohort72days and company48days.",
        "assumed_capacity_ratio":"Positive assumed demand-minus-capacity gap over90days per active FTE relative to synthetic company; an assumption, not model prediction.",
        "pay_compression_exposure":"Aggregate exposure count under the reference definition. NULL means unavailable due to incomplete coverage; do not turn NULL into0. No salary amounts available.",
        "eligible_profile_count":"Count only of consented fictional profiles; no candidate data, ranking or decisions available.",
        "people_roles":"Count of People manager / manager d'équipe vacancies. NOT vacancies in the HR or People department.",
        "gross_gap_fte_months":"Sum of positive monthly demand-minus-capacity gaps over six calendar months before hypothetical interventions.",
        "residual_gap_fte_months":"Modeled six-month residual gap after assumed interventions. Target is strictly below5 FTE-months, not <=5.",
        "cost_eur":"Assumed cost in EUR, already converted from source cents: retain10000 + hire70000 + redeploy30000 per intervention.",
        "generated_event_count":"Number of generated fixture events, not live connections or employee headcount.",
        "source_reference":"Reference implementation path to cite as provenance, not a web URL.",
        "as_of":"Frozen synthetic reference date, not query execution freshness.",
    }
    return rows, descriptions, notes

def main():
    parser=argparse.ArgumentParser(); parser.add_argument("mode",choices=["supervisor","tables","genie","connect","readiness","genie_smoke","tune"]); parser.add_argument("attempt"); args=parser.parse_args()
    OUT.mkdir(parents=True,exist_ok=True); destination=OUT/f"{args.mode}-{args.attempt}.json"
    if destination.exists(): raise SystemExit("Refusing to overwrite actual attempt")
    config=json.loads(TARGET.read_text()); bindings=config.setdefault("agents",{})
    record={"kind":"aggregate_genie_supervisor_provisioning","mode":args.mode,"profile":"fevm-gdpr2","started_at_utc":now(),"source_commit":subprocess.check_output(["git","rev-parse","HEAD"],cwd=ROOT,text=True).strip(),"script_sha256":sha(Path(__file__).read_bytes()),"snapshot_sha256":sha(SNAPSHOT.read_bytes()),"capture_session_id":os.getenv("CODEX_THREAD_ID"),"operations":[],"credentials_retained":False,"gate_promotion":False,"aggregate_only":True}
    def save(): destination.write_text(json.dumps(scrub(record),indent=2,default=str)+"\n")
    def save_config():
        current=json.loads(TARGET.read_text()); current["agents"]=bindings; TARGET.write_text(json.dumps(current,indent=2)+"\n"); TARGET.chmod(0o600)
    def operation(name,request,callback):
        started=now()
        try:
            result=callback(); value=result.as_dict() if hasattr(result,"as_dict") else result
            record["operations"].append({"operation":name,"request":request,"started_at_utc":started,"finished_at_utc":now(),"succeeded":True,"response":scrub(value)})
            save(); return result
        except Exception as error:
            record["operations"].append({"operation":name,"request":request,"started_at_utc":started,"finished_at_utc":now(),"succeeded":False,"error_type":type(error).__name__,"error":scrub(str(error))});save();raise
    save()
    try:
        for key in list(os.environ):
            if key.startswith("DATABRICKS_"): del os.environ[key]
        w=WorkspaceClient(profile="fevm-gdpr2")
        snapshot=json.loads(SNAPSHOT.read_text()); rows,descriptions,notes=definitions(snapshot)
        def query(sql):
            def execute():
                response=w.statement_execution.execute_statement(statement=sql,warehouse_id=config["warehouse_id"],wait_timeout="30s",row_limit=100)
                deadline=time.monotonic()+90
                while response.status.state.value in {"PENDING","RUNNING"} and time.monotonic()<deadline:
                    time.sleep(1);response=w.statement_execution.get_statement(response.statement_id)
                if response.status.state.value!="SUCCEEDED":raise RuntimeError(json.dumps(response.as_dict()))
                return response
            return operation("statement_execution",{"statement":sql,"warehouse_id":config["warehouse_id"]},execute)
        if args.mode=="supervisor":
            if bindings.get("supervisor_resource_name"): raise ValueError("Supervisor already registered; use readiness")
            body=supervisoragents.SupervisorAgent(display_name=SUPERVISOR_TITLE,description="Read-only persona briefings and four-domain synthetic HR decisions grounded in aggregate Genie SQL. CPO, HRBP, TA and Analyst; no person-level or action-execution tools.",instructions=INSTRUCTIONS)
            result=operation("supervisor_agents.create_supervisor_agent",body.as_dict(),lambda:w.supervisor_agents.create_supervisor_agent(body))
            bindings.update(supervisor_resource_name=result.name,supervisor_endpoint=result.endpoint_name,supervisor_id=result.supervisor_agent_id or result.id);save_config()
        elif args.mode=="tables":
            for name,data in rows.items():
                columns=list(data[0]);types={}
                for column in columns:
                    example=next((r[column] for r in data if r[column] is not None),None)
                    types[column]="BOOLEAN" if isinstance(example,bool) else "BIGINT" if isinstance(example,int) else "DECIMAL(18,3)" if isinstance(example,Decimal) else "DATE" if column=="as_of" else "STRING"
                ddl=", ".join(f"`{column}` {types[column]} COMMENT {literal(notes.get(column,column.replace('_',' ')))}" for column in columns)
                query(f"CREATE TABLE IF NOT EXISTS {NAMESPACE}.{name} ({ddl}) USING DELTA COMMENT {literal(descriptions[name])} TBLPROPERTIES ('hr_demo.synthetic'='true','hr_demo.owner'='Laurent Fabre','hr_demo.lifecycle'='disposable-fevm','hr_demo.purpose'='aggregate-genie-briefings')")
                count=query(f"SELECT COUNT(*) AS row_count FROM {NAMESPACE}.{name}").result.data_array[0][0]
                if int(count)==0:
                    values=", ".join("("+", ".join(literal(row[column]) for column in columns)+")" for row in data)
                    query(f"INSERT INTO {NAMESPACE}.{name} VALUES {values}")
                elif int(count)!=len(data):raise ValueError(f"Unexpected existing row count in dedicated table {name}")
                else:
                    identity={"genie_scope_metrics":"scope_kind","genie_scenario_options":"option_id","genie_metric_definitions":"metric_id","genie_source_inventory":"source_id"}[name]
                    source=" UNION ALL ".join("SELECT "+", ".join(literal(row[column])+" AS `"+column+"`" for column in columns) for row in data)
                    query(f"MERGE INTO {NAMESPACE}.{name} AS target USING ({source}) AS source ON target.scenario_id=source.scenario_id AND target.`{identity}`=source.`{identity}` WHEN MATCHED THEN UPDATE SET *")
                result=query(f"SELECT {', '.join('t.`'+column+'`' for column in columns)} FROM {NAMESPACE}.{name} AS t ORDER BY 1,2,4")
                record.setdefault("table_counts",{})[name]=len(result.result.data_array)
                query(f"GRANT SELECT ON TABLE {NAMESPACE}.{name} TO `{config['get_app']['service_principal_client_id']}`")
            sp=config["get_app"]["service_principal_client_id"]
            query(f"GRANT USE CATALOG ON CATALOG gdpr2_catalog TO `{sp}`");query(f"GRANT USE SCHEMA ON SCHEMA {NAMESPACE} TO `{sp}`")
            bindings["tables"]=[f"{NAMESPACE}.{name}" for name in rows];save_config()
        elif args.mode=="genie":
            if bindings.get("genie_space_id"):raise ValueError("Genie already registered")
            examples=[
                ("Comparer les effectifs et départs historiques de la cohorte et de l'entreprise synthétique.",f"SELECT m.scope_kind, m.headcount, m.historical_attrition_pct, m.assumed_capacity_ratio FROM {NAMESPACE}.genie_scope_metrics AS m ORDER BY m.scope_kind"),
                ("Quelles sont les trois options sous le budget de450000euros et l'écart résiduel de chacune ?",f"SELECT o.option_id, o.retain, o.hire, o.redeploy, o.cost_eur, o.budget_eur, o.residual_gap_fte_months FROM {NAMESPACE}.genie_scenario_options AS o ORDER BY o.option_id"),
                ("What hiring and HR operations bottlenecks affect the fictional hero cohort?",f"SELECT m.critical_open_roles, m.engineering_roles, m.product_roles, m.people_roles, m.median_time_to_fill_days, m.overdue_cases, m.onboarding_cases, m.mobility_cases, m.payroll_cases FROM {NAMESPACE}.genie_scope_metrics AS m WHERE m.scope_kind='hero'"),
                ("How is historical attrition defined?",f"SELECT d.label_en, d.definition_en, d.unit, d.source_reference FROM {NAMESPACE}.genie_metric_definitions AS d WHERE d.metric_id='attrition'"),
            ]
            for question,sql in examples:query(sql)
            samples=["Prépare un briefing CPO sur la capacité de la cohorte fictive.","Quel bilan agrégé pour le HRBP ?","What hiring priorities should Talent Acquisition review?","Explain the Analyst's metric definitions and data limitations.","Comparer les trois scénarios et les hypothèses de coût."]
            tables=[]
            for name,data in rows.items():
                configs=[]
                for column in data[0]:
                    entry={"column_name":column,"description":[notes.get(column,column.replace('_',' '))]}
                    if column in {"scope_kind","scope_label","option_id","metric_id","illustrative_system"}:entry.update(enable_format_assistance=True,enable_entity_matching=True)
                    configs.append(entry)
                tables.append({"identifier":f"{NAMESPACE}.{name}","column_configs":sorted(configs,key=lambda x:x["column_name"])})
            instructions="## PURPOSE\n- Answer four-domain aggregate HR Demo questions for CPO, HRBP, TA and Analyst.\n\n## DISAMBIGUATION\n- If a country or period is requested outside the frozen scopes, explain it is unavailable; do not invent a breakdown.\n\n## CONSTRAINTS\n- All sources are synthetic aggregates; no individual risk, salary details, candidate ranking or action execution.\n- Persona is narrative context only and grants no permissions.\n\n## Instructions you must follow when providing summaries\n- Use the requested French or English, cite query tables and the reference date, disclose synthetic data.\n- Treat capacity and scenario outcomes as assumptions for human review, not predictions or achieved effects."
            payload={"version":2,"config":{"sample_questions":sorted([{"id":stable_id('sample:'+q),"question":[q]} for q in samples],key=lambda x:x['id'])},"data_sources":{"tables":sorted(tables,key=lambda x:x['identifier'])},"instructions":{"example_question_sqls":sorted([{"id":stable_id('sql:'+q),"question":[q],"sql":[s]} for q,s in examples],key=lambda x:x['id']),"text_instructions":[{"id":stable_id('global'),'content':[instructions]}]}}
            (OUT/"serialized-space.json").write_text(json.dumps(payload,indent=2,ensure_ascii=False)+"\n")
            result=operation("genie.create_space",{"warehouse_id":config["warehouse_id"],"title":GENIE_TITLE,"serialized_space_sha256":sha(json.dumps(payload).encode())},lambda:w.genie.create_space(config["warehouse_id"],json.dumps(payload),title=GENIE_TITLE,description="Aggregate-only synthetic HR Demo: retention, hiring, six-month capacity scenarios and HR operations. Frozen2026-09-14 reference, bilingual definitions and SQL examples. No employee/candidate rows or action tools."))
            bindings.update(genie_space_id=result.space_id,genie_url=w.config.host.rstrip('/')+'/genie/rooms/'+result.space_id);save_config()
        elif args.mode=="connect":
            tool=supervisoragents.Tool(tool_type="genie_space",description="Ground every HR persona briefing in read-only SQL over the four curated synthetic aggregate HR tables. Returns headcount, past attrition, hiring bottlenecks, SLA cases, modeled capacity scenarios, definitions and source provenance. No individual/candidate records or actions.",genie_space=supervisoragents.GenieSpace(id=bindings["genie_space_id"]))
            existing=operation("supervisor_agents.list_tools",{"parent":bindings["supervisor_resource_name"]},lambda:[t.as_dict() for t in w.supervisor_agents.list_tools(bindings["supervisor_resource_name"])])
            attached=next((t for t in existing if t.get("tool_id")=="aggregate_people_intelligence"),None)
            if attached:
                if attached.get("genie_space",{}).get("id")!=bindings["genie_space_id"]:raise ValueError("Existing Supervisor tool targets another Genie space")
            else:
                operation("supervisor_agents.create_tool",tool.as_dict(),lambda:w.supervisor_agents.create_tool(bindings["supervisor_resource_name"],tool,"aggregate_people_intelligence"))
            sp=config["get_app"]["service_principal_client_id"]
            operation("permissions.update.genie",{"space_id":bindings["genie_space_id"],"permission":"CAN_RUN","service_principal":sp},lambda:w.permissions.update("genie",bindings["genie_space_id"],access_control_list=[iam.AccessControlRequest(service_principal_name=sp,permission_level=iam.PermissionLevel.CAN_RUN)]))
            app=w.apps.get(config["app_name"]); resources=list(app.resources or [])
            resources=[r for r in resources if r.name not in {"hr-genie","hr-supervisor"}]
            resources.extend([apps.AppResource(name="hr-genie",genie_space=apps.AppResourceGenieSpace(name=GENIE_TITLE,space_id=bindings["genie_space_id"],permission=apps.AppResourceGenieSpaceGenieSpacePermission.CAN_RUN)),apps.AppResource(name="hr-supervisor",serving_endpoint=apps.AppResourceServingEndpoint(name=bindings["supervisor_endpoint"],permission=apps.AppResourceServingEndpointServingEndpointPermission.CAN_QUERY))])
            operation("apps.update.resources",{"app_name":app.name,"resources":[r.as_dict() for r in resources]},lambda:w.apps.update(app.name,apps.App(name=app.name,resources=resources,description=app.description)))
        elif args.mode=="tune":
            body=supervisoragents.SupervisorAgent(display_name=SUPERVISOR_TITLE,instructions=INSTRUCTIONS)
            operation("supervisor_agents.update_instructions",{"instructions":INSTRUCTIONS},lambda:w.supervisor_agents.update_supervisor_agent(bindings["supervisor_resource_name"],body,supervisoragents.FieldMask(["instructions"])))
            query(f"ALTER TABLE {NAMESPACE}.genie_scope_metrics ALTER COLUMN people_roles COMMENT {literal(notes['people_roles'])}")
            space=w.genie.get_space(bindings["genie_space_id"],include_serialized_space=True)
            payload=json.loads(space.serialized_space)
            for table in payload["data_sources"]["tables"]:
                for column in table.get("column_configs",[]):
                    if column["column_name"]=="people_roles":column["description"]=[notes["people_roles"]]
            operation("genie.update_role_definition",{"serialized_space":payload},lambda:w.genie.update_space(bindings["genie_space_id"],serialized_space=json.dumps(payload)))
        elif args.mode=="readiness":
            operation("supervisor_agents.get",{"name":bindings["supervisor_resource_name"]},lambda:w.supervisor_agents.get_supervisor_agent(bindings["supervisor_resource_name"]))
            operation("serving_endpoints.get",{"name":bindings["supervisor_endpoint"]},lambda:w.serving_endpoints.get(bindings["supervisor_endpoint"]))
            if bindings.get("genie_space_id"):operation("genie.get_space",{"space_id":bindings["genie_space_id"]},lambda:w.genie.get_space(bindings["genie_space_id"],include_serialized_space=True))
            operation("apps.get",{"name":config["app_name"]},lambda:w.apps.get(config["app_name"]))
        elif args.mode=="genie_smoke":
            result=operation("genie.start_conversation",{"space_id":bindings["genie_space_id"],"question":"For the fictional hero cohort only, return headcount, critical open roles, overdue cases and assumed capacity ratio. Disclose synthetic data and date."},lambda:w.genie.start_conversation(bindings["genie_space_id"],"For the fictional hero cohort only, return headcount, critical open roles, overdue cases and assumed capacity ratio. Disclose synthetic data and date.").result())
        record["succeeded"]=True
    except Exception as error:
        record["succeeded"]=False;record["error_type"]=type(error).__name__;record["error"]=scrub(str(error))
    record["finished_at_utc"]=now();save()
    print(json.dumps({"artifact":str(destination.relative_to(ROOT)),"succeeded":record["succeeded"],"error":record.get('error'),"bindings":bindings}))
    return 0 if record["succeeded"] else 1

if __name__=="__main__":raise SystemExit(main())
