import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cases } from "@/content/cases";
import { Badge, Container, PageHeader } from "@/components/ui";
import { CaseViewedBadge } from "./CaseClient";

export const metadata: Metadata = { title: "Advanced Clinical Case Studies" };

export default function CasesPage() {
  return (
    <>
      <PageHeader eyebrow="Module 13" title="Advanced Clinical Case Studies">
        Ten realistic cases, each worked through background, concerns, information needed, risk classification, decision process, actions, documentation and
        debrief. Commit to your own reasoning before revealing each step.
      </PageHeader>
      <Container className="py-10">
        <ul className="grid gap-4 md:grid-cols-2">
          {cases.map((c) => (
            <li key={c.id}>
              <Link href={`/cases/${c.id}/`} className="group flex h-full flex-col rounded-2xl border border-white/10 bg-navy-900/70 p-5 transition hover:border-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="danger">Case {c.number}</Badge>
                  <Badge>{c.topic}</Badge>
                  <CaseViewedBadge id={c.id} />
                </div>
                <p className="mt-3 font-semibold text-white group-hover:text-cyan-200">{c.title}</p>
                <p className="mt-2 line-clamp-3 flex-1 text-sm text-slate-400">{c.background}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm text-cyan-300">
                  Work this case <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
