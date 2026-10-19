import type { Metadata } from "next";
import Link from "next/link";
import { PHYSICS } from "@/content/physics";
import { PARAM_BY_ID } from "@/content/parameters";
import { PageHeader, Chip, RefList } from "@/components/ui";
import { PhysicsWidget } from "./Widgets";
import { TrackPhysics } from "./TrackPhysics";

export const metadata: Metadata = { title: "MRI Physics Learning Centre" };

export default function Page() {
  return (
    <>
      <TrackPhysics />
      <PageHeader kicker="Phase 7" title="MRI Physics Learning Centre" lede="Every concept answers one question: how does this affect the images I acquire? Interactive widgets use simplified textbook equations (educational approximations)." />
      <nav className="panel panel-pad mb-8" aria-label="Physics topics">
        <ol className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {PHYSICS.map((t, i) => <li key={t.id}><a href={`#${t.id}`}><span className="font-mono text-ink-400">{String(i + 1).padStart(2, "0")}</span> {t.title}</a></li>)}
        </ol>
      </nav>
      <div className="space-y-10">
        {PHYSICS.map((t) => (
          <section key={t.id} id={t.id} className="scroll-mt-20 border-b border-rule pb-10 last:border-0">
            <div className="mb-2 flex flex-wrap items-center gap-2"><Chip>{t.level}</Chip></div>
            <h2 className="mb-2 font-serif text-2xl font-semibold">{t.title}</h2>
            <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,24rem)]">
              <div className="space-y-3 text-[15px] leading-relaxed text-ink-700">
                <p>{t.explain}</p>
                {t.equation && (
                  <div className="panel panel-pad">
                    <div className="font-mono text-[15px] text-ink-900">{t.equation.expr}</div>
                    <p className="mt-1 text-xs text-ink-500">{t.equation.terms}</p>
                  </div>
                )}
                <div className="rounded-md border-l-4 border-teal-600 bg-teal-50 px-4 py-3 text-sm">
                  <div className="kicker mb-1 text-teal-800">How does this affect the images I acquire?</div>
                  {t.images}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm"><span className="kicker">On the console</span>{t.console.map((c) => PARAM_BY_ID[c] && <Link key={c} href={`/parameters/${c}/`}><Chip tone="teal">{PARAM_BY_ID[c].label}</Chip></Link>)}</div>
              </div>
              {t.widget && <PhysicsWidget kind={t.widget} />}
            </div>
          </section>
        ))}
      </div>
      <div className="mt-8"><RefList refs={[{ id: "mcrobbie" }, { id: "westbrook" }, { id: "bernstein" }, { id: "elster" }]} /></div>
    </>
  );
}
