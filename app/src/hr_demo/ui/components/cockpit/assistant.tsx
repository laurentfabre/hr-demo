import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowUp, BookOpen, ChevronRight, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAskAssistant } from "@/lib/api";
import { requestError } from "@/lib/cockpit-errors";
import { personas } from "@/lib/cockpit-types";
import { useCockpit, usePreferences } from "./context";
import { Markdown } from "./markdown";
import { LoadingBar } from "./loading-bar";
import type { PagePath } from "@/lib/cockpit-types";

interface NextAction { label: string; reason: string; route: string; question: string }
interface Message { id: number; role: "user" | "assistant"; text: string; citations?: string[]; engine?: string; refused?: boolean; error?: boolean; next_action?: NextAction }
interface AssistantAnswer { answer: string; citations: string[]; engine: string; refused: boolean; next_action: NextAction }

export function AssistantDock() {
  const data = useCockpit();
  const { language, persona, t, openSources } = usePreferences();
  const { pathname } = useLocation();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const pending = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const mutation = useAskAssistant();
  const client = useQueryClient();
  const submit = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || pending.current) return;
    pending.current = true;
    setMessage("");
    setMessages(items => [...items, { id: Date.now(), role: "user", text: trimmed }]);
    try {
      const response = await mutation.mutateAsync({ message: trimmed, route: pathname, preview_persona: persona, language });
      const answer = response.data as unknown as AssistantAnswer;
      if (typeof answer.answer !== "string" || !Array.isArray(answer.citations)) throw new Error("Invalid assistant response");
      setMessages(items => [...items, { id: Date.now(), role: "assistant", text: answer.answer, citations: answer.citations, engine: answer.engine, refused: answer.refused, next_action: answer.next_action }]);
    } catch (error) {
      setMessages(items => [...items, { id: Date.now(), role: "assistant", text: requestError(error), error: true }]);
    } finally {
      pending.current = false;
      await client.invalidateQueries();
    }
  }, [mutation.mutateAsync, pathname, persona, language, client]);
  useEffect(() => {
    const listener = (event: Event) => { const detail = (event as CustomEvent<unknown>).detail; if (typeof detail === "string") void submit(detail); };
    window.addEventListener("hr-demo:ask", listener);
    return () => window.removeEventListener("hr-demo:ask", listener);
  }, [submit]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, mutation.isPending]);
  const prompts = pathname === "/retention" ? [t("Explique l’attrition du collectif.", "Explain the cohort’s attrition."), t("Que signifie la compression salariale ?", "What does pay compression mean?")] : pathname === "/talent" ? [t("Quelles preuves sont disponibles pour les profils ?", "What profile evidence is available?"), t("Quels sont les postes critiques ?", "What are the critical open roles?")] : [t("Résume la situation du collectif.", "Summarise the cohort’s situation."), t("Compare les options de capacité.", "Compare the capacity options.")];
  return <div className="assistant-dock" data-tour="assistant"><header className="assistant-header"><span className="assistant-mark"><Sparkles size={18}/></span><div><h2>Assistant</h2><p>{t("Le contexte, à vos côtés", "Context by your side")}</p></div><button className="icon-button" aria-label={t("Effacer la conversation affichée", "Clear displayed conversation")} disabled={mutation.isPending} onClick={() => setMessages([])}><RotateCcw size={15}/></button></header><div className="assistant-context"><span className="context-dot"/><span>Care Coordination Platform<small>{data.reference.scopes.hero.headcount} {t("collaborateurs fictifs", "fictional employees")}</small></span><BookOpen size={14}/></div>
    <LoadingBar active={mutation.isPending} label={t("Préparation de la réponse", "Preparing the answer")}/>
    <div className="assistant-messages" role="log" aria-live="polite" aria-relevant="additions text">
      {messages.length === 0 && <div className="assistant-welcome"><div className="assistant-welcome-spark"><Sparkles size={25}/></div><h3>{t(`Bonjour ${personas[persona].name}.`, `Hello ${personas[persona].name}.`)}</h3><p>{t("Relions les signaux à votre prochaine décision.", "Connect the signals to your next decision.")}</p><div className="assistant-prompts">{prompts.map(prompt => <button key={prompt} onClick={() => void submit(prompt)} data-test-id="assistant-suggestion">{prompt}<ChevronRight size={14}/></button>)}</div><div className="assistant-capability-note"><ShieldCheck size={15}/><p>{t("Réponses sourcées. Décisions humaines.", "Sourced answers. Human decisions.")}</p></div></div>}
      {messages.map((item, index) => <div key={`${item.id}-${index}`} className={`chat-message ${item.role} ${item.error || item.refused ? "chat-refusal" : ""}`} data-test-id={`assistant-${item.role}`}><div className="chat-role">{item.role === "assistant" ? <><Sparkles size={12}/>Assistant</> : t("Vous", "You")}{item.refused && <span>{t("Limite appliquée", "Boundary enforced")}</span>}{item.error && <span>{t("Indisponible", "Unavailable")}</span>}</div>{item.role === "assistant" ? <Markdown>{item.text}</Markdown> : <p>{item.text}</p>}{item.citations && item.citations.length > 0 && <div className="chat-citations">{item.citations.map(citation => <button key={citation} onClick={() => openSources()} title={citation}><BookOpen size={11}/>{citation}</button>)}</div>}{item.next_action && <div className="genie-next-action"><strong>{t("Prochaine action recommandée", "Suggested next action")}</strong><p>{item.next_action.reason}</p><Link to={item.next_action.route as PagePath}>{item.next_action.label} →</Link></div>}{item.engine && <small className="chat-engine">{item.engine}</small>}</div>)}
      {mutation.isPending && <div className="assistant-thinking" role="status"><span/><span/><span/>{t("Consultation du contexte…", "Reading context…")}</div>}<div ref={endRef}/>
    </div>
    <div className="assistant-composer-wrap"><div className="assistant-mode"><span/>{data.capabilities.assistant_mode}</div><form className="assistant-composer" onSubmit={event => { event.preventDefault(); void submit(message); }}><label className="sr-only" htmlFor="assistant-question">{t("Votre question", "Your question")}</label><textarea id="assistant-question" data-test-id="assistant-input" value={message} onChange={event => setMessage(event.target.value)} placeholder={t("Posez votre question…", "Ask a question…")} maxLength={2000} rows={2} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(message); } }}/><div><span>{t("Entrée pour envoyer", "Enter to send")}</span><button type="submit" data-test-id="assistant-send" disabled={mutation.isPending || !message.trim()} aria-label={t("Envoyer la question", "Send question")}><ArrowUp size={17}/></button></div></form><p className="assistant-disclaimer">{t("Données synthétiques · aucune décision automatique", "Synthetic data · no automatic decisions")}</p></div>
  </div>;
}
