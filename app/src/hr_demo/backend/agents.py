"""Read-only persona briefings from the native Supervisor and its Genie tool.

Only fixed operator prompts reach the agent. The application serves independently
reviewed captures only, after enforcing aggregate:read and recording an audit.
"""
from importlib.resources import files
import json
import os
import re

from .models import BriefingOut
from .store import digest
from ..data import load_snapshot


FOCUS = {
    "cpo": "CPO: capacity decision, blended plan versus alternatives, modeled cost and budget; human decision required.",
    "hrbp": "HRBP: collective support, historical cohort attrition versus company, aggregate compression coverage and overdue cases. Never personal departure risk. If mentioning the 1.8 capacity ratio, its horizon is NINETY DAYS / 90 JOURS, never six months. Six months applies only to the separate intervention scenarios.",
    "ta": "Talent Acquisition: critical vacancies, engineering/product/people breakdown if available, historical fill delay and evidence gaps. Never rank or name candidates. The next question must ask which evidence is needed to assess the FOUR hypothetical hires in the blended option. There is no established target or requirement to fill all ELEVEN open roles within six months; never suggest one.",
    "analyst": "People Analyst: cohort/company scope, source reconciliation, metric definitions and NULL coverage. Describe the attrition denominator IN WORDS (average daily headcount over the preceding 365 days); do not write any numeric formula. Distinguish historical measures from untrained scenarios. The capacity ratio compares assumed 90-day gap intensity; the intervention scenarios span six months. These time horizons must not be conflated.",
}


def reference_checks() -> dict:
    """Executed aggregate reference for cross-checking the Genie result.

    This is not substituted for a tool call. A disagreement must be reported as
    unavailable, and the output provenance still identifies the actual model.
    """
    snapshot = load_snapshot()
    scopes = {}
    for name, row in snapshot["reference"]["scopes"].items():
        scopes[name] = {key: row[key] for key in (
            "headcount", "voluntary_exits", "person_days", "critical_open_roles",
            "engineering_roles", "product_roles", "people_roles", "overdue_cases",
            "onboarding_cases", "mobility_cases", "payroll_cases", "pay_compression_exposure")}
        scopes[name].update(row["display"])
        scopes[name]["active_fte"] = row["active_fte_milli"] / 1000
    return {"scopes": scopes, "options": [{
        "option_id": row["option_id"], "retain": row["retain"], "hire": row["hire"], "redeploy": row["redeploy"],
        "cost_eur": row["cost_eur_cents"] / 100, "budget_eur": row["budget_eur_cents"] / 100,
        "gross_gap_fte_months": row["gross_gap_milli"] / 1000,
        "residual_gap_fte_months": row["residual_gap_milli"] / 1000,
    } for row in snapshot["reference"]["options"]], "definitions": {
        "blended": "retain 5 + hire 4 + redeploy 2; retention is NOT promotion; there is NO promote-only scenario",
        "people_roles": "People manager / manager d'équipe; NOT an HR or People department vacancy",
        "historical_attrition": "voluntary exits / (person_days / 365) * 100; not current-headcount denominator or future turnover risk",
        "capacity_ratio": "assumed 90-day capacity-gap intensity versus company; not intervention ratio or a validated prediction",
        "overdue_cases": "onboarding, mobility and payroll cases; NOT employee relations cases",
        "compression": "aggregate exposure count, not case records or a list of people to target; company NULL means unavailable",
        "quality": "Aggregate tables cannot establish completeness of candidate evidence, pipeline tracking, causality or individual needs",
    }}
def source_tables() -> list[str]:
    """Target bindings, never a claim that every configured table was queried."""
    try:
        tables = json.loads(os.getenv("HR_DEMO_GENIE_TABLES", "[]"))
        return [name for name in tables if isinstance(name, str) and
                re.fullmatch(r"[A-Za-z0-9_]+\.[A-Za-z0-9_]+\.genie_[A-Za-z0-9_]+", name)]
    except (ValueError, TypeError):
        return []


def briefing_prompt(persona: str, language: str) -> str:
    precise_french = {
        "hrbp": " En français, écrivez exactement '18 expositions agrégées à la compression salariale'. N'utilisez jamais '18 cas' ou '18 dossiers' : les dossiers de support sont une autre mesure, au nombre de six. Pour les deux taux d'attrition, décrivez le dénominateur uniquement en mots : effectif quotidien moyen sur les 365 jours précédents. N'écrivez aucune formule numérique ni quotient de personnes-jours.",
        "analyst": " En français, indiquez seulement que la couverture entreprise est incomplète. Si vous précisez les causes possibles, dites 'couverture de paie OU des pairs incomplète'. La source ne permet pas d'attribuer cette absence spécifiquement à la paie : n'écrivez jamais 'payroll incomplet' ni 'paie incomplète' seuls.",
    }.get(persona, "") if language == "fr" else ""
    return (
        "Create a mini briefing for the HR synthetic demonstration, scenario DL-HR-2026-09-CCP, as of 2026-09-14. "
        "Use the attached Genie Agent to query the curated aggregate tables before answering. "
        "Request exactly the current rows of genie_scope_metrics for hero and company and "
        "genie_scenario_options for blended, recruit_only and do_nothing, including column names. "
        "Ask for raw rows only, no quality assessment, conclusions, new scenarios or synthetic SQL literals. "
        "Return only the final briefing: three short bullet points, at most 130 words total. "
        "Write entirely in " + ("French" if language == "fr" else "English") + ". " + FOCUS[persona] + " "
        "Include the concrete numbers relevant to this persona and a practical next discussion. "
        "Disclose synthetic data and assumptions briefly. Do not claim actions were executed, validated predictions, "
        "individual risk, salaries, candidate assessments or customer approval. The 1.8x ratio is an assumption, "
        "not a trained prediction; company pay-compression is unavailable. Costs are modeled euros; gaps are FTE-months. "
        "Scopes overlap: the hero cohort is included in company, never sum their headcounts. "
        "headcount counts people (collaborateurs/employees), NEVER ETP/FTE. active_fte is a different measure. "
        "Do not call headcount ETP, even in French. Use plain text bullet points, no headings, tables, XML, "
        "Markdown emphasis or word-count note. Include the actual source table names in a brief final source line. "
        "Use observations and questions only. Do not infer future turnover risk, causes of hiring delay, "
        "data-quality completeness or uncomputed cumulative delays. For TA, explicitly state candidate evidence "
        "is outside these aggregate tables; do not claim there are no evidence gaps. For HRBP, discuss aggregate "
        "support priorities, not targeting the 18 exposures as individual cases. For Analyst, state the actual "
        "attrition denominator and company NULL coverage; do not generalize NULL to hero coverage. "
        "The 72 versus 48 day medians cover ALL filled roles; no engineering-specific median is available. "
        "Do not suggest the capacity ratio measures demand on shared HR services. Do not claim blended has "
        "the lowest cost overall: do-nothing costs zero; blended costs less ONLY than recruit-only. "
        "If displaying an attrition PERCENT formula, explicitly include multiplication by 100, "
        "or describe the denominator in words without writing a formula. Avoid extra derived ratios. "
        "The blended option is RETAIN 5 + HIRE 4 + REDEPLOY 2, never promote. "
        "Do not invent a quarter, deadline or delivery commitment; scenarios span six months. "
        "If Genie cannot query its data, explicitly say the briefing is unavailable; do not invent numbers."
        " Cross-check the returned Genie rows against this executed synthetic SQL reference and glossary; "
        "if there is a mismatch, report unavailability rather than choosing a value: "
        + json.dumps(reference_checks(), ensure_ascii=False, sort_keys=True) + precise_french
    )


def final_answer(response: dict) -> str:
    """Native Supervisor wraps tool results as assistant messages with call_id.

    Take only the last terminal assistant message, excluding routed tool data,
    intermediate narration, agent-name markers and reasoning blocks.
    """
    parts = []
    for item in response.get("output", []):
        if (item.get("type") == "message" and item.get("role") == "assistant"
                and not item.get("call_id")):
            candidate = []
            for content in item.get("content", []):
                if isinstance(content, dict) and content.get("type") in ("output_text", "text"):
                    value = content.get("text", "")
                    if isinstance(value, str) and value.strip() and not value.strip().startswith("<name>"):
                        candidate.append(value)
            if candidate:
                parts = candidate
    if not parts:
        for choice in response.get("choices", []):
            message = choice.get("message", {})
            if message.get("role", "assistant") == "assistant" and isinstance(message.get("content"), str):
                parts.append(message["content"])
    answer = "\n".join(part.strip() for part in parts if isinstance(part, str) and part.strip())
    if not answer or len(answer) > 10000:
        raise ValueError("Agent returned no bounded final answer")
    return answer


def require_genie_result(response: dict) -> None:
    """Accept only an observed call and matching returned Genie output."""
    output = response.get("output", [])
    calls = {item.get("call_id") for item in output if item.get("type") == "function_call"
             and item.get("name") == "aggregate_people_intelligence" and item.get("call_id")}
    if not any(item.get("call_id") in calls and item.get("type") == "message" and
               any(c.get("text", "").strip() for c in item.get("content", []) if isinstance(c, dict))
               for item in output):
        raise ValueError("No observed Genie tool result")


def invoke_supervisor(client, endpoint: str, persona: str, language: str) -> tuple[str, dict]:
    if not re.fullmatch(r"[A-Za-z0-9_-]+", endpoint):
        raise ValueError("Invalid configured supervisor endpoint")
    # The typed query() API drops Responses output. The SDK-provided OpenAI
    # client preserves native Responses messages and uses the injected identity.
    with client.serving_endpoints.get_open_ai_client(timeout=180.0, max_retries=0) as provider:
        response = provider.responses.create(
            model=endpoint, input=[{"role": "user", "content": briefing_prompt(persona, language)}],
            stream=False,
        ).model_dump(mode="json")
    require_genie_result(response)
    return final_answer(response), response


class BriefingService:
    """Serve only source-bound, independently reviewed model captures.

    Live generation belongs to the operator capture/review workflow. Reloading
    this API cannot publish a new model answer or schedule a provider invocation.
    """

    def bindings(self) -> tuple[str, str, str]:
        return (os.getenv("HR_DEMO_SUPERVISOR_ENDPOINT", ""),
                os.getenv("HR_DEMO_GENIE_SPACE_ID", ""), os.getenv("HR_DEMO_GENIE_URL", ""))

    def seed(self, persona: str, language: str, snapshot_hash: str, endpoint: str, space: str) -> dict | None:
        try:
            bundle = json.loads(files("hr_demo.data").joinpath("agent_briefings.json").read_text())
            manifest, review = bundle["manifest"], bundle["review"]
            if (manifest["snapshot_sha256"] != snapshot_hash or manifest["supervisor_endpoint"] != endpoint
                    or manifest["genie_space_id"] != space or manifest["source_tables"] != source_tables()):
                return None
            if (review["model"] != "gpt-6-astra" or review["effort"] != "low" or not review["session_id"]
                    or review["report"]["verdict"] != "PASS"
                    or review["report"]["accepted_manifest_sha256"] != digest(manifest)
                    or review["report_sha256"] != digest(review["report"])):
                return None
            key = f"{persona}:{language}"
            record, accepted = bundle["briefings"][key], manifest["answers"][key]
            if (accepted["prompt_sha256"] != digest(briefing_prompt(persona, language))
                    or accepted["answer_sha256"] != digest(record["answer"])
                    or not accepted["lineage_sha256"] or not accepted["capture_sha256"]
                    or not accepted["citations"] or not set(accepted["citations"]).issubset(source_tables())
                    or not accepted["generated_at"] or not accepted["response_id"]):
                return None
            return dict(answer=record["answer"], generated_at=accepted["generated_at"],
                        response_id=accepted["response_id"], citations=accepted["citations"],
                        review_session_id=review["session_id"])
        except (FileNotFoundError, KeyError, ValueError, TypeError, AttributeError):
            return None

    def get(self, client, persona: str, language: str, refresh: bool = False,
            on_complete=None, on_start=None) -> tuple[BriefingOut, bool]:
        endpoint, space, url = self.bindings()
        snapshot_hash = digest(load_snapshot())
        base = dict(persona=persona, language=language, genie_url=url or None,
                    snapshot_sha256=snapshot_hash, engine="genie_supervisor", source_tables=source_tables())
        record = self.seed(persona, language, snapshot_hash, endpoint, space) if endpoint and space else None
        if record is None:
            return BriefingOut.model_validate(dict(base, status="unavailable", detail="reviewed_capture_unavailable")), False
        # Audit is synchronous; unavailable audit prevents returning the answer.
        if on_complete:
            on_complete("served_reviewed_capture", {"response_id": record["response_id"],
                "review_session_id": record["review_session_id"], "answer_sha256": digest(record["answer"])})
        return BriefingOut.model_validate(dict(base, **record, status="ready", cached=True,
                                               detail="independently_reviewed_capture")), False


briefings = BriefingService()
