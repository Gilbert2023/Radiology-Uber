import { redirect } from "next/navigation";
import { getActor } from "@/server/auth";
import { homeFor } from "@/lib/nav";
import { HospitalLogo } from "@/components/brand";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const a = await getActor();
  if (a) redirect(homeFor(a.permissions));
  const msg = sp.timeout ? "You were signed out after a period of inactivity." : sp.expired ? "Your session expired. Please sign in again." : sp.reset ? "Password updated – please sign in." : null;
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 p-10 text-white lg:flex lg:flex-col">
        <HospitalLogo size="lg" dark />
        <div className="relative z-10 mt-auto max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-300">Radiology Department · MRI Unit</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight">Safe, traceable MRI care — from booking to PACS.</h1>
          <ul className="mt-6 grid grid-cols-2 gap-3 text-sm text-brand-100">
            {["Seven-stage patient journey", "MRI safety & implant registry", "PACS upload tracking", "QC, maintenance & staffing"].map((t) => (
              <li key={t} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent-400" />{t}</li>
            ))}
          </ul>
          <p className="mt-8 text-xs text-brand-300">GE SIGNA Creator 1.5T · Accra, Ghana</p>
        </div>
        {/* Decorative MRI bore rings */}
        <svg aria-hidden className="absolute -right-24 top-16 h-[520px] w-[520px] opacity-20" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="95" fill="none" stroke="#fda900" strokeWidth="1" />
          <circle cx="100" cy="100" r="70" fill="none" stroke="#fff" strokeWidth="10" />
          <circle cx="100" cy="100" r="44" fill="none" stroke="#fda900" strokeWidth="2" />
          <rect x="20" y="140" width="160" height="10" rx="5" fill="#fff" opacity=".5" />
        </svg>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><HospitalLogo /></div>
          <h2 className="text-2xl font-bold text-brand-950">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Authorised staff only. All activity is audited.</p>
          {msg && <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">{msg}</p>}
          <LoginForm />
          <div className="mt-6 rounded-lg border border-dashed border-fuchsia-300 bg-fuchsia-50/50 p-3 text-xs text-fuchsia-900">
            <div className="font-semibold">Demonstration environment</div>
            Usernames: supervisor, radiographer1, nurse1, receptionist1, mrso, manager, admin · Password: <code>Demo@MRI2026</code>. All patient data is synthetic.
          </div>
          <p className="mt-4 text-xs text-slate-500">Forgotten password? Contact the System Administrator, who can issue a one-time reset link.</p>
        </div>
      </section>
    </main>
  );
}
