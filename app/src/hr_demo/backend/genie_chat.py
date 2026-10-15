"""Live questions to the configured aggregate Genie Agent; no action tools."""
from datetime import timedelta
import os
import re

from .agents import source_tables


def next_action(question: str, language: str, refused: bool = False) -> dict:
    fr = language == "fr"
    q = question.casefold()
    if refused:
        values = ("/trust", "Vérifier le périmètre autorisé", "Review the authorized scope",
                  "Revenir aux données agrégées et aux règles d’accès.", "Return to aggregate data and access rules.",
                  "Quels indicateurs agrégés sont disponibles ?", "Which aggregate metrics are available?")
    elif re.search(r"attrition|retention|rétention|compression", q):
        values = ("/retention", "Examiner les signaux collectifs", "Review collective signals",
                  "Définir les questions de soutien à discuter avec les équipes.", "Identify support questions to discuss with teams.",
                  "Compare les taux d’attrition historiques de la cohorte et de l’entreprise.", "Compare historical attrition rates for the cohort and company.")
    elif re.search(r"case|dossier|sla|onboarding|paie|payroll", q):
        values = ("/people-ops", "Examiner les dossiers hors délai", "Review overdue cases",
                  "Préparer une priorisation humaine des six dossiers fictifs.", "Prepare a human review of the six fictional overdue cases.",
                  "Combien de dossiers hors délai concernent l’intégration, la mobilité et la paie ?", "How many overdue cases concern onboarding, mobility and payroll?")
    elif re.search(r"recruit|recrut|talent|hiring|vacanc|poste|candidate|profil", q):
        values = ("/talent", "Examiner les besoins et les preuves", "Review hiring needs and evidence",
                  "Comparer les exigences des postes aux preuves disponibles, sans classement.", "Compare role requirements with available evidence, without ranking.",
                  "Quels sont les postes critiques ouverts et le délai médian de recrutement ?", "What are the critical open roles and median time to fill?")
    else:
        values = ("/workforce", "Comparer les scénarios", "Compare scenarios",
                  "Examiner le coût et le besoin résiduel avant toute décision humaine.", "Review costs and residual capacity gaps before a human decision.",
                  "Compare les trois options avec leur coût et leur écart résiduel en ETP-mois.", "Compare the three options with cost and residual gap in FTE-months.")
    return {"route": values[0], "label": values[1 if fr else 2], "reason": values[3 if fr else 4],
            "question": values[5 if fr else 6]}


def ask_genie(client, question: str, language: str, conversation_id: str | None = None,
              *, configured_space: str | None = None, source_scope: list[str] | None = None,
              scoped_prompt: str | None = None) -> dict:
    space = configured_space or os.environ.get("HR_DEMO_GENIE_SPACE_ID", "")
    if not space:
        raise ValueError("Genie is not configured")
    prompt = ("HR Demo — synthetic aggregate data, frozen 2026-09-14. Answer in "
              + ("French" if language == "fr" else "English")
              + ". Use Markdown, concise explanation and a compact result table. Query only the configured "
              "aggregate Genie tables. Default to Care Coordination Platform (hero), within company; scopes overlap. "
              "Do not provide individual risk, salaries, candidate ranking or execute employment actions. "
              "Capacity scenarios are assumptions, not predictions or achieved results. If unsupported, explain why. "
              "For attrition use the provided attrition_percent, not exits/current headcount. "
              "Question: " + question)
    if scoped_prompt is not None:
        prompt = scoped_prompt
    args = dict(space_id=space, content=prompt, timeout=timedelta(seconds=100))
    if conversation_id:
        message = client.genie.create_message_and_wait(conversation_id=conversation_id, **args)
    else:
        message = client.genie.start_conversation_and_wait(**args)
    raw = message.as_dict()
    if raw.get("status") != "COMPLETED":
        raise ValueError("Genie did not complete")
    parts, citations, queries = [], set(), []
    for attachment in raw.get("attachments", []):
        if attachment.get("text", {}).get("content"):
            parts.append(attachment["text"]["content"])
        query = attachment.get("query")
        if not query:
            continue
        sql = query.get("query", "")
        references = set(re.findall(r"\b([A-Za-z0-9_]+\.[A-Za-z0-9_]+\.[A-Za-z0-9_]+)\b", sql.replace("`", "")))
        if not references or not references.issubset(set(source_scope if source_scope is not None else source_tables())):
            raise ValueError("Query source outside configured aggregate scope")
        result = client.genie.get_message_attachment_query_result(space, raw["conversation_id"], raw["id"], attachment["attachment_id"]).as_dict()
        statement = result["statement_response"]
        if statement.get("status", {}).get("state") != "SUCCEEDED":
            raise ValueError("Genie query did not succeed")
        columns = [c["name"] for c in statement["manifest"]["schema"]["columns"]]
        rows = statement.get("result", {}).get("data_array", [])
        def cell(value):
            if value is None:
                return "Indisponible" if language == "fr" else "Unavailable"
            return str(value).replace("\\", "\\\\").replace("|", "\\|").replace("\n", " ").replace("\r", " ")
        table = "| " + " | ".join(map(cell, columns)) + " |\n| " + " | ".join("---" for _ in columns) + " |\n"
        table += "\n".join("| " + " | ".join(map(cell, row)) + " |" for row in rows[:50])
        parts.append((query.get("description") or "") + "\n\n" + table)
        if len(rows) > 50 or statement["manifest"].get("truncated") or statement["manifest"].get("total_row_count", len(rows)) > len(rows):
            parts.append("Résultats partiels : 50 lignes au maximum." if language == "fr" else "Partial results: at most 50 rows shown.")
        citations.update(references)
        queries.append({"sql": sql, "statement_id": statement.get("statement_id"), "attachment_id": attachment["attachment_id"],
                        "columns": columns, "rows": rows[:50]})
    answer = "\n\n".join(parts).strip()
    if not answer:
        raise ValueError("Genie returned no answer")
    return {"answer": answer, "conversation_id": raw["conversation_id"], "message_id": raw["id"],
            "citations": sorted(citations), "queries": queries, "engine": "live_genie", "refused": False,
            "next_action": next_action(question, language)}
