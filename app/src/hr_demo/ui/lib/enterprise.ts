export type Copy = { en: string; fr: string };
export type Story = { id: string; title: Copy; buyer: string; trigger: Copy; decision: Copy; outcome: Copy; question: Copy; discovery: Copy[]; success: Copy[]; reference_ids: string[] };
export type Reference = { id: string; customer: string; url: string; accessed: string; title: Copy; outcome: Copy; relevance: Copy; boundary: Copy };
export type Alternative = { id: string; name: Copy; fit: Copy; gap: Copy };
export type Catalog = { stories: Story[]; references: Reference[]; alternatives: Alternative[]; periods: string[]; entities: { id: string; name: string; currency: string; fx: string; fiscal_start: number; source: string; region: string }[]; runs: { id: string; label: string; revision: number; scale: number }[]; access: { role: string; entities: string[]; identity: string; authentication: string }; model_configured: boolean };
export type Row = { entity: string; department: string; group_name: string; currency: string; fx: string; fiscal_period: string; employees: number; contractors: number; fte_centi: number; demand_centi: number; local_cost_cents: number; eur_cost_cents: number; cases: number; overdue: number; survey_responses: number | null };
export type Plan = { hire: number; redeploy: number; budget_eur: number; hire_cost_eur: number; redeploy_cost_eur: number; hire_effect_pct: number; redeploy_effect_pct: number; rationale: string };
export type Proposal = { id: string; version: number; entity: string; state: string; source_revision: number; stale: boolean; parameters: Plan & { cost_eur: number; residual_gap_centi: number; baseline_gap_centi: number; delivery_hours_recovered: number; modeled: boolean }; review_note: string | null };
export type Query = { sql: string; parameters: (string | number)[]; elapsed_ms: number; audit_id: string; engine: string; execution_identity: string; authorization: string };
export type Snapshot = { run: { id: string; label: string; revision: number; ingested_at: string; scale: number }; scope: { story: string; period: string; entity: string }; entities: string[]; rows: Row[]; totals: Row & { gap_centi: number; local_workforce: number }; proposals: Proposal[]; batches: { id: string; status: string; revision: number; received: number; accepted: number; rejected: number; detail: string; created_at: string }[]; policies: { id: string; entity: string; version: number; effective_from: string; effective_to: string; title: Copy; passage: Copy }[]; evidence_hash: string; query: Query; freshness: { age_seconds: number; stale: boolean }; fx_basis: string; metric_definitions: Record<string,string> };
export type Answer = { answer: string; revision: number; evidence_hash: string; query: Query; engine: string; elapsed_ms: number; model: string; audit_id: string; citations: string[]; tokens: Record<string,number> };
export type Evidence = { observations: { operation: string; count: number; p50_ms: number; p95_ms: number; failures: number; input_tokens: number; output_tokens: number }[]; audit: { id: string; event_at: string; action: string; outcome: string; detail: string }[]; engine: string; source_rows: number; measured_platform_cost_eur: number | null; cost_note: string; lineage: string[]; boundaries: string[] };
export type Cost = { id: string; implementation_eur: number; monthly_platform_eur: number; monthly_operations_hours: number; monthly_cash_benefit_eur: number; monthly_hours_released: number; time_to_value_months: number };
export type ValueInput = { hourly_cost_eur: number; horizon_months: number; realization_low_pct: number; realization_high_pct: number; assumptions_source: string; alternatives: Cost[] };
export type ValueResult = { results: { id: string; tco_eur: number; productive_months: number; scenarios: { realization_pct: number; cash_benefit_eur: number; net_cash_eur: number; hours_released: number; capacity_value_eur: number; roi_pct: number | null; payback_months: number | null }[] }[] };
export type Account = { name: string; sponsor: string; problem: string; current_approach: string; baseline: string; next_decision: string; evaluation_owner: string; evaluation_date: string; target_interface: string; constraints: string };
export const defaultAccount: Account = { name: "Aster Group (fictional)", sponsor: "", problem: "", current_approach: "", baseline: "", next_decision: "", evaluation_owner: "", evaluation_date: "", target_interface: "Existing agent / read-only HTTP tool", constraints: "" };
export const defaultValue: ValueInput = { hourly_cost_eur: 70, horizon_months: 12, realization_low_pct: 30, realization_high_pct: 70, assumptions_source: "Illustrative estimates; replace with customer inputs", alternatives: ["hr_suite", "bi", "internal", "databricks"].map(id => ({ id, implementation_eur: 20000, monthly_platform_eur: 1500, monthly_operations_hours: 20, monthly_cash_benefit_eur: 5000, monthly_hours_released: 100, time_to_value_months: 2 })) };
export const defaultPlan: Plan = { hire: 8, redeploy: 12, budget_eur: 1200000, hire_cost_eur: 65000, redeploy_cost_eur: 18000, hire_effect_pct: 50, redeploy_effect_pct: 80, rationale: "" };

export async function enterpriseApi<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/enterprise/${path}`, { method: body === undefined ? "GET" : "POST", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), signal });
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { detail?: unknown };
    throw new Error(typeof error.detail === "string" ? error.detail : `Request failed (${response.status}). Check the required inputs and retry.`);
  }
  return response.json() as Promise<T>;
}

export function download(name: string, body: string, mime = "text/markdown") {
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseAccount(value: unknown): Account {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Invalid account configuration");
  const record = value as Record<string,unknown>;
  const result = { ...defaultAccount };
  for (const key of Object.keys(result) as (keyof Account)[]) {
    if (typeof record[key] !== "string" || record[key].length > 1000) throw new Error(`Invalid account field: ${key}`);
    result[key] = record[key];
  }
  return result;
}

export function fieldBrief(account: Account, story: Story, references: Reference[], language: "fr" | "en", value?: ValueResult | null) {
  const fr = language === "fr";
  const pending = fr ? "A confirmer avec le client" : "To agree with the customer";
  const lines = [`# ${account.name}: ${story.title[language]}`, "", fr ? "Proposition de travail; aucun engagement client implicite." : "Working proposal; no implied customer commitment.", "", `**${fr ? "Acheteurs" : "Buyers"}:** ${story.buyer}`, `**${fr ? "Declencheur" : "Trigger"}:** ${story.trigger[language]}`, `**${fr ? "Decision" : "Decision"}:** ${story.decision[language]}`, ""];
  for (const [key, entry] of Object.entries(account)) lines.push(`- ${key}: ${entry || pending}`);
  lines.push("", `## ${fr ? "Decouverte" : "Discovery"}`, ...story.discovery.map(q => `- ${q[language]}`), "", `## ${fr ? "Evaluation proposee" : "Proposed evaluation"}`, ...story.success.map(q => `- [ ] ${q[language]} - ${pending}`), "", fr ? "Mesurer: precision, acces, latence, cout, effort d'exploitation. Seuils, responsables et dates a convenir." : "Measure accuracy, access, latency, cost and operating effort. Agree thresholds, owners and dates.", "", `## ${fr ? "Extension" : "Expansion"}`, fr ? "1. Une entite et un indicateur reconcilies.\n2. Deuxieme entite apres validation locale.\n3. Pays/domaines supplementaires selon les resultats mesures et les autorisations." : "1. One reconciled entity and metric.\n2. A second entity after local validation.\n3. Additional countries/domains based on measured outcomes and authorization.");
  if (value) lines.push("", `## ${fr ? "Hypotheses economiques" : "Value hypothesis"}`, "```json", JSON.stringify(value, null, 2), "```", fr ? "Resultats modelises; temps libere exclu du benefice de tresorerie." : "Modeled results; released time excluded from cash benefit.");
  lines.push("", `## ${fr ? "References publiques" : "Public references"}`);
  for (const r of references.filter(r => story.reference_ids.includes(r.id))) lines.push(`- [${r.customer}](${r.url}): ${r.outcome[language]} ${r.boundary[language]}`);
  return lines.join("\n");
}
