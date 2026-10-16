"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { glossary } from "@/content/glossary";
import { EmptyState, LinkButton } from "@/components/ui";

export function GlossaryList() {
  const [q, setQ] = useState("");
  const items = [...glossary]
    .sort((a, b) => a.term.localeCompare(b.term))
    .filter((g) => !q || `${g.term} ${g.definition}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <label htmlFor="g-q" className="sr-only">Search glossary</label>
          <input
            id="g-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search terms…"
            className="w-full rounded-xl border border-white/15 bg-navy-900 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
        </div>
        <LinkButton href="/flashcards/" variant="secondary">Practise with flashcards</LinkButton>
      </div>
      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState title={`No terms match "${q}"`} />
        </div>
      ) : (
        <dl className="mt-6 grid gap-3 md:grid-cols-2">
          {items.map((g) => (
            <div key={g.term} id={g.term.toLowerCase().replace(/[^a-z0-9]+/g, "-")} className="rounded-2xl border border-white/10 bg-navy-900/70 p-4">
              <dt className="font-semibold text-cyan-200">{g.term}</dt>
              <dd className="mt-1 text-sm text-slate-300">{g.definition}</dd>
              {g.related && <dd className="mt-2 text-xs text-slate-500">Related: {g.related.join(", ")}</dd>}
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
