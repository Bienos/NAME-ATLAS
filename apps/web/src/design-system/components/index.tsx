import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

type Size = "sm" | "md" | "lg";
type ButtonVariant = "primary" | "secondary" | "ghost" | "amber";

export function Button({ variant = "primary", size = "md", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: Size }) {
  return <button className={`atlas-button atlas-button-${variant} atlas-size-${size} ${className}`} {...props} />;
}

export function IconButton({ label, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <Button className="atlas-icon-button" aria-label={label} {...props} />;
}

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`atlas-input ${className}`} {...props} />;
}

export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <TextInput className="atlas-search-input" type="search" {...props} />;
}

export function Tabs({ children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className="atlas-tabs" role="tablist" {...props}>{children}</div>;
}

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`atlas-badge ${className}`}>{children}</span>;
}

export function ConfidenceBadge({ level }: { level: "VERIFIED" | "LIKELY" | "POSSIBLE" | "UNCONFIRMED" | "CONFLICTING" | "INSUFFICIENT_DATA" }) {
  return <span className="atlas-confidence" data-confidence={level}><span aria-hidden="true">●</span>{level.replaceAll("_", " ")}</span>;
}

export function SourceBadge({ children }: { children: ReactNode }) { return <Badge className="atlas-source-badge">{children}</Badge>; }

export function Panel({ children, level = 1, className = "" }: { children: ReactNode; level?: 1 | 2 | 3 | "paper"; className?: string }) {
  return <section className={`atlas-panel atlas-panel-${level} ${className}`}>{children}</section>;
}

export function SourceCard({ title, source, date, children }: { title: string; source: ReactNode; date?: ReactNode; children?: ReactNode }) {
  return <Panel level={2} className="atlas-source-card"><p className="atlas-eyebrow">SOURCE</p><h3>{title}</h3>{children}<dl className="atlas-evidence-meta"><div><dt>Źródło</dt><dd>{source}</dd></div>{date ? <div><dt>Data</dt><dd>{date}</dd></div> : null}</dl></Panel>;
}

export function EvidenceCard({ status, title, children, source, date }: { status: Parameters<typeof ConfidenceBadge>[0]["level"]; title: string; children: ReactNode; source?: ReactNode; date?: ReactNode }) {
  return <Panel level={2} className="atlas-evidence-card"><ConfidenceBadge level={status}/><h3>{title}</h3><div>{children}</div>{source ? <dl className="atlas-evidence-meta"><div><dt>Źródło</dt><dd>{source}</dd></div>{date ? <div><dt>Aktualizacja</dt><dd>{date}</dd></div> : null}</dl> : null}</Panel>;
}

export function DataStat({ value, label, meta }: { value: ReactNode; label: ReactNode; meta?: ReactNode }) {
  return <div className="atlas-data-stat"><strong>{value}</strong><span>{label}</span>{meta ? <small>{meta}</small> : null}</div>;
}

export function MapLegend({ children }: { children: ReactNode }) { return <div className="atlas-map-legend">{children}</div>; }
export function Tooltip({ children }: { children: ReactNode }) { return <span role="tooltip" className="atlas-tooltip">{children}</span>; }
export function Popover({ children, label }: { children: ReactNode; label: string }) { return <div role="dialog" aria-label={label} className="atlas-popover">{children}</div>; }
export function Modal({ children, label, open = false }: { children: ReactNode; label: string; open?: boolean }) { return open ? <div role="dialog" aria-modal="true" aria-label={label} className="atlas-modal">{children}</div> : null; }
export function Drawer({ children, label, open = false }: { children: ReactNode; label: string; open?: boolean }) { return open ? <aside role="dialog" aria-modal="true" aria-label={label} className="atlas-drawer">{children}</aside> : null; }
export function Accordion({ summary, children }: { summary: ReactNode; children: ReactNode }) { return <details className="atlas-accordion"><summary>{summary}</summary>{children}</details>; }
export function Timeline({ children }: { children: ReactNode }) { return <ol className="atlas-timeline">{children}</ol>; }
export function TimelineEvent({ date, children }: { date: ReactNode; children: ReactNode }) { return <li className="atlas-timeline-event"><time>{date}</time><div>{children}</div></li>; }
export function Citation({ children }: { children: ReactNode }) { return <cite className="atlas-citation">{children}</cite>; }
export function DatasetReference({ children }: { children: ReactNode }) { return <code className="atlas-dataset-reference">{children}</code>; }
export function RegionList({ children }: { children: ReactNode }) { return <ol className="atlas-region-list">{children}</ol>; }
export function SearchResult({ surname, meta }: { surname: string; meta?: ReactNode }) { return <div className="atlas-search-result"><strong>{surname}</strong>{meta ? <span>{meta}</span> : null}</div>; }
export function Breadcrumb({ children }: { children: ReactNode }) { return <nav aria-label="Breadcrumb" className="atlas-breadcrumb">{children}</nav>; }
export function Divider() { return <hr className="atlas-divider"/>; }

export function LoadingState({ label = "Ładowanie…" }: { label?: string }) {
  return <div className="atlas-loading" role="status" aria-live="polite"><span className="atlas-loader-contours" aria-hidden="true"/><span>{label}</span></div>;
}
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) { return <div className="atlas-state"><h3>{title}</h3>{children}</div>; }
export function ErrorState({ title, children }: { title: string; children?: ReactNode }) { return <div className="atlas-state atlas-state-error" role="alert"><h3>{title}</h3>{children}</div>; }
