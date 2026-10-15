"""Synthetic presentation API with server-owned identity and durable actions."""
from contextlib import contextmanager
import json
import os
import re
from typing import Annotated, Literal

from fastapi import Depends, HTTPException
from fastapi.responses import JSONResponse

from ..data import load_snapshot, load_document
from .auth import Principal, principal, require_permission
from .core import Dependencies, create_router
from .models import (
    VersionOut, SessionOut, CockpitOut, CapabilitiesOut, ActionOut,
    ProposalIn, ReviewIn, CommitIn, AccessCheckIn, AccessCheckOut,
    AssistantIn, AssistantOut, BriefingIn, BriefingOut, GenieQuestionIn,
)
from .store import get_store, digest
from .agents import briefings
from .genie_chat import ask_genie, next_action
from . import dnb_agents
from . import enterprise
from . import enterprise_models as em

router = create_router()
Actor = Annotated[Principal, Depends(principal)]


@router.get("/enterprise/catalog", operation_id="enterpriseCatalog")
def enterprise_catalog(actor: Actor, client: Dependencies.Client):
    with action_store(client) as store:
        return enterprise.catalogue(store, actor)


@router.post("/enterprise/runs", operation_id="enterpriseCreateRun")
def enterprise_create_run(body: em.RunIn, actor: Actor, client: Dependencies.Client):
    with action_store(client) as store:
        return enterprise.create_run(store, actor, body)


@router.post("/enterprise/ingest", operation_id="enterpriseIngest")
def enterprise_ingest(body: em.IngestIn, actor: Actor, client: Dependencies.Client):
    with action_store(client) as store:
        return enterprise.ingest(store, actor, body)


@router.post("/enterprise/ingest-file", operation_id="enterpriseIngestFile")
def enterprise_ingest_file(body: em.FileBatchIn, actor: Actor, client: Dependencies.Client):
    with action_store(client) as store:
        return enterprise.ingest(store, actor, body)


@router.post("/enterprise/snapshot", operation_id="enterpriseSnapshot")
def enterprise_snapshot(body: em.Scope, actor: Actor, client: Dependencies.Client):
    with action_store(client) as store:
        try:
            return enterprise.snapshot(store, actor, body)
        except HTTPException as error:
            if error.status_code == 403:
                store.audit(actor, "enterprise_access", "denied", json.dumps(dict(run_id=body.run_id, requested_entity=body.entity)))
            raise


@router.post("/enterprise/tools/query", operation_id="enterpriseReadTool")
def enterprise_read_tool(body: em.Scope, actor: Actor, client: Dependencies.Client):
    """Read-only external-agent tool; the same identity policy and SQL as the UI."""
    return enterprise_snapshot(body, actor, client)


@router.get("/enterprise/tools/manifest", operation_id="enterpriseToolManifest")
def enterprise_tool_manifest(actor: Actor):
    enterprise.policy(actor)
    return dict(name="enterprise_hr_snapshot", version="1.0", method="POST", path="/api/enterprise/tools/query",
                input_schema=em.Scope.model_json_schema(), read_only=True,
                authentication="Databricks Apps OAuth bearer identity with assigned Enterprise scope",
                description="Retrieve synthetic aggregate metrics and dated policies for an authorized run/entity/month. No write capability.")


@router.get("/enterprise/source-template", operation_id="enterpriseSourceTemplate")
def enterprise_source_template(actor: Actor):
    access = enterprise.policy(actor)
    if access["role"] != "editor" or set(access["entities"]) != enterprise.ENTITY_IDS:
        raise HTTPException(403, "Source templates require group editor scope")
    return dict(synthetic=True, rows=[r for r in enterprise.source_rows() if r["entity"] in access["entities"]])


@router.post("/enterprise/proposals", operation_id="enterprisePropose")
def enterprise_propose(body: em.PlanIn, actor: Actor, client: Dependencies.Client):
    with action_store(client) as store:
        return enterprise.propose(store, actor, body)


@router.post("/enterprise/decisions", operation_id="enterpriseDecide")
def enterprise_decide(body: em.DecisionIn, actor: Actor, client: Dependencies.Client):
    with action_store(client) as store:
        return enterprise.decide(store, actor, body)


@router.post("/enterprise/explain", operation_id="enterpriseExplain")
def enterprise_explain(body: em.ExplainIn, actor: Actor, client: Dependencies.Client):
    with action_store(client) as store:
        return enterprise.explain(store, actor, client, body)


@router.post("/enterprise/value", operation_id="enterpriseValue")
def enterprise_value(body: em.ValueIn, actor: Actor):
    enterprise.policy(actor)
    return em.value_case(body)


@router.get("/enterprise/evidence/{run_id}", operation_id="enterpriseEvidence")
def enterprise_evidence(run_id: str, actor: Actor, client: Dependencies.Client):
    with action_store(client) as store:
        return enterprise.evidence(store, actor, run_id)


@router.get("/dnb/catalog", operation_id="dnbCatalog")
def dnb_catalog(actor: Actor):
    require_permission(actor,"aggregate:read")
    try:
        return dnb_agents.catalog()
    except Exception:
        raise HTTPException(503,"DNB configuration unavailable") from None


@router.post("/dnb/ask", operation_id="dnbAsk")
def dnb_question(body: dnb_agents.DnbQuestion, actor: Actor, client: Dependencies.Client):
    require_permission(actor,"aggregate:read")
    with action_store(client) as store:
        if body.conversation_id:
            _,records=store.read(actor)
            owned=any(r["action"]=="dnb_question" and r["outcome"]=="answered"
                      and json.loads(r["detail"]).get("conversation_id")==body.conversation_id
                      and json.loads(r["detail"]).get("scope")==body.scope() for r in records)
            if not owned: raise HTTPException(403,"Conversation does not belong to this session and scope")
        store.audit(actor,"dnb_question","requested",json.dumps(dict(question_sha256=digest(body.message),scope=body.scope())))
        try:
            result=dnb_agents.ask(client,body)
        except Exception:
            store.audit(actor,"dnb_question","unavailable",json.dumps(body.scope()))
            raise HTTPException(503,"The selected live agent is unavailable for this question. Retry; no saved answer was substituted.") from None
        result["audit_id"]=store.audit(actor,"dnb_question","answered",json.dumps(dict(
            scope=body.scope(),conversation_id=result.get("conversation_id"),message_id=result.get("message_id"),
            answer_sha256=digest(result["answer"]),citations=result["citations"],delegated_to=[t["agent"] for t in result["delegations"]])))
        return result


def session(actor: Principal) -> SessionOut:
    return SessionOut(principal_label=actor.label, authentication_mode=actor.mode,
                      permissions=list(actor.permissions))


@contextmanager
def action_store(client):
    try:
        yield get_store(client)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(503, "Action queue temporarily unavailable; refresh before retrying") from None


def scenario_option(snapshot, identifier):
    for option in snapshot["reference"]["options"]:
        if option["option_id"] == identifier:
            return option
    raise HTTPException(404, "Scenario option not found")


@router.get("/version", response_model=VersionOut, operation_id="version")
def version():
    return VersionOut.from_metadata()


@router.get("/current-user", response_model=SessionOut, operation_id="currentUser")
def me(actor: Actor):
    return session(actor)


def persona_briefing(body: BriefingIn, actor: Principal, client):
    require_permission(actor, "aggregate:read")
    # Only independently reviewed captures may be served, with a read audit.
    with action_store(client) as store:
        def completed(outcome, provenance):
            store.audit(actor, "agent_briefing", outcome,
                        json.dumps({"persona": body.persona, "language": body.language,
                                    "scope": "aggregate_synthetic", **provenance}, sort_keys=True))
        result, _ = briefings.get(client, body.persona, body.language, body.refresh, completed)
    return result


@router.get("/agents/briefing", response_model=BriefingOut, operation_id="agentBriefing")
def agent_briefing(actor: Actor, client: Dependencies.Client,
                   persona: Literal["cpo", "hrbp", "ta", "analyst"] = "cpo",
                   language: Literal["fr", "en"] = "fr"):
    return persona_briefing(BriefingIn(persona=persona, language=language), actor, client)


@router.post("/agents/briefing", response_model=BriefingOut, operation_id="refreshAgentBriefing")
def refresh_agent_briefing(body: BriefingIn, actor: Actor, client: Dependencies.Client):
    return persona_briefing(body, actor, client)


@router.get("/cockpit", response_model=CockpitOut, operation_id="cockpit")
def cockpit(actor: Actor, client: Dependencies.Client):
    require_permission(actor, "aggregate:read")
    snapshot = load_snapshot()
    actions, audit, available, kind = [], [], False, "unavailable"
    try:
        with action_store(client) as store:
            actions, audit = store.read(actor)
            available, kind = True, store.kind
    except HTTPException as error:
        if error.status_code != 503:
            raise
    return CockpitOut(
        scenario_id=snapshot["scenario_id"], as_of=snapshot["as_of"], synthetic=True,
        reference=snapshot["reference"], session=session(actor),
        candidates=snapshot["candidates"] if "candidate:read" in actor.permissions else [],
        cases=snapshot["cases"] if "case:read" in actor.permissions else [],
        sources=snapshot["sources"], definitions=snapshot["definitions"],
        actions=actions, audit=audit if "audit:read" in actor.permissions else [],
        capabilities=CapabilitiesOut(actions_available=available and "action:write" in actor.permissions,
                                     action_store=kind, assistant_mode="cited_sql_reference",
                                     dashboard_url=os.getenv("HR_DEMO_DASHBOARD_URL")),
        freshness={"mode": "frozen_synthetic_sql_reference", "as_of": snapshot["as_of"],
                   "generated_at": snapshot["provenance"]["generated_at"],
                   "source_commit": snapshot["provenance"]["source_commit"],
                   "snapshot_sha256": digest(snapshot)},
    )


@router.get("/documents/{document_id}", operation_id="document")
def document(document_id: str, actor: Actor):
    require_permission(actor, "candidate:read")
    try:
        return load_document(document_id)
    except KeyError:
        raise HTTPException(404, "Document not found in the authenticated scope") from None


@router.post("/actions", response_model=ActionOut, operation_id="proposeAction")
def propose_action(body: ProposalIn, actor: Actor, client: Dependencies.Client):
    require_permission(actor, "action:write")
    snapshot = load_snapshot()
    with action_store(client) as store:
        return store.propose(actor, scenario_option(snapshot, body.option_id), digest(snapshot), body.rationale)


@router.post("/actions/{action_id}/review", response_model=ActionOut, operation_id="reviewAction")
def review_action(action_id: str, body: ReviewIn, actor: Actor, client: Dependencies.Client):
    require_permission(actor, "action:write")
    with action_store(client) as store:
        return store.review(actor, action_id, body.expected_version, body.decision, body.note, digest(load_snapshot()))


@router.post("/actions/{action_id}/commit", response_model=ActionOut, operation_id="commitAction")
def commit_action(action_id: str, body: CommitIn, actor: Actor, client: Dependencies.Client):
    require_permission(actor, "action:write")
    snapshot = load_snapshot()
    with action_store(client) as store:
        # Actor-scoped lookup; commit locks and revalidates the row transactionally.
        with store.connection() as db:
            action = store._action(db, actor, action_id)
        return store.commit(actor, action_id, body.expected_version, body.idempotency_key,
                            scenario_option(snapshot, action["option_id"]), digest(snapshot))


@router.post("/access-check", response_model=AccessCheckOut, operation_id="accessCheck",
             responses={403: {"model": AccessCheckOut}})
def access_check(body: AccessCheckIn, actor: Actor, client: Dependencies.Client):
    with action_store(client) as store:
        audit_id = store.audit(actor, "restricted_request", "denied", body.request + ": outside presenter scope")
    return JSONResponse(status_code=403, content={
        "detail": "Access denied. Individual risk, candidate ranking and salary details are outside this demo's authorized scope.",
        "audit_id": audit_id,
    })


@router.post("/assistant", response_model=AssistantOut, operation_id="askAssistant")
def ask_assistant(body: AssistantIn, actor: Actor, client: Dependencies.Client):
    require_permission(actor, "aggregate:read")
    snapshot = load_snapshot()
    fr = body.language == "fr"
    message = body.message.lower()
    refused = bool(re.search(r"individual|individuel|salary|salaire|ranking|class[ée]|probabilit|resign|d[ée]mission|automati|contact|reject|rejeter", message))
    profile_question = bool(re.search(r"profil|profile|preuves.*candidat|candidate.*evidence", message))
    if profile_question and "candidate:read" not in actor.permissions:
        refused = True
    supported = True
    citations = ["validation/reference_query.sql", "DL-HR-2026-09-CCP"]
    if refused:
        answer = ("Cette demande sort du périmètre autorisé. Je peux expliquer les indicateurs agrégés et les scénarios synthétiques. Toute action exige une revue humaine explicite."
                  if fr else "This request is outside the authorized scope. I can explain aggregate metrics and synthetic scenarios. Every action requires explicit human review.")
    else:
        hero, company = snapshot["reference"]["scopes"]["hero"], snapshot["reference"]["scopes"]["company"]
        option = scenario_option(snapshot, "blended")
        if re.search(r"compar.*option|three options|trois options", message):
            names = {"blended": "Plan combiné" if fr else "Blended plan",
                     "do_nothing": "Sans intervention" if fr else "No intervention",
                     "recruit_only": "Recrutement seul" if fr else "Recruitment only"}
            answer = "\n".join(
                (f"{names[item['option_id']]} : fidéliser {item['retain']}, recruter {item['hire']}, redéployer {item['redeploy']} ; écart résiduel {item['residual_gap_milli']/1000:g} ETP-mois ; coût {item['cost_eur_cents']/100:,.0f} €."
                 if fr else f"{names[item['option_id']]}: retain {item['retain']}, hire {item['hire']}, redeploy {item['redeploy']}; residual gap {item['residual_gap_milli']/1000:g} FTE-months; cost €{item['cost_eur_cents']/100:,.0f}.")
                for item in snapshot["reference"]["options"]
            )
            answer += (f"\nBudget synthétique commun : {option['budget_eur_cents']/100:,.0f} €. Seul le plan combiné atteint la cible stricte de moins de 5 ETP-mois sous ces hypothèses. Une revue humaine reste nécessaire."
                       if fr else f"\nShared synthetic budget: €{option['budget_eur_cents']/100:,.0f}. Only the blended plan reaches the strict target below 5 FTE-months under these assumptions. Human review is required.")
        elif re.search(r"ratio|1[.,]8", message):
            definition = next(item for item in snapshot["definitions"] if item["id"] == "assumed_capacity_ratio")
            answer = (f"Le ratio de {hero['display']['assumed_capacity_ratio']}× compare la cohorte à la référence entreprise de {company['display']['assumed_capacity_ratio']}×. "
                      if fr else f"The {hero['display']['assumed_capacity_ratio']}× ratio compares the cohort with the {company['display']['assumed_capacity_ratio']}× company baseline. ")
            answer += definition["definition_fr" if fr else "definition_en"]
        elif "compression" in message:
            definition = next(item for item in snapshot["definitions"] if item["id"] == "pay_compression")
            answer = definition["definition_fr" if fr else "definition_en"]
            answer += (f" La cohorte compte {hero['pay_compression_exposure']} expositions synthétiques. Le résultat entreprise est indisponible, faute de couverture complète. Aucun salaire individuel n'est affiché."
                       if fr else f" The cohort has {hero['pay_compression_exposure']} synthetic exposures. The company result is unavailable because coverage is incomplete. No individual salary is displayed.")
        elif profile_question:
            answer = ("Quatre profils fictifs consentis, sans classement. Preuves professionnelles et lacunes :\n" if fr else "Four consented fictional profiles, without ranking. Job-related evidence and gaps:\n")
            answer += "\n".join(
                f"{item['display_name']} — {', '.join(item['skills'])}: {item['citations'][0]['passage']} "
                + ("À approfondir : " if fr else "Evidence gap: ") + ", ".join(item["gaps"])
                for item in snapshot["candidates"]
            )
            citations = [citation["document_id"] for item in snapshot["candidates"] for citation in item["citations"]]
        elif re.search(r"effectif|headcount|employ|collaborateur", message):
            answer = (f"La cohorte fictive compte {hero['headcount']} collaborateurs, sur {company['headcount']} dans l'entreprise synthétique. Les deux périmètres sont calculés à la même date."
                      if fr else f"The fictional cohort contains {hero['headcount']} employees, within a synthetic company of {company['headcount']}. Both scopes use the same reference date.")
        elif re.search(r"attrition|retention|r[ée]tention|fid[ée]l|d[ée]part", message):
            answer = (f"Les départs volontaires historiques représentent {hero['display']['attrition_percent']} % pour la cohorte, contre {company['display']['attrition_percent']} % pour l'entreprise synthétique. Ce constat agrégé ne prédit aucun départ individuel."
                      if fr else f"Historical voluntary attrition is {hero['display']['attrition_percent']}% in the cohort versus {company['display']['attrition_percent']}% in the synthetic company. This aggregate observation predicts no individual's departure.")
        elif re.search(r"dossier|case|backlog|sla|operations|op[ée]ration", message):
            answer = (f"{hero['overdue_cases']} dossiers synthétiques dépassent leur échéance : {hero['onboarding_cases']} intégrations, {hero['mobility_cases']} mobilités et {hero['payroll_cases']} dossiers de paie."
                      if fr else f"{hero['overdue_cases']} synthetic cases are overdue: {hero['onboarding_cases']} onboarding, {hero['mobility_cases']} mobility and {hero['payroll_cases']} payroll cases.")
        elif re.search(r"recruit|recrut|talent|candidat|hiring|postes|roles", message):
            answer = (f"{hero['critical_open_roles']} postes critiques sont ouverts. Le délai médian historique est de {hero['display']['median_time_to_fill_days']} jours, contre {company['display']['median_time_to_fill_days']} jours. Les quatre profils fictifs présentent des preuves et des lacunes, sans classement."
                      if fr else f"{hero['critical_open_roles']} critical roles are open. Historical median time to fill is {hero['display']['median_time_to_fill_days']} days versus {company['display']['median_time_to_fill_days']}. Four fictional profiles show evidence and gaps without ranking.")
        elif re.search(r"r[ée]sum|summari[sz]|situation|capacity challenge|probl[èe]me.*capacit|plan|sc[ée]nario", message):
            answer = (f"Sous les hypothèses synthétiques, fidéliser {option['retain']}, recruter {option['hire']} et redéployer {option['redeploy']} ramène l'écart de {option['gross_gap_milli']/1000:g} à {option['residual_gap_milli']/1000:g} ETP-mois pour {option['cost_eur_cents']/100:,.0f} €, dans un budget de {option['budget_eur_cents']/100:,.0f} €. C'est un scénario à examiner, pas un résultat acquis."
                      if fr else f"Under synthetic assumptions, retain {option['retain']}, hire {option['hire']} and redeploy {option['redeploy']} reduces the gap from {option['gross_gap_milli']/1000:g} to {option['residual_gap_milli']/1000:g} FTE-months at €{option['cost_eur_cents']/100:,.0f}, within a €{option['budget_eur_cents']/100:,.0f} budget. This is a scenario for review, not an achieved outcome.")
            answer = ((f"La cohorte fictive de {hero['headcount']} collaborateurs présente {hero['critical_open_roles']} postes critiques et {hero['overdue_cases']} dossiers hors délai. "
                       if fr else f"The fictional cohort of {hero['headcount']} employees has {hero['critical_open_roles']} critical open roles and {hero['overdue_cases']} overdue cases. ") + answer)
        else:
            supported = False
            citations = []
            answer = ("Cette question n'est pas couverte par les réponses de référence disponibles. Je peux expliquer les effectifs, l'attrition, les postes, les dossiers, la compression salariale, le ratio de capacité, les preuves des profils et les trois options."
                      if fr else "This question is not covered by the available reference answers. I can explain headcount, attrition, roles, cases, pay compression, the capacity ratio, profile evidence and the three options.")
    with action_store(client) as store:
        store.audit(actor, "assistant_reference", "denied" if refused else "answered" if supported else "unsupported",
                    "Cited synthetic SQL reference; no tool execution; persona preview has no permissions")
    return AssistantOut(answer=answer, citations=[] if refused else citations,
                        engine="cited_sql_reference", refused=refused,
                        next_action=next_action(body.message, body.language, refused))


@router.post("/genie/ask", operation_id="askGenie")
def genie_question(body: GenieQuestionIn, actor: Actor, client: Dependencies.Client):
    require_permission(actor, "aggregate:read")
    with action_store(client) as store:
        if body.conversation_id:
            _, records = store.read(actor)
            owned = any(r["action"] == "genie_question" and r["outcome"] == "answered"
                        and json.loads(r["detail"]).get("conversation_id") == body.conversation_id for r in records)
            if not owned:
                raise HTTPException(403, "Conversation unavailable for this session; start a new conversation")
        store.audit(actor, "genie_question", "requested", json.dumps({"question_sha256": digest(body.message), "language": body.language}))
        try:
            result = ask_genie(client, body.message, body.language, body.conversation_id)
        except Exception:
            store.audit(actor, "genie_question", "unavailable", "Native Genie request did not produce an available answer")
            raise HTTPException(503, "Genie is temporarily unavailable. Retry or start a new conversation.") from None
        result["audit_id"] = store.audit(actor, "genie_question", "answered", json.dumps({
            "conversation_id": result["conversation_id"], "message_id": result["message_id"],
            "answer_sha256": digest(result["answer"]), "citations": result["citations"]}, sort_keys=True))
        return result
