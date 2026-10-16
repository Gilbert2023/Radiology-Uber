import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, FlaskConical } from "lucide-react";
import { moduleById, modules } from "@/content";
import { labById } from "@/content/labs";
import { Badge, Card, Container, LinkButton, PageHeader } from "@/components/ui";
import { ReferenceList } from "@/components/ReferenceList";
import { ModuleProgress } from "./ModuleProgress";

export function generateStaticParams() {
  return modules.map((m) => ({ moduleId: m.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ moduleId: string }> }): Promise<Metadata> {
  const { moduleId } = await params;
  const m = moduleById[moduleId];
  return { title: m ? `Module ${m.number}: ${m.title}` : "Module" };
}

export default async function ModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const m = moduleById[moduleId];
  if (!m) notFound();
  return (
    <>
      <PageHeader eyebrow={`Module ${String(m.number).padStart(2, "0")} · ${m.topic}`} title={m.title}>
        <p>{m.description}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <LinkButton href={`/curriculum/${m.id}/${m.lessons[0].id}/`}>
            Start module <ArrowRight className="h-4 w-4" aria-hidden />
          </LinkButton>
          {m.id === "m13" && <LinkButton href="/cases/" variant="secondary">Open case library</LinkButton>}
          {m.id === "m14" && <LinkButton href="/exam/?start=capstone" variant="secondary">Go to capstone</LinkButton>}
        </div>
      </PageHeader>
      <Container className="grid gap-8 py-10 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ModuleProgress moduleId={m.id} />
          <ol className="space-y-3">
            {m.lessons.map((l, idx) => (
              <li key={l.id}>
                <Link
                  href={`/curriculum/${m.id}/${l.id}/`}
                  className="block rounded-2xl border border-white/10 bg-navy-900/70 p-5 transition hover:border-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono text-cyan-300">
                      {m.number}.{idx + 1}
                    </span>
                    <Clock className="h-3.5 w-3.5" aria-hidden /> {l.minutes} min
                  </div>
                  <p className="mt-1 font-semibold text-white">{l.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{l.summary}</p>
                </Link>
              </li>
            ))}
          </ol>
        </div>
        <aside className="space-y-6">
          {m.labIds?.length ? (
            <Card>
              <h2 className="flex items-center gap-2 font-semibold text-white">
                <FlaskConical className="h-4 w-4 text-cyan-300" aria-hidden /> Interactive labs
              </h2>
              <ul className="mt-3 space-y-2">
                {m.labIds.map((id) => (
                  <li key={id}>
                    <Link href={`/lab/${id}/`} className="block rounded-lg bg-white/5 p-3 text-sm text-slate-100 hover:bg-white/10">
                      {labById[id].title}
                      <span className="block text-xs text-slate-400">{labById[id].summary}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          <Card>
            <h2 className="font-semibold text-white">Further reading</h2>
            <div className="mt-3">
              <ReferenceList ids={m.furtherReading} compact />
            </div>
          </Card>
          <Badge tone={m.depth === "core" ? "cyan" : "default"}>{m.depth === "core" ? "Core MVP module" : "Standard module"}</Badge>
        </aside>
      </Container>
    </>
  );
}
