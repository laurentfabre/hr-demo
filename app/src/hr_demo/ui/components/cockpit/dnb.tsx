import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, Check, ChevronRight, Database, GitBranch, LoaderCircle, Network, Search, Send, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { usePreferences } from "./context";
import { Markdown } from "./markdown";
import { LoadingBar } from "./loading-bar";
import "@/styles/dnb.css";

type Domain = "workforce" | "talent" | "retention" | "operations";
type Agent = Domain | "supervisor";
type Localized = { fr: string; en: string };
type UseCase = { id: string; order: number; domain: Domain; title: Localized; question: Localized; research_tier: string };
type Catalog = { use_cases: UseCase[]; scenarios: string[]; regions: string[]; months: string[];
  specialists: { id: Domain; title: Localized; configured: boolean }[]; supervisor_configured: boolean };
type Answer = { answer: string; engine: string; audit_id: string; generated_at: string; citations: string[];
  conversation_id: string | null; queries: { sql: string; statement_id: string }[];
  delegations: { agent: Domain; status: string; call_id: string; result?: string; configured_sources?: string[] }[] };
type Turn = { question: string; agent: Agent; scope: string; answer?: Answer; error?: boolean };

export function DnbPage() {
  const { language, t } = usePreferences();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [reload, setReload] = useState(0);
  const [scenario, setScenario] = useState("baseline");
  const [region, setRegion] = useState("ALL");
  const [month, setMonth] = useState("2026-06-01");
  const [domain, setDomain] = useState<Domain | "all">("all");
  const [search, setSearch] = useState("");
  const [agent, setAgent] = useState<Agent>("supervisor");
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const pending = useRef(false);
  const conversations = useRef<Record<string, string>>({});
  const conversationPane = useRef<HTMLElement>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    const control = new AbortController(); setCatalogError(false);
    fetch("/api/dnb/catalog", { signal: control.signal }).then(async response => {
      if (!response.ok) throw new Error("catalog");
      const value = await response.json() as Catalog;
      if (value.use_cases?.length !== 20) throw new Error("catalog");
      setCatalog(value);
    }).catch(() => { if (!control.signal.aborted) setCatalogError(true); });
    return () => control.abort();
  }, [reload]);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => setElapsed(value => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [busy]);
  function name(value: Agent) { return value === "supervisor" ? "Supervisor" : catalog?.specialists.find(s => s.id === value)?.title[language] || value; }
  function scenarioName(value: string) { return value === "baseline" ? t("Croissance de référence", "Baseline growth") : value === "hiring_surge" ? t("Accélération des recrutements", "Hiring surge") : t("Croissance équilibrée", "Balanced growth"); }
  const scope = `${scenario} · ${region} · ${month.slice(0, 7)}`;
  async function ask(text: string, target: Agent = agent) {
    if (!text.trim() || pending.current || !catalog) return;
    const configured = target === "supervisor" ? catalog.supervisor_configured : catalog.specialists.find(s => s.id === target)?.configured;
    if (!configured) return;
    pending.current = true; setBusy(true); setElapsed(0); setAgent(target); setQuestion("");
    const turn: Turn = { question: text, agent: target, scope };
    setTurns(items => [...items, turn]);
    const key = `${target}:${scope}`;
    const control = new AbortController(); request.current = control;
    const timer = window.setTimeout(() => control.abort(), 215000);
    conversationPane.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    try {
      const response = await fetch("/api/dnb/ask", { method: "POST", headers: { "Content-Type": "application/json" }, signal: control.signal,
        body: JSON.stringify({ message: text, language, agent: target, scenario, region, month,
          conversation_id: target === "supervisor" ? null : conversations.current[key] || null }) });
      if (!response.ok) throw new Error("unavailable");
      const answer = await response.json() as Answer;
      if (answer.conversation_id) conversations.current[key] = answer.conversation_id;
      setTurns(items => [...items.slice(0, -1), { ...turn, answer }]);
    } catch {
      delete conversations.current[key];
      setTurns(items => [...items.slice(0, -1), { ...turn, error: true }]);
    } finally { window.clearTimeout(timer); pending.current = false; setBusy(false); }
  }
  if (catalogError) return <section className="dnb-error" role="alert"><h1>{t("L’espace DNB est indisponible", "DNB workspace unavailable")}</h1><p>{t("Votre session autorisée est nécessaire pour accéder au catalogue et aux agents.", "An authorized session is required for the catalog and agents.")}</p><button className="primary-button" onClick={() => setReload(n => n + 1)}>{t("Réessayer", "Retry")}</button></section>;
  if (!catalog) return <div className="dnb-loading" role="status"><LoaderCircle size={24}/>{t("Chargement des 20 cas d’usage DNB…", "Loading the 20 DNB use cases…")}</div>;
  const filtered = catalog.use_cases.filter(c => (domain === "all" || c.domain === domain) && `${c.title[language]} ${c.question[language]} ${c.id}`.toLowerCase().includes(search.toLowerCase()));
  const activeDelegations = turns.at(-1)?.answer?.delegations.map(d => d.agent) || [];
  return <div className="dnb-page" data-test-id="dnb-workspace">
    <div className="dnb-eyebrow"><span><span className="dnb-dot"/> DIGITAL NATIVE BUSINESSES</span><span>AMER · EMEA · APJ</span></div>
    <section className="dnb-hero">
      <div><span className="dnb-kicker">PEOPLE INTELLIGENCE / AGENT WORKSPACE</span><h1>{t("20 questions RH.", "20 HR questions.")}<br/><em>{t("Une équipe d’agents.", "One team of agents.")}</em></h1><p>{t("Des priorités éclairées par Logfood. Quatre Genie Agents dédiés. Un Supervisor pour relier les réponses et préparer votre prochaine décision.", "Priorities informed by Logfood. Four dedicated Genie Agents. A Supervisor to connect the answers and prepare your next decision.")}</p>
        <div className="dnb-hero-actions"><a className="studio-primary" href="#dnb-cases">{t("Explorer les 20 cas", "Explore all 20")}<ArrowDown size={15}/></a><button className="studio-quiet" disabled={busy || !catalog.supervisor_configured} data-test-id="dnb-cross-domain" onClick={() => void ask(t("Compare pour Engineering dans le périmètre sélectionné l’écart de capacité, le délai moyen de recrutement, l’attrition mensuelle et les dossiers RH hors délai. Interroge les quatre spécialistes et propose les questions à examiner ensemble, sans inventer de causalité.", "For Engineering in the selected scope, compare capacity gap, average time to fill, monthly attrition and overdue HR cases. Consult all four specialists and suggest questions to review together, without inventing causality."), "supervisor")}>{t("Poser une question transverse", "Ask across domains")}<GitBranch size={15}/></button></div>
        <small>{t("Données synthétiques · Lecture seule · Décisions humaines", "Synthetic data · Read only · Human decisions")}</small>
      </div>
      <div className="dnb-network" aria-label={t("Supervisor et quatre agents dédiés", "Supervisor and four dedicated agents")}>
        <button className={`dnb-supervisor-node ${agent === "supervisor" ? "selected" : ""}`} disabled={busy} onClick={() => setAgent("supervisor")}><span className="dnb-node-icon"><Network size={23}/></span><span><strong>Supervisor</strong><small>{t("Orchestre les spécialistes", "Orchestrates the specialists")}</small></span><span className="dnb-node-state">{catalog.supervisor_configured ? t("CONNECTÉ", "CONNECTED") : t("NON CONFIGURÉ", "NOT CONFIGURED")}</span></button>
        <div className="dnb-connectors" aria-hidden="true"><i/><i/><i/><i/></div>
        <div className="dnb-specialist-grid">{catalog.specialists.map(s => <button key={s.id} data-test-id={`dnb-agent-${s.id}`} disabled={busy} className={`dnb-specialist ${agent === s.id ? "selected" : ""} ${activeDelegations.includes(s.id) ? "observed" : ""}`} onClick={() => setAgent(s.id)}><Sparkles size={17}/><strong>{s.title[language]}</strong><small>{activeDelegations.includes(s.id) ? <><Check size={11}/>{t("Réponse reçue", "Response received")}</> : s.configured ? "Genie Agent" : t("Non configuré", "Not configured")}</small></button>)}</div>
        <div className="dnb-foundation"><Database size={14}/>{t("4 Metric Views gouvernées · Unity Catalog", "4 governed Metric Views · Unity Catalog")}</div>
      </div>
    </section>
    <section className="dnb-controls" aria-label={t("Personnaliser les requêtes", "Customize live queries")}>
      <div><strong>{t("Votre terrain de jeu", "Your exploration scope")}</strong><small>{t("Ces filtres s’appliquent aux requêtes des agents.", "These filters apply to the agents’ queries.")}</small></div>
      <label>{t("Scénario fictif", "Fictional scenario")}<select data-test-id="dnb-scenario" value={scenario} disabled={busy} onChange={e => setScenario(e.target.value)}>{catalog.scenarios.map(s => <option key={s} value={s}>{scenarioName(s)}</option>)}</select></label>
      <label>{t("Région", "Region")}<select data-test-id="dnb-region" value={region} disabled={busy} onChange={e => setRegion(e.target.value)}><option value="ALL">{t("Monde", "Worldwide")}</option>{catalog.regions.map(r => <option key={r}>{r}</option>)}</select></label>
      <label>{t("Mois de référence", "Reference month")}<select data-test-id="dnb-month" value={month} disabled={busy} onChange={e => setMonth(e.target.value)}>{catalog.months.map(m => <option key={m} value={m}>{new Date(m).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}</option>)}</select></label>
    </section>
    <p className="dnb-scope-note">{t("Scénarios = mondes fictifs alternatifs, pas des effets d’intervention mesurés. Les chiffres du cockpit historique restent séparés.", "Scenarios are alternate fictional worlds, not measured intervention effects. Historical cockpit figures remain separate.")}</p>
    <section className="dnb-chat" ref={conversationPane} data-test-id="dnb-chat">
      <LoadingBar active={busy} label={t("Les agents analysent les données", "Agents are analyzing the data")}/>
      <div className="dnb-chat-heading"><span className="dnb-chat-icon"><Sparkles size={20}/></span><div><h2>{t("De la question à la preuve", "From question to evidence")}</h2><p>{t("Réponses générées en direct, avec sources et trace d’exécution.", "Live-generated answers with sources and execution trace.")}</p></div><button className="secondary-button" disabled={busy} onClick={() => { conversations.current = {}; setTurns([]); }}>{t("Nouvelle conversation", "New conversation")}</button></div>
      <div className="dnb-turns" role="log" aria-live="polite">{turns.map((turn, i) => <article key={i} className="dnb-turn"><div className="dnb-turn-meta"><strong>{name(turn.agent)}</strong><code>{turn.scope}</code></div><h3>{turn.question}</h3>{turn.answer && <div data-test-id="dnb-answer"><div className="dnb-trace" data-test-id="dnb-delegation">{turn.answer.delegations.map((d, j) => <span key={j}><Check size={12}/>{name(d.agent)}</span>)}<small>{turn.answer.engine === "live_supervisor" ? t("Délégations observées", "Observed delegations") : t("Requête Genie en direct", "Live Genie query")}</small></div><Markdown>{turn.answer.answer}</Markdown><details className="genie-provenance"><summary>{t("Inspecter les sources et l’exécution", "Inspect sources and execution")}</summary>{turn.answer.citations.map(c => <p key={c}><code>{c}</code></p>)}{turn.answer.queries.map(q => <div key={q.statement_id}><small>{q.statement_id}</small><pre><code>{q.sql}</code></pre></div>)}{turn.answer.delegations.filter(d => d.result).map((d,j) => <details key={j}><summary>{t("Résultat du spécialiste", "Specialist result")}: {name(d.agent)}</summary><Markdown>{d.result!}</Markdown></details>)}<p>{t("Identité d’exécution : principal de service de l’application. Les personas n’ajoutent aucun droit.", "Execution identity: application service principal. Personas grant no additional permissions.")}</p><small>Audit: {turn.answer.audit_id} · {turn.answer.generated_at}</small></details><div className="dnb-human-review"><Check size={14}/>{t("À vérifier avec les responsables RH avant toute décision. Aucune action RH exécutée.", "Review with HR owners before any decision. No HR action was executed.")}</div></div>}{turn.error && <div role="alert" className="dnb-request-error"><p>{t("L’agent n’a pas pu répondre. Aucune ancienne réponse n’a été substituée. Vérifiez le périmètre puis réessayez.", "The agent could not answer. No historical answer was substituted. Check the scope and retry.")}</p><button className="secondary-button" disabled={busy} onClick={() => void ask(turn.question, turn.agent)}>{t("Réessayer dans le périmètre actuel", "Retry in the current scope")}</button></div>}</article>)}</div>
      {busy && <div className="genie-wait" role="status"><LoaderCircle size={21}/><span>{name(agent)} · {t("Consultation des données gouvernées…", "Querying governed data…")}<small>{elapsed}s · {t("Une question transverse peut prendre jusqu’à 3 minutes.", "A cross-domain question can take up to 3 minutes.")}</small></span></div>}
      <form className="dnb-composer" onSubmit={e => { e.preventDefault(); void ask(question); }}><label htmlFor="dnb-question">{t("Votre question", "Your question")}</label><textarea id="dnb-question" data-test-id="dnb-input" value={question} onChange={e => setQuestion(e.target.value)} maxLength={2000} rows={2} placeholder={t("Compare les tensions de capacité, de recrutement et de support RH…", "Compare capacity, hiring and employee support pressures…")}/><div><label className="dnb-agent-picker"><span>{t("Interroger", "Ask")}</span><select aria-label={t("Agent interrogé", "Selected agent")} value={agent} disabled={busy} onChange={e => setAgent(e.target.value as Agent)}><option value="supervisor">Supervisor</option>{catalog.specialists.map(s => <option key={s.id} value={s.id}>{s.title[language]}</option>)}</select></label><button className="primary-button" data-test-id="dnb-send" disabled={busy || !question.trim()}><Send size={15}/>{t("Envoyer", "Send")}</button></div></form>
      <small className="dnb-chat-note">{t("Genie conserve le contexte par spécialiste et périmètre. Chaque question au Supervisor lance une nouvelle analyse.", "Genie keeps context per specialist and scope. Each Supervisor question starts a new analysis.")}</small>
    </section>
    <section id="dnb-cases" className="dnb-catalog"><div className="dnb-section-heading"><div><span className="dnb-kicker">THE DNB HR 20</span><h2>{t("Choisissez votre prochaine question.", "Choose your next question.")}</h2><p>{t("Chaque carte ouvre un vrai parcours de données avec son agent dédié.", "Every card starts a real data conversation with its dedicated agent.")}</p></div><label className="dnb-search"><Search size={16}/><span className="sr-only">{t("Rechercher un cas d’usage", "Search use cases")}</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("Rechercher…", "Search…")}/></label></div>
      <div className="dnb-domain-tabs" aria-label={t("Filtrer par domaine", "Filter by domain")}><button aria-pressed={domain === "all"} onClick={() => setDomain("all")}>{t("Tous les cas", "All use cases")}<span>20</span></button>{catalog.specialists.map(s => <button key={s.id} aria-pressed={domain === s.id} onClick={() => setDomain(s.id)}>{s.title[language]}<span>5</span></button>)}</div>
      <div className="dnb-case-grid">{filtered.map(c => <article className={`dnb-case dnb-case-${c.domain}`} key={c.id} data-test-id={`dnb-case-${c.id}`}><div className="dnb-card-top"><span>{String(c.order).padStart(2,"0")}</span><small>{name(c.domain)}</small></div><h3>{c.title[language]}</h3><p>{c.question[language]}</p><small className="dnb-evidence-tier">{c.research_tier === "field_theme" ? t("Logfood · thème terrain", "Logfood · field theme") : c.research_tier === "editorial" ? t("Extension éditoriale", "Editorial extension") : t("Adaptation d’un thème terrain", "Field-theme adaptation")}</small><div className="dnb-card-actions"><button disabled={busy} data-test-id={`dnb-ask-${c.id}`} onClick={() => void ask(c.question[language],c.domain)}><Sparkles size={14}/>{t("Agent dédié", "Dedicated agent")}<ArrowUpRight size={14}/></button><button disabled={busy} aria-label={`${t("Interroger le Supervisor", "Ask Supervisor")} · ${c.title[language]}`} onClick={() => void ask(c.question[language],"supervisor")}><Network size={15}/><ChevronRight size={13}/></button></div></article>)}</div>
      {filtered.length === 0 && <p>{t("Aucun cas ne correspond à votre recherche.", "No use case matches your search.")}</p>}
    </section>
    <details className="dnb-research"><summary>{t("La recherche Logfood : méthode et limites", "Logfood research: method and limitations")}</summary><p>{t("Périmètre : Digital Native Businesses monde, avec AMER, EMEA et APJ séparés. Segmentation issue du référentiel de comptes, pas d’un raccourci par secteur. Sélection éditoriale de 20 questions à partir des signaux RH et des impératifs terrain ; ce ne sont pas les 20 premières lignes d’un classement mesuré. Les descriptions commerciales ne prouvent ni une mise en production ni un résultat client.", "Scope: Digital Native Businesses worldwide, with AMER, EMEA and APJ separated. Segmentation uses the account reference, not an industry shortcut. These 20 questions are an editorial selection from HR field signals and imperative themes, not the top 20 rows of a measured ranking. Sales descriptions establish neither production deployment nor customer outcomes.")}</p><p>{t("Les dossiers de recherche internes restent hors de l’application. Les données interrogées ici sont entièrement synthétiques, avec définitions de métriques explicites et aucune connexion à un SIRH client.", "Internal research records stay outside the application. Data queried here is entirely synthetic, with explicit metric definitions and no connection to a customer HR system.")}</p></details>
    <footer className="dnb-footer"><span>RESEARCH → METRICS → GENIE → SUPERVISOR → HUMAN REVIEW</span><Link to="/briefing">{t("Ouvrir le cockpit historique", "Open historical cockpit")}<ArrowUpRight size={13}/></Link></footer>
  </div>;
}
