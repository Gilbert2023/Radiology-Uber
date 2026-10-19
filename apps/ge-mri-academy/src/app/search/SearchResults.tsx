"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { search, SEARCH_INDEX } from "@/lib/search";
import { useProgress, progress } from "@/lib/progress";
import { Chip } from "@/components/ui";

export function SearchResults() {
  const sp = useSearchParams();
  const router = useRouter();
  const s = useProgress();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const showBookmarks = sp.get("bookmarks") === "1";
  useEffect(() => setQ(sp.get("q") ?? ""), [sp]);
  const results = search(q);
  const bookmarks = SEARCH_INDEX.filter((d) => s.bookmarks.includes(d.key));
  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); router.replace(`/search/?q=${encodeURIComponent(q)}`); }} className="mb-6 flex gap-2">
        <label htmlFor="sq2" className="sr-only">Search</label>
        <input id="sq2" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search parameters, sequences, protocols, cases…" autoFocus />
        <button className="btn-primary">Search</button>
      </form>
      {(showBookmarks || !q) && (
        <section className="mb-8">
          <h2 className="mb-2 font-serif text-lg font-semibold">Bookmarks ({bookmarks.length})</h2>
          {bookmarks.length ? (
            <ul className="divide-y divide-paper-300 rounded-md border border-rule bg-white">
              {bookmarks.map((d) => <li key={d.key} className="flex items-center justify-between gap-3 px-4 py-2 text-sm"><span><Chip>{d.kind}</Chip> <Link href={d.href}>{d.title}</Link></span><button className="btn-ghost text-xs" onClick={() => progress.toggleBookmark(d.key)}>Remove</button></li>)}
            </ul>
          ) : <p className="text-sm text-ink-500">No bookmarks yet.</p>}
        </section>
      )}
      {q && (
        <section>
          <p className="mb-3 text-sm text-ink-500">{results.length} result(s) for “{q}”</p>
          <ul className="space-y-3">
            {results.map((d) => (
              <li key={d.key} className="panel panel-pad">
                <div className="mb-1"><Chip>{d.kind}</Chip></div>
                <Link href={d.href} className="font-semibold">{d.title}</Link>
                <p className="mt-1 line-clamp-2 text-sm text-ink-600">{d.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
