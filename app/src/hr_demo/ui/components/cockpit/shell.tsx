import { Suspense, useCallback, useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { Activity, ArrowUpRight, BookOpen, ChevronDown, CircleHelp, Database, HeartHandshake, LayoutDashboard, Menu, Moon, Network, Play, ShieldCheck, Sparkles, Sun, Users, X } from "lucide-react";
import { useTheme } from "@/components/apx/theme-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { useCockpitSuspense } from "@/lib/api";
import selector from "@/lib/selector";
import type { CockpitData, Language, PagePath, Persona } from "@/lib/cockpit-types";
import { personas } from "@/lib/cockpit-types";
import { CockpitContext, PreferencesContext, usePreferences } from "./context";
import { SourcesPanel } from "./sources";
import { GuidedTour } from "./tour";
import { AssistantDock } from "./assistant";
import { readPreference, writePreference } from "@/lib/preference-storage";

export const navigation: { to: PagePath; fr: string; en: string; icon: typeof Activity; group?: boolean }[] = [
  { to: "/enterprise", fr: "Enterprise & Global", en: "Enterprise & Global", icon: ShieldCheck },
  { to: "/agent-workspace", fr: "Espace agent simulé", en: "Simulated agent workspace", icon: Sparkles },
  { to: "/dnb", fr: "DNB · Top 20 & Agents", en: "DNB · Top 20 & Agents", icon: Network },
  { to: "/studio", fr: "Demo Studio", en: "Demo Studio", icon: Play },
  { to: "/briefing", fr: "Cockpit historique", en: "Historical cockpit", icon: LayoutDashboard },
  { to: "/retention", fr: "Rétention", en: "Retention", icon: HeartHandshake },
  { to: "/talent", fr: "Talents", en: "Talent", icon: Users },
  { to: "/workforce", fr: "Planification", en: "Workforce", icon: Network },
  { to: "/people-ops", fr: "Opérations RH", en: "People operations", icon: Activity },
  { to: "/ask", fr: "Genie historique", en: "Historical Genie", icon: Sparkles, group: true },
  { to: "/trust", fr: "Confiance & sources", en: "Trust & sources", icon: ShieldCheck },
];

export function CockpitShell() {
  const [language, setLanguageState] = useState<Language>(() => readPreference("hr-demo-language") === "en" ? "en" : "fr");
  const [persona, setPersonaState] = useState<Persona>("cpo");
  const [sources, setSources] = useState<{ open: boolean; metric?: string }>({ open: false });
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [paneCollapsed, setPaneCollapsed] = useState(() => readPreference("hr-demo-pane-collapsed") === "true");
  const setCollapsed = (value: boolean) => { setPaneCollapsed(value); writePreference("hr-demo-pane-collapsed", String(value)); };
  const [menuOpen, setMenuOpen] = useState(false);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const standalone = ["/", "/enterprise", "/agent-workspace", "/dnb", "/studio"].includes(location.pathname);
  const t = useCallback((fr: string, en: string) => language === "fr" ? fr : en, [language]);
  const stopTour = useCallback(() => setTourStep(null), []);
  const closeMobileOverlays = useCallback(() => { setAssistantOpen(false); setMenuOpen(false); }, []);
  useMobileDialog(assistantOpen ? ".assistant-sidebar" : menuOpen ? ".main-sidebar" : null, closeMobileOverlays);
  const current = navigation.find(item => item.to === location.pathname) || navigation[0];
  const setLanguage = (value: Language) => { writePreference("hr-demo-language", value); setLanguageState(value); };
  const setPersona = (value: Persona) => { setPersonaState(value); setTourStep(null); };
  useEffect(() => { document.documentElement.lang = language; document.title = `${current[language]} · HR Demo`; }, [language, current]);
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  return <PreferencesContext.Provider value={{ language, setLanguage, persona, setPersona, t, openSources: metric => { setAssistantOpen(false); setSources({ open: true, metric }); }, startTour: () => setTourStep(0), openAssistant: () => { setCollapsed(false); if (window.matchMedia("(max-width: 1100px)").matches) setAssistantOpen(true); } }}>
    <a href="#main-content" className="skip-link">{t("Aller au contenu", "Skip to content")}</a>
    <div className={`cockpit-shell ${paneCollapsed ? "reading-pane-collapsed" : ""} ${standalone ? "studio-shell" : ""}`}>
      {menuOpen && <button className="mobile-menu-backdrop" onClick={() => setMenuOpen(false)} aria-label={t("Fermer le menu", "Close menu")}/>}
      <aside className={`main-sidebar ${menuOpen ? "is-open" : ""}`} aria-label={t("Navigation principale", "Main navigation")}>
        <Link className="brand" to="/dnb" aria-label="HR Demo"><span className="brand-mark"><Network size={24}/></span><span>HR<span className="brand-light"> Demo</span><small>PEOPLE INTELLIGENCE</small></span></Link>
        <div className="workspace-card"><span className="workspace-monogram">CC</span><span><strong>{t("Espace de démonstration", "Demo workspace")}</strong><small>{t("Organisation fictive", "Fictional organisation")}</small></span><ChevronDown size={13}/></div>
        <p className="nav-label">{t("VOTRE COCKPIT", "YOUR COCKPIT")}</p>
        <nav>{navigation.map(item => <Link to={item.to} key={item.to} data-test-id={`nav-${item.to.slice(1)}`} className={`nav-item ${current.to === item.to ? "active" : ""} ${item.group ? "nav-separator" : ""}`} aria-current={current.to === item.to ? "page" : undefined}><item.icon size={18}/><span>{item[language]}</span>{current.to === item.to && <span className="nav-active-dot"/>}</Link>)}</nav>
        <div className="sidebar-bottom"><button className="tour-launch" data-test-id="start-tour" onClick={() => setTourStep(0)}><span className="tour-launch-icon"><Play size={16}/></span><span><strong>{t("Faites le tour", "Take a guided tour")}</strong><small>{t("Un parcours pour votre rôle", "A path for your role")}</small></span><ArrowUpRight size={15}/></button><div className="persona-avatar-row"><span className="avatar small">{personas[persona].name[0]}</span><span><strong>{personas[persona].name}</strong><small>{t("Persona fictive · aperçu", "Fictional persona · preview")}</small></span><CircleHelp size={15}/></div></div>
      </aside>
      <div className="workspace-main">
        <header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu-toggle" aria-label={t("Ouvrir le menu", "Open menu")} onClick={() => setMenuOpen(true)}><Menu size={20}/></button><span>Workspace</span><span className="breadcrumb-divider">/</span><strong>{current[language]}</strong></div><div className="topbar-actions"><button className="assistant-pane-toggle secondary-button" data-test-id="assistant-pane-toggle" aria-controls="assistant-reading-pane" aria-expanded={!paneCollapsed} onClick={() => setCollapsed(!paneCollapsed)}><Sparkles size={15}/><span>Assistant</span><span aria-hidden="true">{paneCollapsed ? "←" : "→"}</span><span className="sr-only">{t(paneCollapsed ? "Ouvrir le volet de lecture" : "Réduire le volet de lecture", paneCollapsed ? "Open reading pane" : "Collapse reading pane")}</span></button><div className="language-toggle" aria-label={t("Langue", "Language")}>{(["fr", "en"] as const).map(value => <button key={value} aria-pressed={language === value} data-test-id={`language-${value}`} onClick={() => setLanguage(value)}>{value.toUpperCase()}</button>)}</div><button className="icon-button" data-test-id="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={t(theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre", theme === "dark" ? "Switch to light mode" : "Switch to dark mode")}>{theme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}</button><div className="topbar-divider"/><label className="persona-picker"><span className="avatar">{personas[persona].name[0]}</span><span className="sr-only">{t("Persona fictive en aperçu", "Fictional persona preview")}</span><select value={persona} data-test-id="persona-select" onChange={event => setPersona(event.target.value as Persona)}>{Object.entries(personas).map(([key, value]) => <option key={key} value={key}>{value.name} · {value.role}</option>)}</select></label></div></header>
        <div className="synthetic-banner" data-tour="synthetic-banner"><span><span className="synthetic-dot"/>{t("DÉMONSTRATION SYNTHÉTIQUE", "SYNTHETIC DEMONSTRATION")}</span><p>{t("Personnes, dossiers et décisions fictifs. L’aperçu persona ne modifie pas vos droits.", "Fictional people, cases and decisions. Persona preview does not change your permissions.")}</p></div>
        {standalone ? <main id="main-content" className="studio-main" tabIndex={-1}><Outlet/></main> : <QueryErrorResetBoundary>{({ reset }) => <ErrorBoundary onReset={reset} fallbackRender={({ error, resetErrorBoundary }) => <div className="data-error" role="alert"><Database size={30}/><h1>{t("Les données sont indisponibles", "Data is unavailable")}</h1><p>{t("Le cockpit n’a pas pu obtenir la réponse du serveur. Réessayez pour charger les données du scénario.", "The cockpit could not obtain the server response. Retry to load scenario data.")}</p><code>{error instanceof Error ? error.message : String(error)}</code><button className="primary-button" onClick={resetErrorBoundary}>{t("Réessayer", "Try again")}</button></div>}><Suspense fallback={<CockpitSkeleton/>}><CockpitWorkspace sources={sources} closeSources={() => setSources({ open: false })} assistantOpen={assistantOpen} closeAssistant={() => setAssistantOpen(false)}/></Suspense></ErrorBoundary>}</QueryErrorResetBoundary>}
      </div>
      <button className="assistant-mobile-trigger" onClick={() => setAssistantOpen(true)} aria-label={t("Ouvrir l’assistant", "Open assistant")}><Sparkles size={20}/><span>Assistant</span></button>
      {tourStep !== null && <GuidedTour step={tourStep} setStep={setTourStep} onClose={stopTour}/>}
    </div>
  </PreferencesContext.Provider>;
}

function CockpitWorkspace({ sources, closeSources, assistantOpen, closeAssistant }: { sources: { open: boolean; metric?: string }; closeSources: () => void; assistantOpen: boolean; closeAssistant: () => void }) {
  const { data: response } = useCockpitSuspense(selector());
  const data = response as unknown as CockpitData;
  const { t } = usePreferences();
  if (!data?.reference?.scopes?.hero || data.synthetic !== true) throw new Error("The server returned an invalid synthetic cockpit response.");
  return <CockpitContext.Provider value={data}><div className="workspace-body"><main id="main-content" className="page-content" tabIndex={-1}><Outlet/><footer className="page-footer"><span><BookOpen size={13}/>{t("Scénario fictif · Care Coordination Platform", "Fictional scenario · Care Coordination Platform")}</span><span>{t("Référence", "Reference")} {new Date(data.as_of).toLocaleDateString("fr-FR", { timeZone: "UTC" })}</span></footer></main><aside id="assistant-reading-pane" className={`assistant-sidebar ${assistantOpen ? "is-open" : ""}`} aria-label={t("Assistant contextuel", "Contextual assistant")}><button className="assistant-mobile-close icon-button" onClick={closeAssistant} aria-label={t("Fermer l’assistant", "Close assistant")}><X size={18}/></button><AssistantDock/></aside>{assistantOpen && <button className="assistant-mobile-backdrop" onClick={closeAssistant} aria-label={t("Fermer l’assistant", "Close assistant")}/>}</div><SourcesPanel open={sources.open} metric={sources.metric} onClose={closeSources}/></CockpitContext.Provider>;
}

function CockpitSkeleton() {
  const { t } = usePreferences();
  return <div className="cockpit-skeleton" aria-label={t("Chargement du cockpit", "Loading cockpit")} role="status"><Skeleton className="h-5 w-36"/><Skeleton className="h-12 w-3/4"/><Skeleton className="h-6 w-full"/><div className="skeleton-metrics">{[0,1,2,3].map(item => <Skeleton key={item} className="h-32 w-full"/>)}</div><Skeleton className="h-64 w-full"/><Skeleton className="h-48 w-full"/><span className="sr-only">{t("Chargement des données…", "Loading data…")}</span></div>;
}

function useMobileDialog(selector: string | null, close: () => void) {
  useEffect(() => {
    if (!selector) return;
    const region = document.querySelector<HTMLElement>(selector);
    if (!region) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const background = Array.from(document.querySelectorAll<HTMLElement>(selector === ".main-sidebar" ? ".workspace-main, .assistant-mobile-trigger" : ".main-sidebar, .topbar, .synthetic-banner, .page-content, .assistant-mobile-trigger"));
    background.forEach(element => element.inert = true);
    document.body.style.overflow = "hidden";
    region.setAttribute("role", "dialog");
    region.setAttribute("aria-modal", "true");
    const focusable = () => Array.from(region.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], textarea, input, select, [tabindex="0"]')).filter(element => element.getClientRects().length > 0);
    (region.querySelector<HTMLTextAreaElement>("textarea") || focusable()[0])?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); return; }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const resize = () => { if (window.innerWidth > (selector === ".main-sidebar" ? 760 : 1100)) close(); };
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", resize);
      document.body.style.overflow = previousOverflow;
      background.forEach(element => element.inert = false);
      region.removeAttribute("role");
      region.removeAttribute("aria-modal");
      if (previous?.isConnected) previous.focus();
    };
  }, [selector, close]);
}
