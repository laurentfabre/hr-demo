import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import type { PagePath, Persona } from "@/lib/cockpit-types";
import { personas } from "@/lib/cockpit-types";
import { usePreferences } from "./context";

interface TourStep { route: PagePath; target: string; fr: [string, string]; en: [string, string] }
const common: Record<string, TourStep> = {
  briefing: { route: "/briefing", target: "hero", fr: ["Une décision, quatre domaines", "Le même collectif fictif relie rétention, recrutement, capacité et opérations RH. Commencez par l’écart de capacité à six mois."], en: ["One decision, four domains", "The same fictional cohort connects retention, hiring, capacity and HR operations. Start with the six-month capacity gap."] },
  identity: { route: "/trust", target: "identity", fr: ["Une persona est un aperçu", "Le choix de Claire, Sofia, Mehdi ou Alex ne change jamais l’identité authentifiée ni les permissions du serveur."], en: ["A persona is a preview", "Selecting Claire, Sofia, Mehdi or Alex never changes the authenticated identity or server permissions."] },
  refusal: { route: "/trust", target: "access-proof", fr: ["Montrer la limite", "Demandez un détail non autorisé : le serveur refuse et inscrit un événement dans le journal d’audit."], en: ["Show the boundary", "Request an unauthorised detail: the server refuses and records an audit event."] },
  retention: { route: "/retention", target: "retention-signals", fr: ["Comprendre le collectif", "L’attrition historique et la compression salariale sont des signaux agrégés. Aucun score individuel de départ n’est disponible."], en: ["Understand the cohort", "Historical attrition and pay compression are aggregate signals. No individual departure score is available."] },
  talent: { route: "/talent", target: "candidate-evidence", fr: ["Des compétences, des preuves", "Ouvrez les preuves des profils fictifs consentis. Les lacunes restent visibles ; aucun classement ne décide à la place du recruteur."], en: ["Skills with evidence", "Open evidence for consented fictional profiles. Gaps remain visible; no ranking makes a recruiter’s decision."] },
  workforce: { route: "/workforce", target: "scenario-options", fr: ["Comparer avant de décider", "Comparez les écarts et coûts des trois options sur le même horizon. L’option mixte combine rétention, recrutement et mobilité."], en: ["Compare before deciding", "Compare gaps and costs for three options over the same horizon. The blended option combines retention, hiring and mobility."] },
  actions: { route: "/workforce", target: "action-queue", fr: ["Garder la décision humaine", "Proposez une option, examinez-la, puis approuvez ou rejetez. La validation crée seulement une action fictive auditée."], en: ["Keep the decision human", "Propose an option, review it, then approve or reject it. Committing creates only an audited fictional action."] },
  operations: { route: "/people-ops", target: "case-queue", fr: ["Relier décision et quotidien", "Les dossiers hors délai concernent l’onboarding, la mobilité et la paie du même scénario. Examinez leurs échéances."], en: ["Connect decisions to daily work", "Overdue cases concern onboarding, mobility and payroll in the same scenario. Inspect their due dates."] },
  analytics: { route: "/ask", target: "metric-reconciliation", fr: ["Retrouver les définitions", "Chaque indicateur renvoie au même résultat SQL et à un périmètre explicite. Le ratio 1,8× est fondé sur des hypothèses."], en: ["Find the definitions", "Every metric refers to the same SQL result and an explicit scope. The 1.8× ratio is assumption-based."] },
  assistant: { route: "/ask", target: "ask-prompts", fr: ["Une question, une réponse sourcée", "L’assistant conserve le contexte de la page et cite ses sources. Il ne peut ni approuver ni exécuter une action RH."], en: ["A question, a sourced answer", "The assistant keeps page context and cites its sources. It cannot approve or commit an HR action."] },
};
const orders: Record<Persona, string[]> = {
  cpo: ["briefing", "identity", "refusal", "retention", "talent", "workforce", "actions", "assistant"],
  hrbp: ["briefing", "identity", "refusal", "retention", "operations", "workforce", "actions", "assistant"],
  ta: ["briefing", "identity", "refusal", "talent", "operations", "workforce", "actions", "assistant"],
  analyst: ["briefing", "identity", "refusal", "analytics", "retention", "workforce", "actions", "assistant"],
};

export function GuidedTour({ step, setStep, onClose }: { step: number; setStep: (step: number) => void; onClose: () => void }) {
  const { persona, language, t } = usePreferences();
  const navigate = useNavigate();
  const tour = orders[persona].map(key => common[key]);
  const current = tour[step];
  useEffect(() => {
    void navigate({ to: current.route });
    const timer = setTimeout(() => {
      const target = document.querySelector(`[data-tour="${current.target}"]`);
      target?.classList.add("tour-target");
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", escape);
    return () => { clearTimeout(timer); document.querySelectorAll(".tour-target").forEach(element => element.classList.remove("tour-target")); window.removeEventListener("keydown", escape); };
  }, [current.route, current.target, navigate, onClose]);
  return <section className="guided-tour" role="region" aria-label={t("Visite guidée", "Guided tour")} data-test-id="guided-tour"><div className="tour-top"><span className="eyebrow">{personas[persona].name} · {t("Parcours guidé", "Guided tour")} {step + 1}/{tour.length}</span><button onClick={onClose} className="icon-button" aria-label={t("Quitter la visite", "Close tour")}><X size={17}/></button></div><div aria-live="polite"><h3>{current[language][0]}</h3><p>{current[language][1]}</p></div><div className="tour-footer"><div className="tour-dots">{tour.map((_, index) => <span key={index} className={index === step ? "active" : ""}/>)}</div><button className="quiet-button" onClick={() => setStep(step - 1)} disabled={step === 0} aria-label={t("Étape précédente", "Previous step")}><ArrowLeft size={16}/></button><button className="primary-button" data-test-id="tour-next" onClick={() => step === tour.length - 1 ? onClose() : setStep(step + 1)}>{step === tour.length - 1 ? t("Terminer", "Finish") : t("Suivant", "Next")}<ArrowRight size={15}/></button></div></section>;
}
