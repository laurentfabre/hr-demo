import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, LockKeyhole, ShieldAlert } from "lucide-react";
import { useAccessCheck } from "@/lib/api";
import { requestError, requestStatus } from "@/lib/cockpit-errors";
import { useCockpit, usePreferences } from "./context";
import { Panel } from "./elements";

export function AccessProof() {
  const { t } = usePreferences();
  const [result, setResult] = useState<{ text: string; denied: boolean } | null>(null);
  const access = useAccessCheck();
  const client = useQueryClient();
  const testAccess = async (request: "individual_risk" | "candidate_ranking" | "salary_details") => {
    setResult(null);
    try { await access.mutateAsync({ request }); setResult({ text: t("Réponse inattendue : le refus attendu n’a pas été renvoyé.", "Unexpected response: the expected refusal was not returned."), denied: false }); }
    catch (error) { const denied = requestStatus(error) === 403; setResult({ text: `${denied ? t("Accès refusé par le serveur (403). ", "Access denied by the server (403). ") : ""}${requestError(error)}`, denied }); }
    finally { await client.invalidateQueries(); }
  };
  return <Panel title={t("Une limite visible, une trace réelle", "A visible boundary, a real record")} label={t("DÉMONTRER UN REFUS", "DEMONSTRATE A REFUSAL")} tour="access-proof"><p className="body-copy">{t("Ces demandes de démonstration interrogent le contrôle du serveur. Un refus est enregistré dans l’audit ci-dessous.", "These demo requests exercise the server control. A refusal is recorded in the audit below.")}</p><div className="access-checks">{([{ request: "individual_risk", fr: "Risque individuel de départ", en: "Individual departure risk" }, { request: "candidate_ranking", fr: "Classement des candidats", en: "Candidate ranking" }, { request: "salary_details", fr: "Salaires individuels", en: "Individual salary details" }] as const).map(item => <button key={item.request} disabled={access.isPending} onClick={() => void testAccess(item.request)} data-test-id={`deny-${item.request}`}><LockKeyhole size={19}/><span>{t(item.fr, item.en)}</span><span>{t("Tester le refus", "Test refusal")}</span></button>)}</div>{result && <div className={`access-result ${result.denied ? "denied" : "error"}`} role="status" data-test-id="access-result"><ShieldAlert size={20}/><p>{result.text}</p></div>}</Panel>;
}

export function AuditTrail({ compact = false }: { compact?: boolean }) {
  const data = useCockpit();
  const { t, language } = usePreferences();
  const audit = compact ? data.audit.slice(0, 5) : data.audit;
  return <Panel title={t("Le journal des décisions", "The decision trail")} label={t("AUDIT DE CETTE INSTANCE", "THIS INSTANCE’S AUDIT")} tour="audit-trail" action={<span className="subtle-count">{data.audit.length} {t("événements", "events")}</span>}><div className="audit-list" data-test-id="audit-trail">{audit.length === 0 ? <p className="empty-state">{t("Aucun événement enregistré. Les demandes et décisions apparaîtront ici après exécution.", "No recorded events. Requests and decisions will appear here after execution.")}</p> : audit.map(event => <article key={event.id}><span className={`audit-icon ${event.outcome.toLowerCase().includes("den") || event.outcome.toLowerCase().includes("reject") ? "amber" : "blue"}`}>{event.outcome.toLowerCase().includes("den") ? <LockKeyhole size={14}/> : <Check size={14}/>}</span><div><div className="audit-heading"><strong>{event.action}</strong><span className="audit-outcome">{event.outcome}</span></div><p>{event.detail}</p><small>{event.actor_label} · <time dateTime={event.event_at}>{new Date(event.event_at).toLocaleString(language === "fr" ? "fr-FR" : "en-GB")}</time></small></div></article>)}</div></Panel>;
}
