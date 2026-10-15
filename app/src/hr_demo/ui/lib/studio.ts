/** Public, synthetic playbooks. Order is editorial; no Logfood adoption claim. */
export type Copy = { fr: string; en: string };
export const copy = (fr: string, en: string): Copy => ({ fr, en });
export type Domain = "workforce" | "retention" | "talent" | "operations";
export const domains: Record<Domain, Copy> = {
  workforce: copy("Planification", "Workforce planning"), retention: copy("Rétention", "Retention"),
  talent: copy("Talents", "Talent"), operations: copy("Opérations RH", "People operations"),
};
// Sanitized editorial evidence tiers. No internal records or adoption metrics.
export const researchSupport: Record<string, "field_signal" | "imperative_theme" | "editorial"> = {
  HR01: "field_signal", HR02: "field_signal", HR03: "field_signal", HR04: "field_signal",
  HR05: "imperative_theme", HR06: "imperative_theme", HR07: "editorial", HR08: "imperative_theme",
  HR09: "field_signal", HR10: "field_signal", HR11: "field_signal", HR12: "imperative_theme",
  HR13: "imperative_theme", HR14: "field_signal", HR15: "imperative_theme", HR16: "field_signal",
  HR17: "field_signal", HR18: "editorial", HR19: "editorial", HR20: "editorial",
};
export const researchLabels = {
  field_signal: copy("Signal terrain · thème observé", "Field signal · observed theme"),
  imperative_theme: copy("Thème d’impératif · adaptation", "Imperative theme · adaptation"),
  editorial: copy("Hypothèse éditoriale · à valider", "Editorial hypothesis · validate"),
};
export interface Playbook {
  id: string; domain: Domain; title: Copy; question: Copy; outcome: Copy;
  proof: Copy; boundary: Copy; sources: string[]; products: string[];
  metric: Copy; route: "/workforce" | "/retention" | "/talent" | "/people-ops" | "/ask" | "/trust";
  depth: "cockpit" | "playbook";
}
const book = (id: string, domain: Domain, title: Copy, question: Copy, outcome: Copy, metric: Copy,
  proof: Copy, boundary: Copy, sources: string[], products: string[], route: Playbook["route"], depth: Playbook["depth"] = "playbook"): Playbook =>
  ({ id, domain, title, question, outcome, metric, proof, boundary, sources, products, route, depth });
export const playbooks: Playbook[] = [
  book("HR01", "workforce", copy("Plan de capacité augmenté", "Connected capacity planning"),
    copy("Fidéliser, recruter ou mobiliser : quel équilibre ?", "Retain, hire or redeploy: what is the right balance?"),
    copy("Comparer un plan commun sous contrainte budgétaire.", "Compare one coordinated plan within a budget."), copy("Écart de capacité · ETP-mois", "Capacity gap · FTE-months"),
    copy("13,5 → 4,3 ETP-mois pour 390 k€ dans le scénario de référence.", "13.5 → 4.3 FTE-months at €390k in the reference scenario."),
    copy("Hypothèses explicites ; aucune décision automatique.", "Explicit assumptions; no automatic decisions."), ["Workday", "Greenhouse", "Lucca"], ["Databricks SQL", "Genie", "Lakebase"], "/workforce", "cockpit"),
  book("HR02", "retention", copy("Rétention à l’échelle des équipes", "Cohort retention intelligence"),
    copy("Où ouvrir une conversation sur la rétention ?", "Where should we start a retention conversation?"),
    copy("Contextualiser les signaux collectifs avant d’agir.", "Put cohort signals in context before acting."), copy("Attrition historique · % annualisé", "Historical attrition · annualised %"),
    copy("14,2 % pour le collectif contre 8,1 % pour l’entreprise fictive.", "14.2% for the cohort against an 8.1% synthetic company baseline."),
    copy("Aucun score de départ individuel ni donnée de santé.", "No individual flight-risk scores or health data."), ["Workday", "Lucca"], ["Databricks SQL", "Unity Catalog", "Genie"], "/retention", "cockpit"),
  book("HR03", "talent", copy("Recrutement : délais et goulots", "Hiring velocity & bottlenecks"),
    copy("Quels postes freinent la capacité ?", "Which vacancies constrain capacity?"),
    copy("Relier les délais de recrutement aux besoins opérationnels.", "Connect recruiting lead times to operational needs."), copy("Délai médian · jours", "Median time to fill · days"),
    copy("11 postes critiques et 72 jours contre une référence de 48 jours.", "11 critical vacancies and 72 days versus a 48-day baseline."),
    copy("Comparer des processus, sans classer les candidats.", "Compare processes without ranking candidates."), ["Greenhouse", "Workday"], ["Databricks SQL", "AI/BI", "Genie"], "/talent", "cockpit"),
  book("HR04", "operations", copy("Copilote People Analytics", "Governed people analytics copilot"),
    copy("Puis-je répondre à une question RH avec des sources ?", "Can I answer an HR question with inspectable sources?"),
    copy("Donner une réponse utile dans le périmètre autorisé.", "Give a useful answer within the authorised scope."), copy("Réponse vérifiable · sources & SQL", "Verifiable answer · sources & SQL"),
    copy("Une question agrégée, les tables interrogées et une prochaine action.", "An aggregate question, queried tables and a suggested next action."),
    copy("La disponibilité de Genie dépend de l’instance connectée.", "Genie availability depends on the connected instance."), ["Workday", "Lucca", "Greenhouse"], ["Genie", "Unity Catalog", "Databricks Apps"], "/ask", "cockpit"),
  book("HR05", "operations", copy("Priorisation des services RH", "HR service operations"),
    copy("Quels dossiers ralentissent l’arrivée ou la mobilité ?", "Which cases delay onboarding or mobility?"),
    copy("Mettre les dossiers hors délai au service du plan de capacité.", "Connect overdue cases to the capacity plan."), copy("Dossiers hors SLA · nombre", "Cases outside SLA · count"),
    copy("Six dossiers synthétiques en retard : onboarding, mobilité et paie.", "Six overdue synthetic cases across onboarding, mobility and payroll."),
    copy("Pas d’écriture dans ServiceNow, Lucca ou Workday.", "No writes to ServiceNow, Lucca or Workday."), ["ServiceNow HR Service Delivery", "Lucca"], ["Lakebase", "Databricks Apps", "Databricks SQL"], "/people-ops", "cockpit"),
  book("HR06", "talent", copy("Compétences et preuves candidates", "Evidence-based candidate review"),
    copy("Quelles compétences sont documentées et lesquelles restent à valider ?", "Which skills are evidenced and which need discussion?"),
    copy("Préparer un entretien à partir de preuves professionnelles.", "Prepare an interview from job-related evidence."), copy("Profils consentis · preuves citées", "Consented profiles · cited evidence"),
    copy("Quatre profils fictifs, passages cités et lacunes explicites.", "Four fictional profiles with cited passages and explicit gaps."),
    copy("Aucun classement, score global, rejet ou contact automatique.", "No ranking, overall score, automatic rejection or contact."), ["Greenhouse", "Dossiers candidats consentis / Consented candidate documents"], ["Unity Catalog", "Vector Search", "Databricks Apps"], "/talent", "cockpit"),
  book("HR07", "retention", copy("Compression salariale collective", "Cohort pay compression"),
    copy("Les écarts de rémunération méritent-ils une revue ?", "Do cohort pay differences warrant a review?"),
    copy("Préparer une revue agrégée des rémunérations.", "Prepare an aggregate compensation review."), copy("Expositions agrégées · nombre", "Aggregate exposures · count"),
    copy("18 expositions synthétiques ; association descriptive uniquement.", "18 synthetic exposures; descriptive association only."),
    copy("Pas de salaire individuel ni de conclusion causale.", "No individual salaries or causal claims."), ["Workday", "Lucca"], ["Databricks SQL", "Unity Catalog"], "/retention", "cockpit"),
  book("HR08", "workforce", copy("Mobilité interne et redéploiement", "Internal mobility & redeployment"),
    copy("Quelle capacité peut être retrouvée par la mobilité ?", "How much capacity could internal mobility restore?"),
    copy("Comparer le redéploiement au recrutement externe.", "Compare internal redeployment with external hiring."), copy("Capacité modélisée · ETP-mois", "Modelled capacity · FTE-months"),
    copy("Deux mobilités dans le plan mixte ; calculs inspectables.", "Two redeployments in the blended plan; inspectable calculations."),
    copy("Aucune affectation individuelle automatique.", "No automatic individual assignments."), ["Workday", "SAP SuccessFactors"], ["Databricks SQL", "Lakebase"], "/workforce", "cockpit"),
  book("HR09", "operations", copy("Onboarding sans friction", "Onboarding readiness"),
    copy("Qu’est-ce qui empêche une prise de poste sereine ?", "What prevents a smooth start?"),
    copy("Examiner les retards de préparation et leurs propriétaires.", "Review readiness delays and their owners."), copy("Dossiers onboarding hors SLA · nombre", "Overdue onboarding cases · count"),
    copy("Filtrer les dossiers onboarding puis relier les retards au plan.", "Filter onboarding cases, then connect delays to the plan."),
    copy("Une file de démonstration, pas un système d’exécution RH.", "A demonstration queue, not an HR execution system."), ["ServiceNow HR Service Delivery", "Workday"], ["Lakebase", "Databricks Apps"], "/people-ops", "cockpit"),
  book("HR10", "operations", copy("Qualité et traçabilité des données RH", "HR data quality & lineage"),
    copy("Pourquoi deux équipes annoncent-elles des effectifs différents ?", "Why do two teams report different headcounts?"),
    copy("Partager une définition et retracer ses entrées.", "Share one definition and trace its inputs."), copy("Écarts de réconciliation · nombre", "Reconciliation discrepancies · count"),
    copy("Comparer définitions, sources et date de référence du cockpit.", "Compare cockpit definitions, sources and reference date."),
    copy("Les preuves de pipeline complet restent distinctes du cockpit.", "Full pipeline evidence remains separate from cockpit evidence."), ["Workday", "Lucca", "Greenhouse"], ["Lakeflow", "Unity Catalog", "Databricks SQL"], "/trust", "cockpit"),
  book("HR11", "workforce", copy("Budget et coûts de personnel", "Workforce cost planning"),
    copy("Quel plan reste finançable quand le budget change ?", "Which plan remains affordable when the budget changes?"),
    copy("Rendre les arbitrages coût-capacité explicites.", "Make cost-capacity trade-offs explicit."), copy("Coût modélisé / budget · €", "Modelled cost / budget · €"),
    copy("Modifier le budget et les coûts unitaires dans le laboratoire.", "Change the budget and unit costs in the scenario lab."),
    copy("Une simulation n’est ni une paie réelle ni une dépense autorisée.", "A simulation is neither actual payroll nor authorised spending."), ["Workday", "Lucca"], ["Databricks SQL", "AI/BI"], "/workforce", "cockpit"),
  book("HR12", "talent", copy("Planification des compétences", "Strategic skills planning"),
    copy("Quelles compétences seront nécessaires au prochain cycle ?", "Which skills will the next business cycle require?"),
    copy("Comparer besoins futurs et inventaire de compétences déclaré.", "Compare future demand with a declared skills inventory."), copy("Écart de compétences · postes couverts", "Skills gap · roles covered"),
    copy("Atelier : définir taxonomie, sources et validation humaine.", "Workshop: define taxonomy, sources and human validation."),
    copy("Inventaire de compétences non connecté dans cette version.", "Skills inventory is not connected in this version."), ["SAP SuccessFactors", "Workday"], ["Vector Search", "Databricks SQL"], "/talent"),
  book("HR13", "talent", copy("Formation et montée en compétences", "Learning & reskilling pathways"),
    copy("Quelle formation répond à un besoin professionnel explicite ?", "Which learning path addresses an explicit business need?"),
    copy("Préparer des parcours volontaires validés par les équipes.", "Prepare voluntary learning paths for team review."), copy("Couverture des compétences · %", "Skill coverage · %"),
    copy("Atelier : relier formations et compétences sans score employé.", "Workshop: connect courses and skills without employee scoring."),
    copy("Aucune recommandation individualisée connectée.", "No connected individual recommendation service."), ["SAP SuccessFactors", "Catalogue LMS / LMS catalog"], ["Vector Search", "Genie"], "/talent"),
  book("HR14", "retention", copy("Écoute et engagement des équipes", "Team listening & engagement"),
    copy("Quels thèmes reviennent dans les retours volontaires ?", "Which themes recur in voluntary team feedback?"),
    copy("Préparer une discussion sur des tendances agrégées.", "Prepare a discussion around aggregate themes."), copy("Participation agrégée · %", "Aggregate participation · %"),
    copy("Atelier : fixer seuils de groupe, consentement et rétention.", "Workshop: define group thresholds, consent and retention."),
    copy("Pas d’analyse des messages privés ni d’inférence émotionnelle.", "No private-message analysis or emotional inference."), ["Enquêtes volontaires / Voluntary surveys"], ["AI Functions", "Unity Catalog"], "/retention"),
  book("HR15", "operations", copy("Assistant de politiques RH", "HR policy knowledge assistant"),
    copy("Quelle politique s’applique à ce pays et à cette date ?", "Which policy applies to this country and date?"),
    copy("Retrouver un passage approuvé avec sa date et sa juridiction.", "Retrieve an approved passage with date and jurisdiction."), copy("Réponses citées · taux de couverture", "Cited answers · coverage rate"),
    copy("Atelier : corpus bilingue versionné et évaluation des citations.", "Workshop: versioned bilingual corpus and citation evaluation."),
    copy("Corpus de politiques non connecté ; pas de conseil juridique.", "Policy corpus is not connected; no legal advice."), ["Documents RH approuvés / Approved HR documents"], ["Vector Search", "Agent Framework", "MLflow"], "/ask"),
  book("HR16", "workforce", copy("Planification des équipes terrain", "Frontline capacity planning"),
    copy("Le plan de capacité absorbe-t-il la demande saisonnière ?", "Can the capacity plan absorb seasonal demand?"),
    copy("Tester une enveloppe de capacité au niveau collectif.", "Test an aggregate capacity envelope."), copy("Demande non couverte · ETP-mois", "Uncovered demand · FTE-months"),
    copy("Preset Commerce : explorer un écart hypothétique de 24 ETP-mois.", "Retail preset: explore a hypothetical 24 FTE-month gap."),
    copy("Pas de planning individuel ni de contrôle du temps de travail.", "No individual rostering or working-time compliance engine."), ["Workday", "Prévisions de demande / Demand forecasts"], ["Databricks SQL", "MLflow"], "/workforce"),
  book("HR17", "operations", copy("Revue des exceptions de paie", "Payroll exception review"),
    copy("Quels contrôles nécessitent une revue avant clôture ?", "Which checks need human review before payroll closes?"),
    copy("Définir un contrôle réconciliable et une procédure d’escalade.", "Define a reconcilable control and an escalation process."), copy("Exceptions revues · nombre", "Reviewed exceptions · count"),
    copy("Atelier : rapprochement paie-SIRH sur données fictives.", "Workshop: reconcile payroll and HRIS using fictional data."),
    copy("Le cockpit montre des dossiers, pas un détecteur de fraude paie.", "The cockpit shows cases, not a payroll fraud detector."), ["Lucca", "Workday"], ["Lakeflow", "Databricks SQL", "Lakebase"], "/people-ops"),
  book("HR18", "workforce", copy("Intégration organisationnelle", "Organisational integration planning"),
    copy("Comment comparer deux périmètres avec les mêmes définitions ?", "How can two organisations compare using shared definitions?"),
    copy("Harmoniser des agrégats avant un atelier d’intégration.", "Harmonise aggregates before an integration workshop."), copy("Définitions réconciliées · nombre", "Reconciled definitions · count"),
    copy("Atelier : périmètres, dates et règles de rapprochement.", "Workshop: scopes, dates and reconciliation rules."),
    copy("Aucune recommandation de licenciement ou de sélection individuelle.", "No dismissal recommendations or individual selection."), ["Workday", "SAP SuccessFactors"], ["Unity Catalog", "Delta Sharing", "Databricks SQL"], "/workforce"),
  book("HR19", "retention", copy("Revue de l’équité des processus", "Process fairness review"),
    copy("Nos mesures révèlent-elles des écarts à investiguer ?", "Do process measures reveal differences worth investigating?"),
    copy("Définir une revue agrégée avec des spécialistes du domaine.", "Define an aggregate review with domain specialists."), copy("Mesures validées · couverture", "Validated measures · coverage"),
    copy("Atelier : base légale, seuils de groupe et comparabilité.", "Workshop: lawful basis, group thresholds and comparability."),
    copy("Aucune inférence de caractéristique protégée ni preuve d’équité automatisée.", "No protected-characteristic inference or automated proof of fairness."), ["Agrégats approuvés / Approved aggregates"], ["Unity Catalog", "AI/BI"], "/retention"),
  book("HR20", "operations", copy("Gouvernance des actions RH", "Human-reviewed HR actions"),
    copy("Qui a proposé, approuvé et validé ce plan ?", "Who proposed, approved and committed this plan?"),
    copy("Conserver une piste d’audit et éviter les doubles validations.", "Keep an audit trail and prevent duplicate commits."), copy("Actions auditées · transitions d’état", "Audited actions · state transitions"),
    copy("Parcours proposer → revue humaine → validation dans la file fictive.", "Propose → human review → commit in the fictional queue."),
    copy("Les droits viennent du serveur, jamais de la persona choisie.", "Permissions come from the server, never from the selected persona."), ["File de démonstration / Demo action queue"], ["Lakebase", "Databricks Apps", "Unity Catalog"], "/workforce", "cockpit"),
];

export interface Assumptions {
  gap: number; budget: number; target: number; retain: number; hire: number; redeploy: number;
  retainCost: number; hireCost: number; redeployCost: number;
  retainGain: number; hireGain: number; redeployGain: number;
}
export const baseline: Assumptions = { gap: 13.5, budget: 450000, target: 5, retain: 5, hire: 4, redeploy: 2,
  retainCost: 10000, hireCost: 70000, redeployCost: 30000, retainGain: 0.16, hireGain: 1, redeployGain: 2.2 };
export const presets = [
  { id: "technology", name: copy("Technologie", "Technology"), organization: "Care Coordination Platform", context: copy("Un lancement produit dépend de compétences rares.", "A product launch depends on scarce skills."), assumptions: baseline },
  { id: "healthcare", name: copy("Santé", "Healthcare"), organization: "Clairval Health — fictional", context: copy("Un nouveau service demande une capacité coordonnée.", "A new service needs coordinated capacity."), assumptions: { ...baseline, gap: 18, budget: 600000, target: 6, retain: 6, hire: 5, redeploy: 3 } },
  { id: "manufacturing", name: copy("Industrie", "Manufacturing"), organization: "Atelier Horizon — fictional", context: copy("Une nouvelle ligne transforme les besoins en compétences.", "A new production line changes skill requirements."), assumptions: { ...baseline, gap: 22, budget: 650000, target: 7, retain: 8, hire: 4, redeploy: 5, hireCost: 55000 } },
  { id: "retail", name: copy("Commerce", "Retail"), organization: "Maison Rivage — fictional", context: copy("La saison haute exige un plan partagé entre équipes.", "Peak season needs a coordinated plan across teams."), assumptions: { ...baseline, gap: 24, budget: 500000, target: 8, retain: 8, hire: 8, redeploy: 4, hireCost: 35000, redeployCost: 15000 } },
  { id: "services", name: copy("Services", "Professional services"), organization: "Nova Advisory — fictional", context: copy("Un nouveau portefeuille de projets crée un écart de capacité.", "A new project portfolio creates a capacity gap."), assumptions: { ...baseline, gap: 16, budget: 500000, target: 5, retain: 5, hire: 3, redeploy: 4, hireCost: 80000 } },
] as const;
export type PresetId = typeof presets[number]["id"];
export interface StudioConfig {
  version: 1; synthetic: true; preset: PresetId; organization: string; minutes: 5 | 10 | 20;
  selected: string[]; assumptions: Assumptions;
}
export const defaultConfig: StudioConfig = { version: 1, synthetic: true, preset: "technology", organization: presets[0].organization,
  minutes: 20, selected: ["HR01", "HR02", "HR03", "HR05", "HR20"], assumptions: { ...baseline } };
export const bounds: Record<keyof Assumptions, [number, number, number]> = {
  gap: [1, 200, 0.5], budget: [0, 5000000, 10000], target: [0.5, 200, 0.5],
  retain: [0, 30, 1], hire: [0, 30, 1], redeploy: [0, 30, 1],
  retainCost: [0, 200000, 1000], hireCost: [0, 200000, 1000], redeployCost: [0, 200000, 1000],
  retainGain: [0, 6, 0.01], hireGain: [0, 6, 0.01], redeployGain: [0, 6, 0.01],
};
export function validateConfig(input: unknown): StudioConfig {
  if (!input || typeof input !== "object") throw new Error("Invalid configuration");
  const c = input as Record<string, unknown>;
  if (c.version !== 1 || c.synthetic !== true || !presets.some(p => p.id === c.preset) ||
      typeof c.organization !== "string" || !c.organization.trim() || c.organization.length > 80 ||
      ![5, 10, 20].includes(Number(c.minutes)) || typeof c.minutes !== "number" ||
      !Array.isArray(c.selected) || c.selected.length < 1 || c.selected.length > 20 ||
      new Set(c.selected).size !== c.selected.length || c.selected.some(id => !playbooks.some(p => p.id === id)) ||
      !c.assumptions || typeof c.assumptions !== "object") throw new Error("Invalid configuration");
  const raw = c.assumptions as Record<string, unknown>;
  const assumptions = { ...baseline };
  for (const key of Object.keys(bounds) as (keyof Assumptions)[]) {
    const value = raw[key]; const [min, max, step] = bounds[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max ||
        (step === 1 && !Number.isInteger(value))) throw new Error("Invalid assumptions");
    assumptions[key] = value;
  }
  return { version: 1, synthetic: true, preset: c.preset as PresetId, organization: c.organization.trim(),
    minutes: c.minutes as StudioConfig["minutes"], selected: c.selected as string[], assumptions };
}
export function calculate(a: Assumptions) {
  const cost = Math.round(a.retain * a.retainCost + a.hire * a.hireCost + a.redeploy * a.redeployCost);
  const potential = a.retain * a.retainGain + a.hire * a.hireGain + a.redeploy * a.redeployGain;
  const recovered = Math.round(Math.min(a.gap, potential) * 1000) / 1000;
  const residual = Math.round(Math.max(0, a.gap - potential) * 1000) / 1000;
  return { cost, recovered, residual, headroom: a.budget - cost, withinBudget: cost <= a.budget,
    meetsTarget: residual < a.target, overcapacity: Math.round(Math.max(0, potential - a.gap) * 1000) / 1000 };
}
export const STORAGE_KEY = "hr-demo-studio-v1";
export function restoreConfig(): { config: StudioConfig; warning: boolean } {
  try { const value = localStorage.getItem(STORAGE_KEY); return { config: value ? validateConfig(JSON.parse(value)) : structuredClone(defaultConfig), warning: false }; }
  catch { return { config: structuredClone(defaultConfig), warning: true }; }
}
