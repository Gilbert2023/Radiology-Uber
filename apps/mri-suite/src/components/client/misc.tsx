"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import { Bell, Printer, RefreshCw, Search } from "lucide-react";

export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  const [last, setLast] = useState<Date | null>(null);
  useEffect(() => {
    setLast(new Date());
    const t = setInterval(() => { router.refresh(); setLast(new Date()); }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return (
    <button type="button" onClick={() => { router.refresh(); setLast(new Date()); }} className="btn-secondary btn-sm no-print" title={`Auto-refreshes every ${seconds}s`}>
      <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Live{last ? " · " : ""}{last?.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Africa/Accra" })}
    </button>
  );
}

/** Signs the user out after the configured period without keyboard/mouse activity. */
export function IdleTimeout({ minutes }: { minutes: number }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [warn, setWarn] = useState(false);
  useEffect(() => {
    const ms = minutes * 60000;
    let warnT: ReturnType<typeof setTimeout>;
    const reset = () => {
      setWarn(false);
      if (timer.current) clearTimeout(timer.current);
      clearTimeout(warnT);
      warnT = setTimeout(() => setWarn(true), Math.max(0, ms - 60000));
      timer.current = setTimeout(async () => {
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        router.push("/login?timeout=1");
      }, ms);
    };
    const evs = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    let last = 0;
    const throttled = () => { const n = Date.now(); if (n - last > 5000) { last = n; reset(); } };
    evs.forEach((e) => window.addEventListener(e, throttled, { passive: true }));
    reset();
    return () => { evs.forEach((e) => window.removeEventListener(e, throttled)); if (timer.current) clearTimeout(timer.current); clearTimeout(warnT); };
  }, [minutes, router]);
  if (!warn) return null;
  return <div role="alert" className="fixed left-1/2 top-3 z-[80] -translate-x-1/2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 shadow-lift">You will be signed out in 1 minute due to inactivity. Move the mouse or press a key to stay signed in.</div>;
}

export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form role="search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`); }} className="relative hidden w-full max-w-md md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patients, MRN, accession, staff…" aria-label="Global search"
        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-accent-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-200" />
    </form>
  );
}

export interface BellAlert { id: string; severity: string; category: string; title: string; detail: string; href: string }
export function NotificationBell({ alerts }: { alerts: BellAlert[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);
  const critical = alerts.filter((a) => a.severity === "critical").length;
  return (
    <div className="relative" ref={ref}>
      <button type="button" className="btn-ghost relative" aria-label={`Notifications: ${alerts.length}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Bell className="h-5 w-5" />
        {alerts.length > 0 && (
          <span className={clsx("absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white", critical ? "bg-red-600" : "bg-amber-500")}>{alerts.length}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lift">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-sm font-semibold">Alerts & notifications</span>
            <span className="text-xs text-slate-500">{critical} critical</span>
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {alerts.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">No active alerts.</li>}
            {alerts.slice(0, 40).map((a) => (
              <li key={a.id}>
                <Link href={a.href} onClick={() => setOpen(false)} className="flex gap-2.5 border-b border-slate-50 px-4 py-2.5 hover:bg-slate-50">
                  <span className={clsx("mt-1.5 h-2 w-2 shrink-0 rounded-full", a.severity === "critical" ? "bg-red-500" : a.severity === "warning" ? "bg-amber-500" : "bg-sky-500")} />
                  <span className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">{a.category}</span>
                    <span className="block truncate text-sm font-medium text-slate-800">{a.title}</span>
                    {a.detail && <span className="block truncate text-xs text-slate-500">{a.detail}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function PrintButton({ label = "Print" }: { label?: string }) {
  return <button type="button" className="btn-secondary no-print" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden />{label}</button>;
}

/** Select that navigates on change (for date/scanner pickers in GET filters). */
export function AutoSubmit({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const h = () => form.requestSubmit();
    form.addEventListener("change", h);
    return () => form.removeEventListener("change", h);
  }, []);
  return <span ref={ref} className="contents">{children}</span>;
}
