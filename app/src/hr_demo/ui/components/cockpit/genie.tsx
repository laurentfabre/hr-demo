import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUp, ArrowUpRight, RotateCcw, Sparkles } from "lucide-react";
import type { PagePath } from "@/lib/cockpit-types";
import { usePreferences } from "./context";
import { Markdown } from "./markdown";
import { LoadingBar } from "./loading-bar";

type NextAction = { label: string; reason: string; route: string; question: string };
type Answer = { answer: string; conversation_id: string; message_id: string; citations: string[];
  audit_id: string; queries: { sql: string; statement_id: string }[]; next_action: NextAction };
type Turn = { question: string; answer?: Answer; error?: string };

export function GenieConversation() {
  const { language, t } = usePreferences();
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const conversation = useRef<string | null>(null);
  async function ask(text: string) {
    if (!text.trim() || pending.current) return;
    pending.current = true; setBusy(true); setQuestion("");
    setTurns(items => [...items, { question: text }]);
    try {
      const response = await fetch("/api/genie/ask", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, language, conversation_id: conversation.current }), signal: AbortSignal.timeout(115000) });
      if (!response.ok) throw new Error("unavailable");
      const answer = await response.json() as Answer;
      conversation.current = answer.conversation_id;
      setTurns(items => [...items.slice(0, -1), { question: text, answer }]);
    } catch {
      conversation.current = null;
      setTurns(items => [...items.slice(0, -1), { question: text, error: t("Genie est indisponible pour cette question. Réessayez ; les indicateurs du cockpit restent accessibles.", "Genie is unavailable for this question. Retry; cockpit metrics remain available.") }]);
    } finally { pending.current = false; setBusy(false); }
  }
  return <section className="genie-conversation" data-test-id="genie-agent" data-tour="ask-prompts">
    <LoadingBar active={busy} label={t("Genie prépare la réponse", "Genie is preparing the answer")}/>
    <header className="genie-toolbar"><span><Sparkles size={18}/> {t("Interroger les données avec Genie", "Ask your data with Genie")}</span><button className="secondary-button" disabled={busy} onClick={() => { setTurns([]); conversation.current = null; }}><RotateCcw size={14}/>{t("Nouvelle conversation", "New conversation")}</button></header>
    <p className="genie-disclosure">{t("Genie interroge les données agrégées synthétiques en direct. Réponse générée par IA à vérifier ; toute décision exige une validation humaine.", "Genie queries synthetic aggregate data live. Check AI-generated answers; every decision requires human approval.")}</p>
    {turns.length === 0 && <div className="ask-prompt-grid">{[
      t("Compare les trois options et leur coût.", "Compare the three options and their costs."),
      t("Quels dossiers RH sont hors délai ?", "Which HR cases are overdue?"),
      t("Quel est le problème de capacité du collectif ?", "What is the cohort’s capacity challenge?"),
      t("Explique le ratio de capacité 1,8×.", "Explain the 1.8× capacity ratio."),
    ].map(text => <button key={text} disabled={busy} onClick={() => void ask(text)}>{text}<ArrowUpRight size={16}/></button>)}</div>}
    <div role="log" aria-live="polite" className="genie-turns">{turns.map((turn, index) => <article key={index} className="genie-turn">
      <p className="genie-user-question">{turn.question}</p>
      {turn.answer && <div data-test-id="genie-answer"><Markdown>{turn.answer.answer}</Markdown>
        <details className="genie-provenance"><summary>{t("Sources et requêtes exécutées", "Sources and executed queries")}</summary>
          <ul>{turn.answer.citations.map(source => <li key={source}>{source}</li>)}</ul>
          {turn.answer.queries.map(query => <pre key={query.statement_id}><code>{query.sql}</code></pre>)}
          <small>{t("Trace d’audit", "Audit record")}: {turn.answer.audit_id}</small></details>
        <div className="genie-next-action" data-test-id="genie-next-action"><strong>{t("Prochaine action recommandée", "Suggested next action")}</strong><p>{turn.answer.next_action.reason}</p>
          <Link to={turn.answer.next_action.route as PagePath} className="primary-button">{turn.answer.next_action.label}<ArrowUpRight size={14}/></Link>
          <button disabled={busy} className="secondary-button" onClick={() => void ask(turn.answer!.next_action.question)}>{t("Approfondir avec Genie", "Explore further with Genie")}</button></div>
      </div>}
      {turn.error && <div role="alert"><p>{turn.error}</p><button className="secondary-button" onClick={() => void ask(turn.question)} disabled={busy}>{t("Réessayer avec Genie", "Retry with Genie")}</button></div>}
    </article>)}</div>
    {busy && <div role="status" className="genie-wait" data-test-id="genie-loading-message"><span className="genie-wait-orbit" aria-hidden="true"><Sparkles size={18}/></span><p>{t("Genie consulte les tables et exécute sa requête…", "Genie is reading the tables and running its query…")}<small>{t("Cela peut prendre une minute.", "This may take a minute.")}</small></p><span className="genie-wait-dots" aria-hidden="true"><i/><i/><i/></span></div>}
    <form className="genie-composer" onSubmit={event => { event.preventDefault(); void ask(question); }}><label htmlFor="genie-question">{t("Votre question à Genie", "Your question for Genie")}</label><textarea id="genie-question" data-test-id="genie-input" value={question} onChange={event => setQuestion(event.target.value)} rows={3} maxLength={2000} placeholder={t("Posez une question ou approfondissez la réponse…", "Ask a question or follow up on the answer…")}/><button className="primary-button" data-test-id="genie-send" disabled={busy || !question.trim()}><ArrowUp size={16}/>{t("Demander à Genie", "Ask Genie")}</button></form>
  </section>;
}
