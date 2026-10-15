export type Language = "fr" | "en";
export type Persona = "cpo" | "hrbp" | "ta" | "analyst";
export type PagePath = "/" | "/briefing" | "/retention" | "/talent" | "/workforce" | "/people-ops" | "/ask" | "/trust" | "/studio" | "/dnb" | "/enterprise" | "/agent-workspace";

export interface ScopeMetrics {
  membership: { scope_id: string; cohort_id: string | null; country_codes: string[]; organization_ids: string[] };
  scope_available: boolean;
  headcount: number;
  person_days: number;
  voluntary_exits: number;
  critical_open_roles: number;
  engineering_roles: number;
  product_roles: number;
  people_roles: number;
  pay_compression_exposure: number | null;
  overdue_cases: number;
  onboarding_cases: number;
  mobility_cases: number;
  payroll_cases: number;
  eligible_candidates: number;
  display: { attrition_percent: string; median_time_to_fill_days: string; assumed_capacity_ratio: string };
}
export interface ScenarioOption {
  option_id: "blended" | "do_nothing" | "recruit_only";
  retain: number;
  hire: number;
  redeploy: number;
  gross_gap_milli: number;
  residual_gap_milli: number;
  cost_eur_cents: number;
  budget_eur_cents: number;
  retain_cost_cents: number;
  hire_cost_cents: number;
  redeploy_cost_cents: number;
  within_budget: boolean;
}
export interface DemoAction {
  id: string;
  option_id: string;
  state: string;
  version: number;
  rationale: string;
  created_at: string;
  updated_at: string;
  review_note: string | null;
}
export interface Candidate {
  candidate_id: string;
  display_name: string;
  role_title: string;
  skills: string[];
  gaps: string[];
  citations: { document_id: string; passage: string; content_sha256: string }[];
  consent_valid: boolean;
}
export interface CockpitData {
  scenario_id: string;
  as_of: string;
  synthetic: true;
  reference: { scopes: { hero: ScopeMetrics; company: ScopeMetrics }; options: ScenarioOption[] };
  session: { principal_label: string; authentication_mode: string; permissions: string[]; persona_preview_grants_access: false };
  candidates: Candidate[];
  cases: { case_id: string; category: string; status: string; due_at: string; scope_label: string }[];
  sources: { id: string; label: string; event_count: number }[];
  actions: DemoAction[];
  audit: { id: string; event_at: string; action: string; outcome: string; actor_label: string; detail: string }[];
  capabilities: { actions_available: boolean; action_store: string; assistant_mode: string; dashboard_url: string | null };
  freshness: { label: string; source_commit: string };
}

export const personas: Record<Persona, { name: string; role: string; fr: string; en: string }> = {
  cpo: { name: "Claire", role: "CPO", fr: "Décider avec une vue d’ensemble", en: "Decide with the whole picture" },
  hrbp: { name: "Sofia", role: "HRBP France", fr: "Comprendre et accompagner", en: "Understand and support" },
  ta: { name: "Mehdi", role: "Talent Acquisition", fr: "Recruter avec des preuves", en: "Recruit with evidence" },
  analyst: { name: "Alex", role: "People Analytics", fr: "Expliquer chaque indicateur", en: "Explain every metric" },
};

export function numberLabel(value: number | string, language: Language, digits = 0) {
  return new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-GB", { maximumFractionDigits: digits }).format(Number(value));
}
export function euroLabel(cents: number, language: Language) {
  return new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100);
}
