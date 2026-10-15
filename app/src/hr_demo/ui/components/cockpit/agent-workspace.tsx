import { useEffect, useState } from "react";
import { ArrowRight, Check, Database, Send, ShieldCheck } from "lucide-react";
import { usePreferences } from "./context";
import { Markdown } from "./markdown";
import { LoadingBar } from "./loading-bar";
import { enterpriseApi } from "@/lib/enterprise";
import type { Answer, Catalog, Snapshot } from "@/lib/enterprise";
import "@/styles/enterprise.css";

export function AgentWorkspacePage() {
  const { t,language }=usePreferences();
  const [catalog,setCatalog]=useState<Catalog|null>(null);
  const [run,setRun]=useState("");const [entity,setEntity]=useState("ALL");
  const [question,setQuestion]=useState("");const [data,setData]=useState<Snapshot|null>(null);
  const [answer,setAnswer]=useState<Answer|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  useEffect(()=>{const control=new AbortController();enterpriseApi<Catalog>("catalog",undefined,control.signal).then(c=>{setCatalog(c);setRun(c.runs[0]?.id||"");}).catch(e=>{if(!control.signal.aborted)setError(e.message);});return()=>control.abort();},[]);
  async function ask() {
    if(busy||!run)return;setBusy(true);setError("");setData(null);setAnswer(null);
    const scope={run_id:run,entity,period:"2026-09",story:"self_service"};
    try { const snapshot=await enterpriseApi<Snapshot>("tools/query",scope);setData(snapshot);
      if(catalog?.model_configured) setAnswer(await enterpriseApi<Answer>("explain",{...scope,language,question:question||t("Quels sujets nécessitent une revue RH locale ?","What needs local HR review?")}));
    } catch(e){setError(e instanceof Error?e.message:"Request unavailable");}finally{setBusy(false);}
  }
  return <div className="enterprise-page" data-test-id="simulated-agent-workspace"><header className="enterprise-heading"><div><span className="enterprise-eyebrow">{t("INTERFACE EXTERNE SIMULÉE", "SIMULATED EXTERNAL INTERFACE")}</span><h1>{t("Espace agent", "Agent workspace")}</h1><p>{t("Simulation d'un parcours Dust · aucune connexion à un tenant Dust", "Dust-style workflow simulation · no Dust tenant connection")}</p></div><ShieldCheck size={28}/></header><section className="enterprise-band"><div className="enterprise-toolbar"><label>{t("Répétition", "Rehearsal")}<select aria-label={t("Répétition", "Rehearsal")} disabled={busy} value={run} onChange={e=>{setRun(e.target.value);setData(null);setAnswer(null);}}>{catalog?.runs.map(r=><option key={r.id} value={r.id}>{r.label} · {r.id.slice(0,8)}</option>)}</select></label><label>{t("Périmètre", "Scope")}<select aria-label={t("Périmètre", "Scope")} value={entity} disabled={busy} onChange={e=>{setEntity(e.target.value);setData(null);setAnswer(null);}}><option value="ALL">{t("Mes entités", "My entities")}</option>{catalog?.entities.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label></div><form onSubmit={e=>{e.preventDefault();void ask();}}><label className="enterprise-question">{t("Question RH", "HR question")}<textarea rows={3} maxLength={1500} value={question} onChange={e=>setQuestion(e.target.value)} placeholder={t("Quels sujets nécessitent une revue RH locale ?","What needs local HR review?")}/></label><button className="primary-button" disabled={busy||!run}><Send size={16}/>{t("Interroger l'outil autorisé", "Ask the authorized tool")}</button></form><LoadingBar active={busy} label={t("Lecture du périmètre autorisé", "Reading the authorized scope")}/>{error&&<p role="alert" className="enterprise-message error">{error}</p>}{data&&<div className="enterprise-answer"><div className="enterprise-answer-meta"><Check size={14}/> POST /api/enterprise/tools/query · {data.query.engine} · {t("Révision", "Revision")} {data.run.revision}</div><p><strong>{data.totals.overdue}</strong> {t("dossiers hors délai dans", "overdue cases across")} {data.entities.join(", ")} · {t("données synthétiques", "synthetic data")}</p>{answer&&<><p className="enterprise-source">{t("Réponse IA en direct · à vérifier", "Live AI-generated response · verify")}</p><Markdown>{answer.answer}</Markdown></>}<details><summary><Database size={14}/> {t("Trace de l'outil", "Tool trace")}</summary><p>{data.query.authorization} · {data.query.execution_identity}</p><pre>{data.query.sql}</pre><code>{data.evidence_hash}</code><p>Audit: {data.query.audit_id}</p></details></div>}</section><section className="enterprise-band"><h2>{t("Contrat d'intégration", "Integration contract")}</h2><ol className="enterprise-lineage"><li>{t("Export GCP simulé", "Simulated GCP export")}</li><li>POST /api/enterprise/ingest-file</li><li>{t("Révision validée + SQL au périmètre autorisé", "Validated revision + scoped SQL")}</li><li>POST /api/enterprise/tools/query</li><li>{t("Réponse et sources dans l'interface choisie", "Answer and sources in the chosen interface")}</li></ol><a className="secondary-button" href="/enterprise">{t("Retour à la décision", "Back to decision")}<ArrowRight size={15}/></a></section></div>;
}
