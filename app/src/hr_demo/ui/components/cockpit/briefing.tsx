import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, RefreshCw, Sparkles } from "lucide-react";
import { agentBriefingKey, useAgentBriefing, useRefreshAgentBriefing } from "@/lib/api";
import { usePreferences } from "./context";
import { Panel } from "./elements";
import { Markdown } from "./markdown";

export function PersonaBriefing() {
  const { persona, language, t } = usePreferences();
  const queryClient = useQueryClient();
  const [refreshError, setRefreshError] = useState(false);
  const params = { persona, language };
  const query = useAgentBriefing({ params, query: {
    retry: false, staleTime: 60_000,
    refetchInterval: query => query.state.data?.data.status === "generating" ? 3000 : false,
  } });
  const refresh = useRefreshAgentBriefing();
  const briefing = query.data?.data;
  const busy = query.isPending || briefing?.status === "generating" || refresh.isPending;
  const regenerate = async () => {
    setRefreshError(false);
    try {
      const result = await refresh.mutateAsync({ ...params, refresh: true });
      queryClient.setQueryData(agentBriefingKey(params), result);
    } catch { setRefreshError(true); }
  };
  return <div data-test-id="persona-briefing" data-persona={persona} data-language={language}>
    <Panel title={t("Votre regard sur le collectif", "Your perspective on the cohort")} label="GENIE + SUPERVISOR"
      action={<button className="secondary-button" disabled={busy} onClick={() => void regenerate()} aria-label={t("Recharger le briefing validé", "Reload reviewed briefing")}><RefreshCw size={14}/>{t("Recharger", "Reload")}</button>}>
      <div className="persona-briefing-content" aria-live="polite" aria-busy={busy}>
        {busy && <p role="status"><Sparkles size={15}/> {t("Préparation de votre synthèse à partir des données agrégées…", "Preparing your summary from aggregate data…")}</p>}
        {briefing?.answer && <div className="persona-briefing-answer"><Markdown>{briefing.answer}</Markdown></div>}
        {(query.isError || briefing?.status === "unavailable") && <p>{t("La synthèse IA est momentanément indisponible. Les indicateurs et scénarios restent accessibles ci-dessous.", "The AI summary is temporarily unavailable. Metrics and scenarios remain available below.")}</p>}
        {(refreshError || briefing?.detail === "refresh_failed_cached_available") && <p role="status">{t("Actualisation indisponible ; la dernière synthèse reste affichée.", "Refresh unavailable; the last summary remains displayed.")}</p>}
        <div className="persona-briefing-meta">
          <span>{t("Données synthétiques figées au 14 sept. 2026 · hypothèses à discuter", "Synthetic data frozen on 14 Sep 2026 · assumptions for discussion")}</span>
          {briefing?.generated_at && <span>{t("Généré le", "Generated")}: {new Date(briefing.generated_at).toLocaleString(language === "fr" ? "fr-FR" : "en-GB")} · {t("synthèse conservée · revue IA indépendante", "saved summary · independent AI review")}</span>}
          {briefing?.genie_url?.startsWith("https://") && <a href={briefing.genie_url} target="_blank" rel="noreferrer">{t("Explorer les données dans Genie", "Explore the data in Genie")}<ArrowUpRight size={13}/></a>}
        </div>
        {briefing?.answer && <p className="persona-briefing-meta">{t("Revue technique par IA ; validation humaine des décisions requise.", "AI technical review; decisions still require human approval.")}</p>}
        {briefing?.citations?.length ? <details><summary>{t("Tables interrogées pour cette réponse", "Tables queried for this answer")}</summary><ul>{briefing.citations.map(table => <li key={table}>{table}</li>)}</ul><p>{t("Réponse conservée après revue des résultats SQL. Vérifiez les hypothèses avant toute décision.", "Answer saved after review of the SQL results. Check assumptions before making a decision.")}</p></details> : null}
      </div>
    </Panel>
  </div>;
}
