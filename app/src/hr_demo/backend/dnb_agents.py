"""Live DNB agent routing. Target IDs and source allowlists are server-owned."""
from datetime import datetime, timezone
import json
import os
import re

from pydantic import Field

from .models import StrictInput
from .agents import final_answer
from .genie_chat import ask_genie
from ..data.dnb import DOMAINS, MONTHS, REGIONS, SCENARIOS, USE_CASES
from typing import Literal


class DnbQuestion(StrictInput):
    message: str = Field(min_length=1,max_length=2000)
    language: Literal["fr","en"] = "fr"
    agent: Literal["supervisor","workforce","talent","retention","operations"] = "supervisor"
    scenario: Literal["baseline","hiring_surge","balanced"] = "baseline"
    region: Literal["ALL","AMER","EMEA","APJ"] = "ALL"
    month: Literal["2026-01-01","2026-02-01","2026-03-01","2026-04-01","2026-05-01","2026-06-01"] = "2026-06-01"
    conversation_id: str | None = Field(default=None,max_length=64,pattern=r"^[a-fA-F0-9-]+$")

    def scope(self):
        return dict(agent=self.agent,scenario=self.scenario,region=self.region,month=self.month)


def bindings():
    value=json.loads(os.environ.get("HR_DEMO_DNB_AGENTS","{}"))
    if not isinstance(value,dict): raise ValueError("Invalid DNB bindings")
    for domain,details in value.get("specialists",{}).items():
        if domain not in DOMAINS or not re.fullmatch(r"[a-fA-F0-9]{32}",details.get("space_id","")):
            raise ValueError("Invalid specialist binding")
        if not details.get("tables") or any(not re.fullmatch(r"[A-Za-z0-9_]+\.[A-Za-z0-9_]+\.dnb_"+domain+r"_metrics",t) for t in details["tables"]):
            raise ValueError("Invalid specialist source")
    return value


def catalog():
    config=bindings()
    return dict(use_cases=USE_CASES,scenarios=SCENARIOS,regions=REGIONS,months=MONTHS,synthetic=True,
                research=dict(scope="Worldwide DNB; AMER, EMEA and APJ separately",method="Curated research-informed questions, not measured adoption ranks",date="2026-09-29",raw_records_in_app=False),
                specialists=[dict(id=k,title=dict(fr=v[0],en=v[1]),description=v[2],configured=k in config.get("specialists",{})) for k,v in DOMAINS.items()],
                supervisor_configured=bool(config.get("supervisor_endpoint")),execution_identity="application_service_principal")


def prompt(body):
    return ("DNB HR synthetic demonstration. Answer in "+("French" if body.language=="fr" else "English")+
            f". Required scope: scenario={body.scenario}; region={body.region} (ALL means AMER+EMEA+APJ); calendar month={body.month}. "
            "Use exactly this scope unless the question explicitly asks a trend, in which case group by month from January through the selected month. "
            "Do not combine scenarios or sum monthly snapshot headcounts. Query the configured governed metrics. "
            "Provide concise Markdown with a small result table. Disclose synthetic data, scenario, region and period. "
            "These are alternate fictional worlds, not actual measured intervention effects. No personal data, individual risk, "
            "health inference, candidate ranking or HR-system writes. No causal claims. If unsupported, say so. "
            "End with a neutral next investigation for human review. Question: "+body.message)


def supervisor_trace(raw, config):
    """Native Responses returns Genie tool results as call_id-linked messages.

    This proves delegation/returned output, not independent numeric correctness.
    Do not expose provider reasoning or substitute configured tables for citations.
    """
    tools={"dnb_"+d:d for d in config["specialists"]}
    calls={o.get("call_id"):tools[o["name"]] for o in raw.get("output",[])
           if o.get("type")=="function_call" and o.get("name") in tools and o.get("call_id")}
    traces=[]
    for item in raw.get("output",[]):
        if item.get("call_id") not in calls or item.get("type") not in {"message","function_call_output"}: continue
        content=item.get("content",[])
        text="\n".join(c.get("text","") for c in content if isinstance(c,dict) and c.get("type") in {"text","output_text"})
        if not text and isinstance(item.get("output"),str): text=item["output"]
        if text.strip():
            domain=calls[item["call_id"]]
            traces.append(dict(agent=domain,call_id=item["call_id"],status="returned",result=text[:16000],
                               configured_sources=config["specialists"][domain].get("tables",[])))
    if not traces: raise ValueError("Supervisor returned no observed specialist output")
    return traces


def ask(client, body):
    config=bindings()
    if body.agent!="supervisor":
        agent=config.get("specialists",{}).get(body.agent)
        if not agent: raise ValueError("Specialist unavailable")
        answer=ask_genie(client,body.message,body.language,body.conversation_id,
                         configured_space=agent["space_id"],source_scope=agent["tables"],scoped_prompt=prompt(body))
        # Do not route DNB questions back into unrelated historical cockpit data.
        answer.pop("next_action",None)
        answer.update(engine="live_dedicated_genie",delegations=[dict(agent=body.agent,status="completed",call_id=answer["message_id"])])
    else:
        endpoint=config.get("supervisor_endpoint","")
        if not re.fullmatch(r"[A-Za-z0-9_-]+",endpoint): raise ValueError("Supervisor unavailable")
        if body.conversation_id: raise ValueError("Supervisor questions are independent requests")
        with client.serving_endpoints.get_open_ai_client(timeout=180.0,max_retries=0) as provider:
            raw=provider.responses.create(model=endpoint,input=[{"role":"user","content":prompt(body)}],stream=False).model_dump(mode="json")
        trace=supervisor_trace(raw,config)
        tables={t for a in config["specialists"].values() for t in a["tables"]}
        reported="\n".join(t["result"] for t in trace)
        citations=sorted(t for t in tables if t in reported.replace("`",""))
        answer=dict(answer=final_answer(raw),engine="live_supervisor",message_id=raw.get("id"),conversation_id=None,
                    citations=citations,queries=[],delegations=trace,refused=False)
    answer.update(scope=body.scope(),generated_at=datetime.now(timezone.utc).isoformat(),synthetic=True,
                  execution_identity="application_service_principal",human_review_required=True)
    return answer
