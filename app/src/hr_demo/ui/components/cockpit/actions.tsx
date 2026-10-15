import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, CheckCheck, ClipboardCheck, Plus, ShieldCheck, X } from "lucide-react";
import { useCommitAction, useProposeAction, useReviewAction } from "@/lib/api";
import { requestError } from "@/lib/cockpit-errors";
import type { DemoAction, ScenarioOption } from "@/lib/cockpit-types";
import { euroLabel, numberLabel } from "@/lib/cockpit-types";
import { useCockpit, usePreferences } from "./context";
import { Panel, TrustNote } from "./elements";

function useActionNames() {
  const { t } = usePreferences();
  return { proposed: t("Proposée", "Proposed"), reviewed: t("Examinée", "Reviewed"), approved: t("Approuvée", "Approved"), rejected: t("Rejetée", "Rejected"), committed: t("Validée", "Committed"), reflected: t("Relue et reflétée", "Reflected on read") } as Record<string, string>;
}

export function ActionQueue({ selectedOption }: { selectedOption: ScenarioOption }) {
  const data = useCockpit();
  const { t, language } = usePreferences();
  const client = useQueryClient();
  const [rationale, setRationale] = useState("");
  const [error, setError] = useState("");
  const proposal = useProposeAction();
  const propose = async () => {
    setError("");
    try { await proposal.mutateAsync({ option_id: selectedOption.option_id, rationale }); setRationale(""); await client.invalidateQueries(); }
    catch (failure) { setError(requestError(failure)); }
  };
  return <Panel title={t("De l’option à la décision", "From option to decision")} label={t("REVUE HUMAINE · FILE FICTIVE", "HUMAN REVIEW · FICTIONAL QUEUE")} tour="action-queue"><div className="action-process">{[t("Proposer", "Propose"),t("Examiner", "Review"),t("Approuver / rejeter", "Approve / reject"),t("Valider", "Commit"),t("Relire", "Read back")].map((label, index) => <span key={label}><i>{index + 1}</i>{label}</span>)}</div>
    <form className="proposal-form" onSubmit={event => { event.preventDefault(); void propose(); }}><div><label htmlFor="proposal-rationale">{t("Motif de la proposition · 10–600 caractères", "Proposal rationale · 10–600 characters")}</label><p>{selectedOption.retain} {t("fidéliser", "retain")} + {selectedOption.hire} {t("recruter", "hire")} + {selectedOption.redeploy} {t("mobilités", "redeploy")} · {euroLabel(selectedOption.cost_eur_cents, language)} · {numberLabel(selectedOption.residual_gap_milli / 1000, language, 1)} {t("ETP-mois résiduels", "residual FTE-months")}</p><textarea id="proposal-rationale" data-test-id="proposal-rationale" value={rationale} onChange={event => setRationale(event.target.value)} minLength={10} maxLength={600} required placeholder={t("Expliquez pourquoi cette option mérite une revue humaine…", "Explain why this option deserves human review…")}/></div><button className="primary-button" data-test-id="propose-action" disabled={!data.capabilities.actions_available || proposal.isPending || rationale.trim().length < 10} type="submit"><Plus size={16}/>{proposal.isPending ? t("Enregistrement…", "Saving…") : t("Proposer cette option", "Propose this option")}</button></form>
    {!data.capabilities.actions_available && <p className="inline-error" role="status">{t("La file d’actions est indisponible sur cette instance.", "The action queue is unavailable on this instance.")}</p>}{error && <p className="inline-error" role="alert">{error}</p>}
    <div className="action-queue">{data.actions.length === 0 ? <div className="empty-action"><ClipboardCheck size={27}/><h3>{t("La prochaine décision commence ici", "The next decision starts here")}</h3><p>{t("Aucune proposition enregistrée. Créez une proposition fictive pour ouvrir la revue humaine.", "No saved proposals. Create a fictional proposal to open human review.")}</p></div> : data.actions.map(action => <ActionCard key={action.id} action={action}/>)}</div>
    <TrustNote>{t("La validation enregistre seulement une action fictive dans la file du démonstrateur. Aucun outil RH externe n’est modifié. L’assistant ne peut pas approuver ou valider.", "Committing only records a fictional action in the demo queue. No external HR system is changed. The assistant cannot approve or commit.")}</TrustNote>
  </Panel>;
}

function ActionCard({ action }: { action: DemoAction }) {
  const data = useCockpit();
  const { t, language } = usePreferences();
  const names = useActionNames();
  const client = useQueryClient();
  const review = useReviewAction();
  const commit = useCommitAction();
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const option = data.reference.options.find(item => item.option_id === action.option_id);
  const decide = async (decision: "approve" | "reject") => {
    setError("");
    try { await review.mutateAsync({ params: { action_id: action.id }, data: { decision, expected_version: action.version, note } }); setConfirmed(false); await client.invalidateQueries(); }
    catch (failure) { setError(requestError(failure)); await client.invalidateQueries(); }
  };
  const finish = async () => {
    setError("");
    try { await commit.mutateAsync({ params: { action_id: action.id }, data: { expected_version: action.version, idempotency_key: `ui-${action.id}-${action.version}` } }); await client.invalidateQueries(); }
    catch (failure) { setError(requestError(failure)); await client.invalidateQueries(); }
  };
  return <article className="action-card" data-test-id={`action-${action.id}`}><div className="action-card-heading"><div><span className="eyebrow">{action.id}</span><h3>{action.option_id === "blended" ? t("Plan mixte", "Blended plan") : action.option_id === "recruit_only" ? t("Recrutement seul", "Hiring only") : t("Sans intervention", "No intervention")}</h3></div><span className={`status-chip ${["approved", "reflected"].includes(action.state) ? "green" : action.state === "rejected" ? "amber" : "blue"}`}>{action.state === "reflected" && <CheckCheck size={13}/>}<span data-test-id="action-state">{names[action.state] || action.state}</span></span></div><p className="action-rationale">{action.rationale}</p>{option && <div className="action-summary">{euroLabel(option.cost_eur_cents, language)} · {numberLabel(option.residual_gap_milli / 1000, language, 1)} {t("ETP-mois résiduels", "residual FTE-months")}</div>}
    {action.review_note && <p className="review-note"><ShieldCheck size={14}/>{action.review_note}</p>}
    {action.state === "proposed" && <div className="action-review"><label htmlFor={`review-${action.id}`}>{t("Votre note de revue · 10–600 caractères", "Your review note · 10–600 characters")}</label><textarea id={`review-${action.id}`} data-test-id="review-note" value={note} onChange={event => setNote(event.target.value)} minLength={10} maxLength={600} placeholder={t("Documentez les hypothèses, le coût et votre décision…", "Document the assumptions, cost and your decision…")}/><label className="review-confirmation"><input type="checkbox" checked={confirmed} data-test-id="review-confirmation" onChange={event => setConfirmed(event.target.checked)}/><span>{t("J’ai examiné cette option fictive, son coût et ses hypothèses.", "I have reviewed this fictional option, its cost and assumptions.")}</span></label><div className="review-buttons"><button className="secondary-button" disabled={review.isPending || !confirmed || note.trim().length < 10} onClick={() => void decide("reject")} data-test-id="reject-action"><X size={15}/>{t("Rejeter", "Reject")}</button><button className="primary-button" disabled={review.isPending || !confirmed || note.trim().length < 10} onClick={() => void decide("approve")} data-test-id="approve-action"><Check size={15}/>{t("Approuver le scénario fictif", "Approve fictional scenario")}</button></div></div>}
    {action.state === "approved" && <div className="commit-action"><p>{t("L’approbation est enregistrée. Validez pour inscrire l’action fictive, puis vérifier sa relecture.", "Approval is recorded. Commit to record the fictional action, then verify it on the next read.")}</p><button className="primary-button" data-test-id="commit-action" disabled={commit.isPending} onClick={() => void finish()}><CheckCheck size={16}/>{t("Valider l’action fictive", "Commit fictional action")}</button></div>}
    {error && <p className="inline-error" role="alert">{error}</p>}<footer><span>{t("Version", "Version")} {action.version}</span><time dateTime={action.updated_at}>{new Date(action.updated_at).toLocaleString(language === "fr" ? "fr-FR" : "en-GB")}</time></footer>
  </article>;
}
