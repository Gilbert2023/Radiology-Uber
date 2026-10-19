"use client";

import { useMemo, useState } from "react";
import { PROTOCOLS, REGIONS } from "@/content/protocols";
import { Card, Chip } from "@/components/ui";
import { useProgress } from "@/lib/progress";

export function ProtocolIndex() {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("all");
  const [contrastOnly, setContrastOnly] = useState(false);
  const s = useProgress();
  const list = useMemo(() => {
    const n = q.toLowerCase();
    return PROTOCOLS.filter((p) => (region === "all" || p.region === region) && (!contrastOnly || p.sequences.some((x) => x.postContrast)) && (!n || [p.title, p.indication, ...p.tags].join(" ").toLowerCase().includes(n)));
  }, [q, region, contrastOnly]);
  return (
    <>
      <div className="panel panel-pad mb-6 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div><label className="label" htmlFor="pq">Search conditions</label><input id="pq" className="input mt-1" placeholder="e.g. stroke, ACL, MRCP, PI-RADS" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div><label className="label" htmlFor="pr">Region</label><select id="pr" className="input mt-1" value={region} onChange={(e) => setRegion(e.target.value)}><option value="all">All regions</option>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={contrastOnly} onChange={(e) => setContrastOnly(e.target.checked)} className="accent-teal-700" /> Includes contrast</label>
      </div>
      {REGIONS.filter((r) => list.some((p) => p.region === r)).map((r) => (
        <section key={r} className="mb-8">
          <h2 className="mb-3 font-serif text-lg font-semibold">{r}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.filter((p) => p.region === r).map((p) => (
              <Card key={p.id} href={`/protocols/${p.id}/`} title={p.title} meta={<span className="flex gap-1">{s.savedProtocols.includes(p.id) && <Chip tone="teal">saved</Chip>}<Chip tone={p.depth === "full" ? "green" : "neutral"}>{p.depth === "full" ? "full" : "core"}</Chip></span>}>
                {p.indication}
              </Card>
            ))}
          </div>
        </section>
      ))}
      {!list.length && <p className="text-sm text-ink-500">No protocols match.</p>}
      <p className="mt-4 text-xs text-ink-500"><strong>full</strong> = all 17 sections with condition-specific detail; <strong>core</strong> = condition-specific sequences with region-level preparation, QC and pitfalls (expansion planned).</p>
    </>
  );
}
