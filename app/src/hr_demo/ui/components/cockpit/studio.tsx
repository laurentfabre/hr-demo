import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUp, BookOpen, Check, ChevronLeft, ChevronRight, Download, FlaskConical, HeartHandshake, Library, Network, Play, RotateCcw, Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Upload, Users, X } from "lucide-react";
import { usePreferences } from "./context";
import { baseline, bounds, calculate, defaultConfig, domains, playbooks, presets, restoreConfig, researchLabels, researchSupport, STORAGE_KEY, validateConfig } from "@/lib/studio";
import type { Assumptions, Copy, Domain, StudioConfig } from "@/lib/studio";
import { numberLabel } from "@/lib/cockpit-types";

type Tab = "experience" | "library" | "configure";
const domainIcons = { workforce: Network, retention: HeartHandshake, talent: Users, operations: ShieldCheck };
const beats: Copy[] = [{ fr: "La question", en: "The question" }, { fr: "Les preuves", en: "The evidence" }, { fr: "Les options", en: "The options" }, { fr: "La confiance", en: "The trust" }, { fr: "La décision", en: "The decision" }];
function downloadFile(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function StudioPage() {
  const { language, t } = usePreferences();
  const [restored] = useState(restoreConfig);
  const [config, setConfig] = useState<StudioConfig>(restored.config);
  const [tab, setTab] = useState<Tab>("experience");
  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState<Domain | "all">("all");
  const [depth, setDepth] = useState("all");
  const [activeId, setActiveId] = useState(config.selected[0]);
  const [beat, setBeat] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [message, setMessage] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [importError, setImportError] = useState(false);
  const upload = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const active = playbooks.find(p => p.id === activeId) || playbooks[0];
  const preset = presets.find(p => p.id === config.preset) || presets[0];
  const result = calculate(config.assumptions);
  const local = (text: Copy) => text[language];
  const money = (value: number) => new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
  const number = (value: number) => numberLabel(value, language, 1);
  const selected = config.selected.map(id => playbooks.find(p => p.id === id)!);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [config]);
  useEffect(() => {
    if (!presenting) return;
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setPresenting(false); return; }
      if ((event.target as HTMLElement)?.closest("input, textarea, select, button, a, summary")) return;
      if (event.key === "ArrowRight") { event.preventDefault(); setBeat(value => Math.min(4, value + 1)); }
      if (event.key === "ArrowLeft") { event.preventDefault(); setBeat(value => Math.max(0, value - 1)); }
    };
    window.addEventListener("keydown", listener); return () => window.removeEventListener("keydown", listener);
  }, [presenting]);
  const changeAssumption = (key: keyof Assumptions, value: number) => {
    if (!Number.isFinite(value)) return;
    const [min, max] = bounds[key];
    setConfig(c => ({ ...c, assumptions: { ...c.assumptions, [key]: Math.max(min, Math.min(max, value)) } }));
  };
  const choosePreset = (id: string) => {
    const next = presets.find(p => p.id === id); if (!next) return;
    setConfig(c => ({ ...c, preset: next.id, organization: next.organization, assumptions: { ...next.assumptions } }));
    setMessage(t("Preset appliqué au laboratoire synthétique.", "Preset applied to the synthetic lab."));
  };
  const toggleSelected = (id: string) => {
    if (config.selected.includes(id) && config.selected.length === 1) { setMessage(t("Conservez au moins un cas d’usage.", "Keep at least one use case.")); return; }
    setConfig(c => ({ ...c, selected: c.selected.includes(id) ? c.selected.filter(value => value !== id) : [...c.selected, id] }));
  };
  const move = (index: number, offset: number) => {
    setConfig(c => { const list = [...c.selected]; [list[index], list[index + offset]] = [list[index + offset], list[index]]; return { ...c, selected: list }; });
  };
  const openPlaybook = (id: string) => { setActiveId(id); setBeat(0); setTab("experience"); window.scrollTo({ top: 0, behavior: "instant" }); };
  const exportBrief = () => {
    const a = config.assumptions;
    const lines = ["# HR Demo · " + config.organization, t("Données et hypothèses synthétiques. Aucun résultat client réalisé.", "Synthetic data and assumptions. No realised customer results."),
      `${local(preset.name)} · ${config.minutes} min · ${config.selected.length} ${t("cas d’usage", "use cases")}`,
      `## ${t("Laboratoire · horizon de six mois", "Scenario lab · six-month horizon")}`,
      `${t("Écart initial", "Initial gap")}: ${number(a.gap)} → ${number(result.residual)} ${t("ETP-mois", "FTE-months")}. ${t("Coût", "Cost")}: ${money(result.cost)} / ${money(a.budget)}.`,
      `${t("Fidéliser / recruter / mobiliser", "Retain / hire / redeploy")}: ${a.retain} / ${a.hire} / ${a.redeploy}.`,
      `${t("Coûts unitaires", "Unit costs")}: ${money(a.retainCost)} / ${money(a.hireCost)} / ${money(a.redeployCost)}.`,
      `${t("Gains unitaires hypothétiques en ETP-mois", "Hypothetical unit gains in FTE-months")}: ${a.retainGain} / ${a.hireGain} / ${a.redeployGain}.`,
      `${t("Objectif strict", "Strict target")}: < ${a.target}. ${t("Budget respecté", "Within budget")}: ${result.withinBudget}. ${t("Objectif atteint", "Target met")}: ${result.meetsTarget}.`,
      `## ${t("Parcours de présentation", "Presenter playlist")}`,
      ...selected.flatMap(p => [`### ${p.id} · ${local(p.title)}`, `1. ${local(p.question)}`, `2. ${local(p.proof)}`, `3. ${local(p.outcome)}`, `4. ${local(p.boundary)}`, `5. ${t("Valider le périmètre, les sources et un critère de succès en atelier.", "Validate scope, sources and a success criterion in a workshop.")}`,
        `${t("Profondeur", "Depth")}: ${p.depth === "cockpit" ? t("parcours du cockpit de référence", "reference cockpit path") : t("atelier exploratoire ; intégration non réalisée", "discovery workshop; integration not implemented")}.`,
        `${t("Produits proposés ; vérifier les connexions dans Confiance & sources", "Proposed products; inspect connections in Trust & sources")}: ${p.products.join(", ")}.`]),
      t("Ordre éditorial éclairé par la recherche du 29 septembre 2026, pas un classement d’adoption. Les presets n’altèrent pas les données du cockpit de référence.", "Editorial order informed by research on 29 Sep 2026, not measured adoption ranks. Presets do not alter reference cockpit data.")];
    downloadFile("hr-demo-presenter-brief.md", lines.join("\n\n"), "text/markdown;charset=utf-8");
    setMessage(t("Brief de présentation exporté.", "Presenter brief exported."));
  };
  const importConfig = async (file?: File) => {
    if (!file) return;
    setImportError(false);
    try {
      if (file.size > 32000) throw new Error("File too large");
      const next = validateConfig(JSON.parse(await file.text()));
      setConfig(next); setActiveId(next.selected[0]); setBeat(0);
      setMessage(t("Configuration importée. Hypothèses synthétiques uniquement.", "Configuration imported. Synthetic assumptions only."));
    } catch { setImportError(true); }
    finally { if (upload.current) upload.current.value = ""; }
  };
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filtered = playbooks.filter(p => (domain === "all" || p.domain === domain) && (depth === "all" || p.depth === depth) && normalize(`${p.id} ${p.title.fr} ${p.title.en} ${p.question.fr} ${p.question.en} ${p.sources.join(" ")} ${p.products.join(" ")}`).includes(normalize(search)));

  return <div className={`demo-studio ${presenting ? "is-presenting" : ""}`} data-section-id="studio" data-test-id="demo-studio">
    <div className="studio-topline"><span><span className="studio-status-dot"/>HR DEMO / STUDIO</span><span>{t("Imaginé pour la conversation. Configuré pour vous.", "Built for the conversation. Configured for you.")}</span></div>
    <section className="studio-hero">
      <div className="studio-hero-copy"><span className="studio-kicker"><Sparkles size={14}/>{t("VOTRE PROCHAINE DÉMONSTRATION", "YOUR NEXT DEMONSTRATION")}</span>
        <h1>{t("La stratégie People.", "People strategy.")}<br/><em>{t("Rendue tangible.", "Made tangible.")}</em></h1>
        <p>{t("Une question qui compte. Des preuves à explorer. Une décision à construire ensemble.", "A question that matters. Evidence to explore. A decision to build together.")}</p>
        <div className="studio-hero-actions"><button className="studio-primary" onClick={() => { openPlaybook(config.selected[0]); setPresenting(true); }}><Play size={15}/>{t("Présenter mon parcours", "Present my story")}<ArrowRight size={16}/></button><button className="studio-quiet" onClick={() => { setTab("configure"); setPresenting(false); }}><SlidersHorizontal size={15}/>{t("Personnaliser", "Customize")}</button></div>
        <span className="studio-hero-note">{t("20 playbooks · 4 domaines connectés · FR / EN", "20 playbooks · 4 connected domains · FR / EN")}</span>
      </div>
      <div className="studio-hero-visual" aria-label={t("Aperçu du laboratoire synthétique", "Synthetic lab preview")}>
        <div className="studio-visual-heading"><span><FlaskConical size={14}/>{t("HYPOTHÈSE / 6 MOIS", "HYPOTHESIS / 6 MONTHS")}</span><span>{t("SYNTHÉTIQUE", "SYNTHETIC")}</span></div>
        <h2>{config.organization}</h2><p>{local(preset.context)}</p>
        <div className="studio-visual-number"><span>{number(config.assumptions.gap)}</span><ArrowRight size={24}/><strong>{number(result.residual)}</strong><small>{t("ETP-mois d’écart", "FTE-month gap")}</small></div>
        <div className="studio-gap-track"><span style={{ width: `${result.recovered / config.assumptions.gap * 100}%` }}/></div>
        <div className="studio-visual-legend"><span>{t("Capacité récupérée (hyp.)", "Recovered capacity (hyp.)")} <b>{number(result.recovered)}</b></span><span>{t("Résiduel", "Residual")} <b>{number(result.residual)}</b></span></div>
        <div className="studio-visual-footer"><span>{money(result.cost)} <small>/ {money(config.assumptions.budget)}</small></span><span>{result.withinBudget ? t("Dans le budget", "Within budget") : t("Budget dépassé", "Over budget")}</span></div>
      </div>
    </section>
    <div className="studio-utility"><div className="studio-tabs" role="tablist" aria-label={t("Vues du studio", "Studio views")}>{(["experience", "library", "configure"] as const).map((item, index) => {
      const Icon = [Play, Library, Settings2][index];
      return <button ref={el => { tabRefs.current[index] = el; }} id={`studio-tab-${item}`} role="tab" aria-selected={tab === item} aria-controls={`studio-panel-${item}`} tabIndex={tab === item ? 0 : -1} key={item} onClick={() => { setTab(item); setPresenting(false); }} onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault(); const next = event.key === "Home" ? 0 : event.key === "End" ? 2 : (index + (event.key === "ArrowRight" ? 1 : 2)) % 3;
        setTab((["experience", "library", "configure"] as const)[next]); setPresenting(false); tabRefs.current[next]?.focus();
      }}><Icon size={15}/>{[t("L’expérience", "The experience"), t("Les 20 playbooks", "20 playbooks"), t("Mon studio", "My studio")][index]}</button>;
    })}</div><span className="studio-local-label">{t("Laboratoire local · données fictives", "Local lab · fictional data")}</span></div>
    <div className="studio-notices" aria-live="polite">{message && <p>{message}</p>}{(storageError || restored.warning) && <p>{t("Le stockage local est indisponible ou une ancienne configuration était invalide. Exportez votre configuration pour la conserver.", "Local storage is unavailable or a previous configuration was invalid. Export your configuration to keep it.")}</p>}</div>
    <div role="tabpanel" id={`studio-panel-${tab}`} aria-labelledby={`studio-tab-${tab}`} tabIndex={0}>
    {tab === "experience" && <>
      <div className="studio-section-heading"><div><span className="studio-kicker">{t("01 / L’HISTOIRE QUI RELIE TOUT", "01 / THE STORY THAT CONNECTS IT ALL")}</span><h2>{t("Du signal à une décision humaine.", "From a signal to a human decision.")}</h2></div><span className="studio-chip">{config.minutes} min · {selected.length} {t("cas choisis", "selected cases")}</span></div>
      <div className="studio-story-layout"><div className="studio-playlist"><h3>{t("Votre parcours", "Your playlist")}</h3>{selected.map((p, index) => <button key={p.id} aria-pressed={active.id === p.id} onClick={() => { setActiveId(p.id); setBeat(0); }}><span>{String(index + 1).padStart(2, "0")}</span><span>{local(p.title)}<small>{local(domains[p.domain])}</small></span><ChevronRight size={15}/></button>)}<button className="studio-playlist-edit" onClick={() => { setTab("library"); setPresenting(false); }}><Library size={14}/>{t("Composer mon parcours", "Build my playlist")}</button></div>
        <article className="studio-story-card" data-test-id="studio-story"><div className="studio-story-top"><span className="studio-chip">{active.id} · {local(domains[active.domain])}</span><span className={`studio-depth ${active.depth}`}>{active.depth === "cockpit" ? t("Parcours du cockpit", "Cockpit path") : t("Atelier exploratoire", "Discovery workshop")}</span></div><h3>{local(active.title)}</h3>
          <div className="studio-beats" aria-label={t("Étapes de l’histoire", "Story beats")}>{beats.map((b, index) => <button key={index} aria-current={beat === index ? "step" : undefined} onClick={() => setBeat(index)}><span>{index + 1}</span><small>{local(b)}</small></button>)}</div>
          <div className="studio-beat-content" key={`${active.id}-${beat}`} aria-live="polite"><span className="studio-kicker">{String(beat + 1).padStart(2, "0")} / {local(beats[beat])}</span><h4>{beat === 0 ? local(active.question) : beat === 1 ? local(active.proof) : beat === 2 ? local(active.outcome) : beat === 3 ? local(active.boundary) : t("Quel critère de succès valider ensemble ?", "Which success criterion should we validate together?")}</h4>
            <p>{beat === 0 ? t("Posez la question avant d’ouvrir les chiffres. Le récit porte sur un collectif fictif, pas sur des personnes réelles.", "Ask the question before showing the numbers. This story concerns a fictional cohort, not real people.") : beat === 1 ? t("Ces éléments décrivent le scénario de référence ou l’atelier proposé. Les presets du laboratoire ne modifient pas ces preuves.", "These describe the reference scenario or proposed workshop. Lab presets do not change this evidence.") : beat === 2 ? t("Pour la capacité, faites varier les leviers ci-dessous. Pour les autres cas, comparez les choix avec votre interlocuteur ; aucune exécution métier n’est simulée.", "For capacity, change the levers below. For other cases, discuss choices with your audience; no business execution is simulated.") : beat === 3 ? t("Les personas sont des aperçus. Les droits du cockpit et la validation des actions sont appliqués au serveur.", "Personas are previews. Cockpit permissions and action approval are enforced by the server.") : `${local(active.metric)}. ${t("Convenir du périmètre, d’un responsable métier, des sources et d’un seuil mesurable en atelier.", "Agree the scope, a business owner, sources and a measurable threshold in a workshop.")}`}</p>
            <div className="studio-story-citation"><BookOpen size={15}/><span>{active.depth === "cockpit" ? t("Référence synthétique du 14 sept. 2026 ; vérifier la disponibilité dans le cockpit.", "Synthetic reference from 14 Sep 2026; check availability in the cockpit.") : t("Playbook de découverte — intégration et mesure non réalisées.", "Discovery playbook — integration and measurement not implemented.")}</span></div></div>
          <div className="studio-story-controls"><button className="secondary-button" disabled={beat === 0} onClick={() => setBeat(b => b - 1)} aria-label={t("Étape précédente", "Previous beat")}><ChevronLeft size={16}/></button><span>{beat + 1} / 5</span>{beat < 4 ? <button className="primary-button" onClick={() => setBeat(b => b + 1)}>{t("Continuer", "Continue")}<ArrowRight size={15}/></button> : <Link className="primary-button" to={active.route}>{t("Ouvrir le cockpit de référence", "Open reference cockpit")}<ArrowRight size={15}/></Link>}</div>
        </article></div>
      {presenting && <button className="studio-exit secondary-button" onClick={() => setPresenting(false)}><X size={15}/>{t("Quitter la présentation", "Exit presentation")}</button>}
      <ScenarioLab assumptions={config.assumptions} onChange={changeAssumption}/>
      <div className="studio-bottom-note"><ShieldCheck size={18}/><p>{t("Le studio prépare la conversation. Le cockpit de référence conserve ses données, son identité serveur et sa file d’actions humaines. Aucun preset n’accorde de droit ni ne change les réponses de Genie.", "The studio prepares the conversation. The reference cockpit retains its data, server identity and human action queue. No preset grants permissions or changes Genie answers.")}</p><Link to="/trust">{t("Voir les contrôles", "View controls")}<ArrowRight size={15}/></Link></div>
    </>}
    {tab === "library" && <>
      <div className="studio-section-heading"><div><span className="studio-kicker">{t("02 / UN CATALOGUE À COMPOSER", "02 / A CATALOG TO MAKE YOUR OWN")}</span><h2>{t("Vingt portes d’entrée. Une histoire cohérente.", "Twenty ways in. One coherent story.")}</h2></div><span className="studio-chip">{selected.length} {t("sélectionnés", "selected")}</span></div>
      <p className="studio-research-note">{t("20 playbooks éclairés par la recherche du 29 septembre 2026 : 10 signaux terrain, 6 adaptations de thèmes métier, 4 hypothèses éditoriales. Les numéros sont des identifiants, pas des rangs d’adoption.", "20 playbooks informed by research on 29 Sep 2026: 10 field signals, 6 business-theme adaptations, 4 editorial hypotheses. Numbers are identifiers, not adoption ranks.")}</p>
      <div className="studio-filters"><label className="studio-search"><Search size={17}/><input type="search" aria-label={t("Rechercher un cas d’usage", "Search use cases")} placeholder={t("Un enjeu, un produit, une source…", "A challenge, a product, a source…")} value={search} onChange={e => setSearch(e.target.value)}/></label><label><span className="sr-only">{t("Profondeur", "Depth")}</span><select aria-label={t("Profondeur", "Depth")} value={depth} onChange={e => setDepth(e.target.value)}><option value="all">{t("Toutes les profondeurs", "All depths")}</option><option value="cockpit">{t("Parcours du cockpit", "Cockpit paths")}</option><option value="playbook">{t("Ateliers exploratoires", "Discovery workshops")}</option></select></label></div>
      <div className="studio-domain-filters" aria-label={t("Domaines", "Domains")}>{(["all", ...Object.keys(domains)] as (Domain | "all")[]).map(key => <button key={key} aria-pressed={domain === key} onClick={() => setDomain(key)}>{key === "all" ? t("Tous les domaines", "All domains") : local(domains[key])}<span>{key === "all" ? 20 : playbooks.filter(p => p.domain === key).length}</span></button>)}</div><p className="studio-count" role="status">{filtered.length} / 20 {t("playbooks affichés", "playbooks shown")}</p>
      <div className="studio-catalog">{filtered.map(p => {
        const Icon = domainIcons[p.domain]; const included = config.selected.includes(p.id);
        return <article className={`studio-use-case domain-${p.domain}`} key={p.id} data-test-id={`playbook-${p.id}`}><div className="studio-card-top"><span className="studio-domain-icon"><Icon size={19}/></span><span>{p.id}</span><button aria-label={`${included ? t("Retirer", "Remove") : t("Ajouter", "Add")} ${p.id}`} aria-pressed={included} className="studio-select-case" onClick={() => toggleSelected(p.id)}>{included ? <Check size={16}/> : "+"}</button></div><span className="studio-kicker">{local(domains[p.domain])}</span><h3>{local(p.title)}</h3><p>{local(p.question)}</p><div className="studio-case-metric"><span>{t("MESURE À EXPLORER", "MEASURE TO EXPLORE")}</span><strong>{local(p.metric)}</strong></div><details><summary>{t("Le playbook en détail", "Playbook details")}<ChevronRight size={14}/></summary><dl><dt>{t("Base de recherche", "Research basis")}</dt><dd>{local(researchLabels[researchSupport[p.id]])}</dd><dt>{t("Résultat recherché", "Intended outcome")}</dt><dd>{local(p.outcome)}</dd><dt>{t("Preuve / atelier", "Evidence / workshop")}</dt><dd>{local(p.proof)}</dd><dt>{t("Sources illustratives", "Illustrative sources")}</dt><dd>{p.sources.join(" · ")}</dd><dt>{t("Produits adaptés — intégrations à vérifier", "Best-fit products — verify integrations")}</dt><dd>{p.products.join(" · ")}</dd><dt>{t("Limites", "Boundaries")}</dt><dd>{local(p.boundary)}</dd></dl></details><div className="studio-card-bottom"><span className={`studio-depth ${p.depth}`}>{p.depth === "cockpit" ? "Cockpit" : t("Atelier", "Workshop")}</span><button onClick={() => openPlaybook(p.id)}>{t("Explorer", "Explore")}<ArrowRight size={14}/></button></div></article>;
      })}</div>
      {filtered.length === 0 && <div className="studio-empty"><Search size={28}/><h3>{t("Aucun playbook pour ces filtres.", "No playbooks match these filters.")}</h3><button className="secondary-button" onClick={() => { setSearch(""); setDomain("all"); setDepth("all"); }}>{t("Réinitialiser les filtres", "Reset filters")}</button></div>}
      <details className="studio-method"><summary><BookOpen size={17}/>{t("Ce que nous reprenons de la méthode CFO", "What we carry over from the CFO method")}</summary><div><p>{t("Partir des impératifs métier, vérifier l’adoption dans les données terrain, puis composer des cas d’usage. Développer un scénario phare avant d’élargir le catalogue. Relier une même preuve aux métriques, à l’IA et à une action humaine.", "Start with business imperatives, verify adoption in field data, then curate use cases. Develop a flagship story before broadening the catalog. Connect the same evidence to metrics, AI and a human action.")}</p><p>{t("Les thèmes ont été confrontés aux impératifs et descriptions terrain sur Logfood. Un signal terrain n’est ni un résultat client vérifié, ni une preuve d’intégration. Les comptes, volumes et données internes restent exclus. Les produits décrivent une architecture proposée.", "Themes were checked against Logfood imperatives and field descriptions. A field signal is neither a verified customer outcome nor integration proof. Accounts, adoption volumes and internal data remain excluded. Products describe proposed architecture.")}</p></div></details>
    </>}
    {tab === "configure" && <>
      <div className="studio-section-heading"><div><span className="studio-kicker">{t("03 / VOTRE SIGNATURE", "03 / MAKE IT YOURS")}</span><h2>{t("La bonne histoire pour la bonne conversation.", "The right story for the right conversation.")}</h2></div><span className="studio-chip">{t("Sauvegarde dans ce navigateur", "Saved in this browser")}</span></div>
      <div className="studio-config-layout"><section className="studio-config-card"><h3>{t("Un contexte qui parle à votre audience", "A context your audience recognises")}</h3><p>{t("Ces presets changent uniquement les hypothèses du laboratoire. Tous les chiffres restent fictifs.", "Presets change only lab assumptions. All figures remain fictional.")}</p><div className="studio-presets">{presets.map(p => <button key={p.id} aria-pressed={config.preset === p.id} onClick={() => choosePreset(p.id)}>{local(p.name)}{config.preset === p.id && <Check size={14}/>}</button>)}</div><label className="studio-field"><span>{t("Nom de l’organisation fictive", "Fictional organisation name")}</span><input maxLength={80} value={config.organization} onChange={e => { const value = e.target.value; setConfig(c => ({ ...c, organization: value })); }} onBlur={() => { if (!config.organization.trim()) setConfig(c => ({ ...c, organization: preset.organization })); }}/></label><label className="studio-field"><span>{t("Durée du parcours", "Story duration")}</span><select aria-label={t("Durée du parcours", "Story duration")} value={config.minutes} onChange={e => setConfig(c => ({ ...c, minutes: Number(e.target.value) as StudioConfig["minutes"] }))}><option value={5}>{t("5 min · ouverture exécutive", "5 min · executive opening")}</option><option value={10}>{t("10 min · exploration ciblée", "10 min · focused exploration")}</option><option value={20}>{t("20 min · histoire complète", "20 min · complete story")}</option></select></label><p className="studio-duration-note">{t("Budget de temps indicatif par cas", "Suggested time per use case")} : {number(config.minutes / selected.length)} min. {t("Langue, thème et persona se règlent dans la barre supérieure.", "Set language, theme and persona in the top bar.")}</p></section>
        <section className="studio-config-card"><h3>{t("Votre sélection, dans votre ordre", "Your selection, in your order")}</h3><p>{t("Organisez les étapes de votre conversation.", "Arrange the flow of your conversation.")}</p><ol className="studio-order-list">{selected.map((p, index) => <li key={p.id}><span>{p.id}</span><strong>{local(p.title)}</strong><button className="icon-button" disabled={index === 0} aria-label={`${t("Monter", "Move up")} ${p.id}`} onClick={() => move(index, -1)}><ArrowUp size={14}/></button><button className="icon-button" disabled={index === selected.length - 1} aria-label={`${t("Descendre", "Move down")} ${p.id}`} onClick={() => move(index, 1)}><ArrowDown size={14}/></button><button className="icon-button" disabled={selected.length === 1} aria-label={`${t("Retirer", "Remove")} ${p.id}`} onClick={() => toggleSelected(p.id)}><X size={14}/></button></li>)}</ol><button className="secondary-button" onClick={() => setTab("library")}><Library size={15}/>{t("Ajouter des playbooks", "Add playbooks")}</button></section></div>
      <ScenarioLab assumptions={config.assumptions} onChange={changeAssumption} expanded/>
      <section className="studio-portability"><div><h3>{t("Préparez une fois. Réutilisez partout.", "Prepare once. Reuse anywhere.")}</h3><p>{t("Exportez les paramètres ou un brief dans la langue choisie. Utilisez uniquement un nom fictif ; le texte saisi est inclus dans l’export.", "Export settings or a brief in the selected language. Use a fictional name only; entered text is included in the export.")}</p></div><div className="studio-portability-actions"><button className="secondary-button" onClick={() => { downloadFile("hr-demo-studio.json", JSON.stringify(validateConfig({ ...config, organization: config.organization.trim() || preset.organization }), null, 2), "application/json"); setMessage(t("Configuration exportée.", "Configuration exported.")); }}><Download size={15}/>{t("Configuration", "Configuration")}</button><button className="secondary-button" onClick={() => upload.current?.click()}><Upload size={15}/>{t("Importer", "Import")}</button><button className="primary-button" onClick={exportBrief}><BookOpen size={15}/>{t("Brief présentateur", "Presenter brief")}</button><button className="studio-reset" onClick={() => { setConfig(structuredClone(defaultConfig)); setActiveId(defaultConfig.selected[0]); setBeat(0); setMessage(t("Configuration de référence restaurée.", "Reference configuration restored.")); }}><RotateCcw size={14}/>{t("Réinitialiser", "Reset")}</button></div><input ref={upload} className="sr-only" type="file" accept=".json,application/json" aria-label={t("Importer une configuration JSON", "Import JSON configuration")} onChange={event => void importConfig(event.target.files?.[0])}/>{importError && <p className="studio-import-error" role="alert">{t("Fichier invalide. Utilisez un export Studio v1 synthétique (32 Ko max). Votre configuration actuelle est conservée.", "Invalid file. Use a synthetic Studio v1 export (32 KB max). Your current configuration is preserved.")}</p>}</section>
    </>}
    </div><footer className="studio-footer"><span>HR Demo · {t("Données synthétiques uniquement", "Synthetic data only")}</span><Link to="/briefing">{t("Ouvrir le cockpit de référence", "Open reference cockpit")}<ArrowRight size={14}/></Link></footer>
  </div>;
}

function ScenarioLab({ assumptions: a, onChange, expanded = false }: { assumptions: Assumptions; onChange: (key: keyof Assumptions, value: number) => void; expanded?: boolean }) {
  const { language, t } = usePreferences(); const r = calculate(a);
  const n = (value: number) => numberLabel(value, language, 1);
  const money = (value: number) => new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
  const levers = [
    { key: "retain" as const, cost: "retainCost" as const, gain: "retainGain" as const, label: t("Fidéliser", "Retain"), icon: HeartHandshake },
    { key: "hire" as const, cost: "hireCost" as const, gain: "hireGain" as const, label: t("Recruter", "Hire"), icon: Users },
    { key: "redeploy" as const, cost: "redeployCost" as const, gain: "redeployGain" as const, label: t("Mobiliser", "Redeploy"), icon: Network },
  ];
  const field = (key: keyof Assumptions, label: string, unit: string) => <label className="studio-field" key={key}><span>{label} <small>{unit}</small></span><input type="number" min={bounds[key][0]} max={bounds[key][1]} step={bounds[key][2]} value={a[key]} onChange={e => { if (e.target.value !== "") onChange(key, Number(e.target.value)); }}/></label>;
  return <section className="studio-lab" data-test-id="scenario-lab"><div className="studio-section-heading"><div><span className="studio-kicker"><FlaskConical size={14}/>{t("LABORATOIRE / HORIZON DE SIX MOIS", "SCENARIO LAB / SIX-MONTH HORIZON")}</span><h2>{t("Et si vous changiez l’équation ?", "What if you changed the equation?")}</h2></div><span className="studio-chip">{t("Simulation locale sous hypothèses", "Local assumption-based simulation")}</span></div><p className="studio-lab-intro">{t("Déplacez un curseur. Comparez le coût et la capacité. Les gains unitaires sont des hypothèses indépendantes, sans modèle prédictif ni effet observé.", "Move a slider. Compare cost and capacity. Unit gains are independent assumptions, with no predictive model or observed effect.")}</p>
    <div className="studio-lab-grid"><div className="studio-levers">{levers.map(l => <div className={`studio-lever lever-${l.key}`} key={l.key}><label htmlFor={`studio-lever-${l.key}`}><span><l.icon size={18}/>{l.label}</span><strong>{a[l.key]} <small>{t("personnes", "people")}</small></strong></label><input id={`studio-lever-${l.key}`} type="range" min={0} max={30} step={1} value={a[l.key]} aria-valuetext={`${a[l.key]} ${t("personnes", "people")}`} onChange={e => onChange(l.key, Number(e.target.value))}/><div><span>{money(a[l.cost])} / {t("personne", "person")}</span><span>{numberLabel(a[l.gain], language, 2)} {t("ETP-mois / personne", "FTE-mo / person")}</span></div></div>)}<p className="studio-model-note">{t("Groupes supposés distincts ; pas de double comptage, de ramp-up ou d’interactions modélisés. Revoir ces hypothèses avant tout usage métier.", "Groups assumed distinct; no overlap, ramp-up or interactions modelled. Review assumptions before business use.")}</p></div>
      <div className="studio-results" aria-live="polite" aria-atomic="true"><div className="studio-result-main"><span>{t("ÉCART RÉSIDUEL MODÉLISÉ", "MODELLED RESIDUAL GAP")}</span><strong data-test-id="studio-residual">{n(r.residual)}<small>{t("ETP-mois", "FTE-months")}</small></strong><p>{t("Objectif strict", "Strict target")} &lt; {n(a.target)} · {r.meetsTarget ? t("atteint sous hypothèses", "met under assumptions") : t("non atteint", "not met")}</p></div>
        <div className="studio-result-bars"><div><span>{t("Sans intervention", "No intervention")}</span><div className="studio-bar-track"><i style={{ width: "100%" }}/></div><strong>{n(a.gap)}</strong></div><div><span>{t("Votre simulation", "Your simulation")}</span><div className="studio-bar-track"><i className="hatched" style={{ width: `${r.residual / a.gap * 100}%` }}/></div><strong>{n(r.residual)}</strong></div></div>
        <dl><div><dt>{t("Coût modélisé", "Modelled cost")}</dt><dd data-test-id="studio-cost">{money(r.cost)}</dd></div><div><dt>{t("Budget fictif", "Fictional budget")}</dt><dd>{money(a.budget)}</dd></div><div className={r.withinBudget ? "studio-within" : "studio-over"}><dt>{r.withinBudget ? t("Marge budgétaire", "Budget headroom") : t("Dépassement", "Over budget")}</dt><dd>{money(Math.abs(r.headroom))}</dd></div></dl>
        <div className={`studio-verdict ${r.withinBudget && r.meetsTarget ? "fits" : "review"}`}><ShieldCheck size={16}/>{r.withinBudget && r.meetsTarget ? t("Option à discuter — jamais une approbation", "Option to discuss — never an approval") : t("Revoir les leviers ou les contraintes", "Review levers or constraints")}</div>
        {r.overcapacity > 0 && <p className="studio-overcapacity">{n(r.overcapacity)} {t("ETP-mois au-delà de l’écart : le gain utile est plafonné, le coût reste intégral.", "FTE-months beyond the gap: useful recovery is capped, the full cost remains.")}</p>}
      </div></div>
    <details className="studio-assumptions" open={expanded || undefined}><summary><SlidersHorizontal size={16}/>{t("Inspecter et modifier les hypothèses", "Inspect and edit assumptions")}<ChevronRight size={15}/></summary><div className="studio-assumptions-grid">{field("gap", t("Écart initial", "Initial gap"), t("ETP-mois", "FTE-months"))}{field("budget", t("Budget", "Budget"), "€")}{field("target", t("Objectif : écart strictement inférieur à", "Target: gap strictly below"), t("ETP-mois", "FTE-months"))}{levers.flatMap(l => [field(l.cost, `${l.label} · ${t("coût unitaire", "unit cost")}`, "€"), field(l.gain, `${l.label} · ${t("gain unitaire", "unit gain")}`, t("ETP-mois", "FTE-months"))])}</div><div className="studio-formula"><code>{t("coût = Σ(nombre × coût unitaire)", "cost = Σ(count × unit cost)")}<br/>{t("écart résiduel = max(0, écart initial − Σ(nombre × gain unitaire))", "residual gap = max(0, initial gap − Σ(count × unit gain))")}</code><p>{t("Le preset Technologie reprend le scénario synthétique de référence : 5 × 0,16 + 4 × 1 + 2 × 2,2 = 9,2 ETP-mois récupérés pour 390 000 €. Tous les autres presets sont des hypothèses éditoriales.", "The Technology preset reproduces the synthetic reference: 5 × 0.16 + 4 × 1 + 2 × 2.2 = 9.2 FTE-months recovered at €390,000. All other presets are editorial assumptions.")}</p><button className="secondary-button" onClick={() => (Object.keys(baseline) as (keyof Assumptions)[]).forEach(key => onChange(key, baseline[key]))}><RotateCcw size={14}/>{t("Restaurer les hypothèses de référence", "Restore reference assumptions")}</button></div></details>
    <p className="studio-model-note">{t("Aucune action n’est soumise depuis le laboratoire. Le cockpit conserve ses trois options de référence et exige sa propre revue humaine.", "The lab submits no actions. The cockpit retains its three reference options and requires its own human review.")}</p>
  </section>;
}
