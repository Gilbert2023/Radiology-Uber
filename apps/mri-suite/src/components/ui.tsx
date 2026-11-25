import Link from "next/link";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, Inbox, Info } from "lucide-react";
import { DISPLAY_STATUS, type DisplayStatus } from "@/lib/constants";

export function PageHeader({ title, description, icon: Icon, actions, crumbs, logo }: {
  title: string; description?: string; icon?: LucideIcon; actions?: React.ReactNode; crumbs?: { label: string; href?: string }[]; logo?: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1 text-xs text-slate-500">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              {c.href ? <Link href={c.href} className="hover:text-brand-700 hover:underline">{c.label}</Link> : <span className="text-slate-700">{c.label}</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-sm">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-brand-950 sm:text-[22px]">{title}</h1>
            {description && <p className="mt-0.5 max-w-3xl text-sm text-slate-500">{description}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {logo}
          {actions}
        </div>
      </div>
    </div>
  );
}

export function Card({ title, icon: Icon, actions, children, className, bodyClass, id, subtitle }: {
  title?: React.ReactNode; icon?: LucideIcon; actions?: React.ReactNode; children: React.ReactNode; className?: string; bodyClass?: string; id?: string; subtitle?: string;
}) {
  return (
    <section id={id} className={clsx("card scroll-mt-20", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-accent-600" aria-hidden />}
            <div>
              <h2 className="section-title">{title}</h2>
              {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={clsx(bodyClass ?? "card-pad")}>{children}</div>
    </section>
  );
}

const TONES = {
  brand: "from-brand-50 to-white text-brand-700 [&_.ic]:bg-brand-100 [&_.ic]:text-brand-700",
  accent: "from-accent-50 to-white text-accent-700 [&_.ic]:bg-accent-100 [&_.ic]:text-accent-700",
  amber: "from-amber-50 to-white text-amber-700 [&_.ic]:bg-amber-100 [&_.ic]:text-amber-700",
  red: "from-red-50 to-white text-red-700 [&_.ic]:bg-red-100 [&_.ic]:text-red-700",
  violet: "from-violet-50 to-white text-violet-700 [&_.ic]:bg-violet-100 [&_.ic]:text-violet-700",
  indigo: "from-indigo-50 to-white text-indigo-700 [&_.ic]:bg-indigo-100 [&_.ic]:text-indigo-700",
  green: "from-green-50 to-white text-green-700 [&_.ic]:bg-green-100 [&_.ic]:text-green-700",
  slate: "from-slate-50 to-white text-slate-700 [&_.ic]:bg-slate-100 [&_.ic]:text-slate-600",
  sky: "from-sky-50 to-white text-sky-700 [&_.ic]:bg-sky-100 [&_.ic]:text-sky-700",
} as const;
export type Tone = keyof typeof TONES;

export function StatCard({ label, value, icon: Icon, tone = "brand", hint, href, alert }: {
  label: string; value: React.ReactNode; icon?: LucideIcon; tone?: Tone; hint?: React.ReactNode; href?: string; alert?: boolean;
}) {
  const inner = (
    <div className={clsx("card relative h-full overflow-hidden bg-gradient-to-br p-3.5 transition", TONES[tone], href && "hover:shadow-lift hover:-translate-y-px", alert && "ring-2 ring-red-300")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase leading-tight tracking-wide text-slate-500">{label}</div>
          <div className="kpi-num mt-1">{value}</div>
          {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
        </div>
        {Icon && <div className="ic flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"><Icon className="h-[18px] w-[18px]" aria-hidden /></div>}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 rounded-xl">{inner}</Link> : inner;
}

export function Badge({ className, children, title }: { className?: string; children: React.ReactNode; title?: string }) {
  return <span title={title} className={clsx("badge", className ?? "bg-slate-100 text-slate-700 ring-slate-300")}>{children}</span>;
}

export function MapBadge({ map, value, fallback }: { map: Record<string, { label: string; badge: string }>; value: string | null | undefined; fallback?: string }) {
  if (!value) return <span className="text-slate-400">{fallback ?? "—"}</span>;
  const m = map[value];
  return <Badge className={m?.badge}>{m?.label ?? value}</Badge>;
}

export function StatusPill({ status }: { status: DisplayStatus }) {
  const s = DISPLAY_STATUS[status];
  return <Badge className={s.badge}><span className={clsx("h-1.5 w-1.5 rounded-full", s.dot)} />{s.label}</Badge>;
}

export function EmptyState({ title, children, icon: Icon = Inbox, action }: { title: string; children?: React.ReactNode; icon?: LucideIcon; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-6 py-10 text-center">
      <Icon className="h-8 w-8 text-slate-300" aria-hidden />
      <div className="mt-2 text-sm font-semibold text-slate-700">{title}</div>
      {children && <div className="mt-1 max-w-md text-sm text-slate-500">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "info", title, children, className }: { tone?: "info" | "warning" | "danger" | "success"; title?: string; children?: React.ReactNode; className?: string }) {
  const c = { info: "border-sky-200 bg-sky-50 text-sky-900", warning: "border-amber-300 bg-amber-50 text-amber-900", danger: "border-red-300 bg-red-50 text-red-900", success: "border-green-300 bg-green-50 text-green-900" }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "note"} className={clsx("flex gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm", c, className)}>
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>{title && <div className="font-semibold">{title}</div>}{children && <div className={title ? "mt-0.5" : ""}>{children}</div>}</div>
    </div>
  );
}

export function Field({ label, children, hint, required, className, htmlFor }: { label: string; children: React.ReactNode; hint?: React.ReactNode; required?: boolean; className?: string; htmlFor?: string }) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>{label}{required && <span className="text-red-600"> *</span>}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function DL({ items, cols = 2 }: { items: [string, React.ReactNode][]; cols?: 1 | 2 | 3 | 4 }) {
  return (
    <dl className={clsx("grid gap-x-6 gap-y-3 text-sm", { 1: "grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[cols])}>
      {items.map(([k, v], i) => (
        <div key={i} className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{k}</dt>
          <dd className="mt-0.5 break-words text-slate-900">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TabLinks({ tabs, active }: { tabs: { key: string; label: string; href: string; count?: number }[]; active: string }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} role="tab" aria-selected={t.key === active}
          className={clsx("-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition",
            t.key === active ? "border-accent-600 text-brand-900" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800")}>
          {t.label}{t.count !== undefined && <span className={clsx("ml-1.5 rounded-full px-1.5 py-px text-[10px]", t.key === active ? "bg-accent-100 text-accent-800" : "bg-slate-100 text-slate-600")}>{t.count}</span>}
        </Link>
      ))}
    </div>
  );
}

export function FilterBar({ children, action }: { children: React.ReactNode; action?: string }) {
  return (
    <form method="get" action={action} className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-card">
      {children}
      <button className="btn-secondary" type="submit">Apply</button>
    </form>
  );
}

export function DemoTag() {
  return <Badge className="bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200" title="Synthetic demonstration data">DEMO</Badge>;
}

export function Pct({ v, digits = 1 }: { v: number | null | undefined; digits?: number }) {
  return <>{v === null || v === undefined || Number.isNaN(v) ? "—" : `${v.toFixed(digits)}%`}</>;
}

export function Bar({ pct, tone = "accent" }: { pct: number; tone?: "accent" | "brand" | "red" | "amber" }) {
  const c = { accent: "bg-accent-500", brand: "bg-brand-600", red: "bg-red-500", amber: "bg-amber-500" }[tone];
  return <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className={clsx("h-full rounded-full", c)} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>;
}
