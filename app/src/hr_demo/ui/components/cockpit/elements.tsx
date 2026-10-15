import type { ReactNode } from "react";
import { ArrowRight, Info, Database, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { PagePath } from "@/lib/cockpit-types";
import { usePreferences } from "./context";

export function PageHeading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <header className="page-heading" data-tour="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>{children}</header>;
}
export function Panel({ title, label, children, className = "", action, tour }: { title?: string; label?: string; children: ReactNode; className?: string; action?: ReactNode; tour?: string }) {
  return <section className={`panel ${className}`} data-tour={tour}>{(title || action) && <div className="panel-heading"><div>{label && <p className="eyebrow">{label}</p>}<h2>{title}</h2></div>{action}</div>}{children}</section>;
}
export function Metric({ label, value, unit, detail, metric, tone = "blue" }: { label: string; value: ReactNode; unit?: string; detail: string; metric: string; tone?: string }) {
  const { t, openSources } = usePreferences();
  return <article className={`metric metric-${tone}`} data-test-id={`metric-${metric}`}><div className="metric-label">{label}<button className="icon-button" aria-label={t(`Définition : ${label}`, `Definition: ${label}`)} onClick={() => openSources(metric)}><Info size={14}/></button></div><div className="metric-value">{value}<span>{unit}</span></div><p>{detail}</p></article>;
}
export function GoLink({ to, children }: { to: PagePath; children: ReactNode }) {
  return <Link to={to} className="text-link">{children}<ArrowRight size={15}/></Link>;
}
export function SourceLink({ metric, label }: { metric?: string; label?: string }) {
  const { t, openSources } = usePreferences();
  return <button className="source-link" data-test-id={`source-${metric || "all"}`} onClick={() => openSources(metric)}><Database size={13}/>{label || t("Sources et définition", "Sources & definition")}</button>;
}
export function TrustNote({ children }: { children: ReactNode }) {
  return <div className="trust-note"><ShieldCheck size={17}/><p>{children}</p></div>;
}
export function ComparisonBars({ rows, unit = "", max }: { rows: { label: string; value: number; display: string; muted?: boolean }[]; unit?: string; max?: number }) {
  const limit = max || Math.max(...rows.map(row => row.value)) * 1.15;
  return <div className="comparison-bars">{rows.map(row => <div className="comparison-row" key={row.label}><div><span>{row.label}</span><strong>{row.display}{unit}</strong></div><div className="bar-track"><div className={row.muted ? "bar-fill muted" : "bar-fill"} style={{ width: `${Math.min(100, row.value / limit * 100)}%` }}/></div></div>)}</div>;
}
