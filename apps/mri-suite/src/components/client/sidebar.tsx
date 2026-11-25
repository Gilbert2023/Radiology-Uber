"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { MonitorDot, LayoutDashboard, CalendarDays, UserPlus, ClipboardList, DoorOpen, ShieldCheck, ListChecks, Cpu, BookOpen, Layers, ScanLine, UploadCloud, Droplets, Gauge, Wrench, Users, TriangleAlert, SprayCan, BarChart3, Activity, Timer, UserCheck, FileText, UserCog, KeyRound, Settings, ScrollText, Circle, ChevronDown, Menu, ChevronsRight, ChevronsLeft, X } from "lucide-react";
const Icons = { MonitorDot, LayoutDashboard, CalendarDays, UserPlus, ClipboardList, DoorOpen, ShieldCheck, ListChecks, Cpu, BookOpen, Layers, ScanLine, UploadCloud, Droplets, Gauge, Wrench, Users, TriangleAlert, SprayCan, BarChart3, Activity, Timer, UserCheck, FileText, UserCog, KeyRound, Settings, ScrollText, Circle, ChevronDown, Menu, ChevronsRight, ChevronsLeft, X };
import type { NavGroup } from "@/lib/nav";

function Icon({ name, className }: { name: string; className?: string }) {
  const C = (Icons as Record<string, typeof Circle>)[name] ?? Circle;
  return <C className={className} aria-hidden />;
}

export function Sidebar({ groups, brand }: { groups: NavGroup[]; brand: React.ReactNode }) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("sb-collapsed") === "1");
      setClosedGroups(JSON.parse(localStorage.getItem("sb-groups") || "{}"));
    } catch {}
  }, []);
  useEffect(() => setMobileOpen(false), [path]);
  const persist = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };
  const toggleGroup = (g: string) => setClosedGroups((c) => { const n = { ...c, [g]: !c[g] }; persist("sb-groups", JSON.stringify(n)); return n; });
  const matches = (href: string) => path === href || path.startsWith(href + "/");
  // Only the most specific matching item is active (e.g. /appointments/audit vs /appointments).
  const activeHref = groups.flatMap((g) => g.items.map((i) => i.href)).filter(matches).sort((a, b) => b.length - a.length)[0];
  const isActive = (href: string) => href === activeHref;

  const nav = (
    <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-2 py-3">
      {groups.map((g) => {
        const closed = closedGroups[g.label] && !collapsed;
        const groupActive = g.items.some((i) => isActive(i.href));
        return (
          <div key={g.label} className="mb-2">
            {!collapsed && (
              <button type="button" onClick={() => toggleGroup(g.label)} aria-expanded={!closed}
                className="flex w-full items-center justify-between rounded px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-200/80 hover:text-white">
                <span>{g.label}</span>
                <Icons.ChevronDown className={clsx("h-3 w-3 transition", closed && "-rotate-90", groupActive && closed && "text-accent-300")} aria-hidden />
              </button>
            )}
            {!closed && (
              <ul className="mt-0.5 space-y-0.5">
                {g.items.map((i) => {
                  const active = isActive(i.href);
                  return (
                    <li key={i.href}>
                      <Link href={i.href} title={collapsed ? i.label : undefined} aria-current={active ? "page" : undefined}
                        className={clsx("group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition",
                          active ? "bg-white text-brand-900 shadow-sm" : "text-brand-100 hover:bg-white/10 hover:text-white", collapsed && "justify-center px-0")}>
                        <Icon name={i.icon} className={clsx("h-[18px] w-[18px] shrink-0", active ? "text-accent-600" : "text-brand-300 group-hover:text-accent-300")} />
                        {!collapsed && <span className="truncate">{i.label}</span>}
                        {active && !collapsed && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-500" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      <button type="button" className="btn-ghost fixed left-2 top-3 z-50 lg:hidden no-print" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
        <Icons.Menu className="h-5 w-5" />
      </button>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-brand-950/50 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={clsx("no-print fixed inset-y-0 left-0 z-50 flex flex-col bg-gradient-to-b from-brand-900 via-brand-900 to-brand-950 text-white transition-all lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0",
        collapsed ? "w-[68px]" : "w-[270px]", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className={clsx("flex h-16 items-center border-b border-white/10", collapsed ? "justify-center px-2" : "justify-between px-4")}>
          {!collapsed ? brand : <Icons.ScanLine className="h-6 w-6 text-accent-300" aria-label="MRI Suite" />}
          <button type="button" className="hidden rounded p-1 text-brand-200 hover:bg-white/10 hover:text-white lg:block" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((c) => { persist("sb-collapsed", c ? "0" : "1"); return !c; })}>
            {collapsed ? <Icons.ChevronsRight className="h-4 w-4" /> : <Icons.ChevronsLeft className="h-4 w-4" />}
          </button>
          <button type="button" className="rounded p-1 text-brand-200 hover:bg-white/10 lg:hidden" aria-label="Close menu" onClick={() => setMobileOpen(false)}><Icons.X className="h-4 w-4" /></button>
        </div>
        {nav}
        {!collapsed && (
          <div className="border-t border-white/10 px-4 py-3 text-[10px] leading-snug text-brand-300">
            GE SIGNA Creator 1.5T · Open 24/7 · Africa/Accra
          </div>
        )}
      </aside>
    </>
  );
}
