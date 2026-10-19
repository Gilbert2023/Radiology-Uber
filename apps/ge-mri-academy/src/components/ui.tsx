"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Bookmark, BookmarkCheck, CheckCircle2, Circle, AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { progress, useProgress, type ActivityItem } from "@/lib/progress";
import { REF_BY_ID } from "@/content/references";
import type { RefLink, Verification } from "@/content/types";

export function PageHeader({ kicker, title, lede, children }: { kicker?: string; title: string; lede?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-8 border-b border-rule pb-6">
      {kicker && <div className="kicker mb-2">{kicker}</div>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-serif text-3xl font-semibold leading-tight sm:text-[2.1rem]">{title}</h1>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
      {lede && <div className="mt-3 max-w-3xl text-[15px] leading-relaxed text-ink-600">{lede}</div>}
    </div>
  );
}

const VER: Record<Verification, { label: string; cls: string }> = {
  console: { label: "On supplied console", cls: "border-teal-600/40 bg-teal-50 text-teal-800" },
  standard: { label: "Standard MRI concept", cls: "border-signal-blue/30 bg-signal-blueBg text-signal-blue" },
  "ge-plausible": { label: "GE implementation — verify", cls: "border-signal-amber/40 bg-signal-amberBg text-signal-amber" },
  verify: { label: "Confirm in software manual", cls: "border-signal-red/30 bg-signal-redBg text-signal-red" },
};

export function VerificationBadge({ v }: { v: Verification }) {
  const x = VER[v];
  return <span className={`chip ${x.cls}`} title={x.label}>{x.label}</span>;
}

export function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "teal" | "amber" | "red" | "green" | "blue" }) {
  const cls = {
    neutral: "border-rule bg-paper-100 text-ink-600",
    teal: "border-teal-600/40 bg-teal-50 text-teal-800",
    amber: "border-signal-amber/40 bg-signal-amberBg text-signal-amber",
    red: "border-signal-red/30 bg-signal-redBg text-signal-red",
    green: "border-signal-green/30 bg-signal-greenBg text-signal-green",
    blue: "border-signal-blue/30 bg-signal-blueBg text-signal-blue",
  }[tone];
  return <span className={`chip ${cls}`}>{children}</span>;
}

export function Callout({ tone = "info", title, children }: { tone?: "info" | "warn" | "safety"; title?: string; children: React.ReactNode }) {
  const map = {
    info: { Icon: Info, cls: "border-signal-blue/30 bg-signal-blueBg/60", ic: "text-signal-blue" },
    warn: { Icon: AlertTriangle, cls: "border-signal-amber/40 bg-signal-amberBg", ic: "text-signal-amber" },
    safety: { Icon: ShieldAlert, cls: "border-signal-red/30 bg-signal-redBg", ic: "text-signal-red" },
  }[tone];
  return (
    <div className={`flex gap-3 rounded-md border px-4 py-3 text-sm ${map.cls}`} role={tone === "safety" ? "note" : undefined}>
      <map.Icon size={18} className={`mt-0.5 shrink-0 ${map.ic}`} aria-hidden />
      <div className="text-ink-700">
        {title && <div className="mb-0.5 font-semibold text-ink-900">{title}</div>}
        {children}
      </div>
    </div>
  );
}

export function Section({ title, id, children, kicker }: { title: React.ReactNode; id?: string; kicker?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-8 scroll-mt-20">
      {kicker && <div className="kicker mb-1">{kicker}</div>}
      <h2 className="mb-3 font-serif text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function RefList({ refs }: { refs: RefLink[] }) {
  const unique = Array.from(new Map(refs.map((r) => [r.id, r])).values());
  return (
    <ol className="list-decimal space-y-1 pl-5 text-xs text-ink-600">
      {unique.map((r) => {
        const ref = REF_BY_ID[r.id];
        if (!ref) return null;
        return (
          <li key={r.id}>
            {ref.citation}
            {ref.url && (
              <>
                {" "}
                <a href={ref.url} target="_blank" rel="noreferrer">link</a>
              </>
            )}
            {r.note && <span className="text-ink-500"> — {r.note}</span>}
          </li>
        );
      })}
    </ol>
  );
}

export function BookmarkButton({ k, label = "Bookmark" }: { k: string; label?: string }) {
  const s = useProgress();
  const on = s.bookmarks.includes(k);
  return (
    <button className="btn-secondary" aria-pressed={on} onClick={() => progress.toggleBookmark(k)}>
      {on ? <BookmarkCheck size={15} className="text-teal-700" /> : <Bookmark size={15} />}
      {on ? "Bookmarked" : label}
    </button>
  );
}

export function CompleteButton({ k }: { k: string }) {
  const s = useProgress();
  const on = !!s.completed[k];
  return (
    <button className="btn-secondary" aria-pressed={on} onClick={() => progress.toggleComplete(k)}>
      {on ? <CheckCircle2 size={15} className="text-signal-green" /> : <Circle size={15} />}
      {on ? "Studied" : "Mark as studied"}
    </button>
  );
}

/** Records a page visit for "recent" lists on the dashboard. */
export function Track({ kind, id, label, href }: { kind: ActivityItem["kind"]; id: string; label: string; href: string }) {
  useEffect(() => {
    progress.visit(kind, id, label, href);
  }, [kind, id, label, href]);
  return null;
}

export function Card({ href, title, children, meta }: { href: string; title: string; children?: React.ReactNode; meta?: React.ReactNode }) {
  return (
    <Link href={href} className="panel group block p-4 no-underline transition-colors hover:border-ink-400">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-ink-900 group-hover:text-teal-700">{title}</h3>
        {meta}
      </div>
      {children && <div className="mt-1.5 text-sm leading-relaxed text-ink-600">{children}</div>}
    </Link>
  );
}

export function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-paper-300 py-1.5 text-sm last:border-0">
      <span className="text-ink-500">{k}</span>
      <span className="text-right font-mono text-ink-900">{v}</span>
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-ink-600">
        <span>{label}</span>
        <span className="font-mono">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-paper-300" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-1.5 rounded-full bg-teal-600" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
