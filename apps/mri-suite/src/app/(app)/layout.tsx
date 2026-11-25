import { redirect } from "next/navigation";
import { LogOut, KeyRound } from "lucide-react";
import { getActor } from "@/server/auth";
import { computeAlerts } from "@/server/alerts";
import { visibleNav } from "@/lib/nav";
import { HospitalLogo } from "@/components/brand";
import { Sidebar } from "@/components/client/sidebar";
import { GlobalSearch, NotificationBell, IdleTimeout } from "@/components/client/misc";
import { logoutAction } from "../actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (!actor) redirect("/login");
  const groups = actor.mustChangePassword ? [] : visibleNav(actor.permissions);
  const wantsAlerts = ["dashboard.command", "dashboard.executive", "pacs.view", "qc.view"].some((p) => actor.permissions.has(p));
  const alerts = wantsAlerts && !actor.mustChangePassword ? await computeAlerts({ mask: !actor.permissions.has("patients.view") }) : [];
  return (
    <div className="flex min-h-screen">
      <Sidebar groups={groups} brand={<HospitalLogo dark size="sm" />} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 pl-14 backdrop-blur lg:pl-6">
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-1.5">
            <NotificationBell alerts={alerts.map(({ id, severity, category, title, detail, href }) => ({ id, severity, category, title, detail, href }))} />
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-sm font-semibold text-slate-800">{actor.fullName}</div>
              <div className="text-[11px] text-accent-700">{actor.roleName}</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800" aria-hidden>
              {actor.fullName.split(/\s+/).filter((w) => !w.endsWith(".")).slice(0, 2).map((w) => w[0]).join("")}
            </div>
            <Link href="/account/password" className="btn-ghost" title="Change password" aria-label="Change password"><KeyRound className="h-4 w-4" /></Link>
            <form action={logoutAction}><button className="btn-ghost" title="Sign out" aria-label="Sign out"><LogOut className="h-4 w-4" /></button></form>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6">{children}</main>
        <footer className="no-print border-t border-slate-200 px-6 py-3 text-[11px] text-slate-400">
          The Bank Hospital · MRI Suite Management System · Times shown in Africa/Accra · Designed with Ghana Data Protection Act, 2012 (Act 843) in mind
        </footer>
      </div>
      <IdleTimeout minutes={actor.idleMinutes} />
    </div>
  );
}
