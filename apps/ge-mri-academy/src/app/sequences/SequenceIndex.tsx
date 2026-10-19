"use client";

import { useMemo, useState } from "react";
import { SEQUENCES } from "@/content/sequences";
import { Card, Chip } from "@/components/ui";

const AV = { standard: "teal", optional: "blue", "software-dependent": "amber" } as const;

export function SequenceIndex() {
  const [q, setQ] = useState("");
  const [fam, setFam] = useState("all");
  const fams = Array.from(new Set(SEQUENCES.map((s) => s.family)));
  const list = useMemo(() => {
    const n = q.toLowerCase();
    return SEQUENCES.filter((s) => (fam === "all" || s.family === fam) && (!n || [s.name, s.geNames, s.otherVendors ?? "", ...s.applications].join(" ").toLowerCase().includes(n)));
  }, [q, fam]);
  return (
    <>
      <div className="panel panel-pad mb-6 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div><label className="label" htmlFor="sq">Search</label><input id="sq" className="input mt-1" placeholder="e.g. CUBE, MRCP, stroke" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div><label className="label" htmlFor="sf">Family</label><select id="sf" className="input mt-1" value={fam} onChange={(e) => setFam(e.target.value)}><option value="all">All</option>{fams.map((f) => <option key={f}>{f}</option>)}</select></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((s) => (
          <Card key={s.id} href={`/sequences/${s.id}/`} title={s.name} meta={<Chip tone={AV[s.availability]}>{s.availability}</Chip>}>
            <p className="text-xs text-ink-500">{s.geNames}</p>
            <p className="mt-1">{s.applications.slice(0, 3).join(" · ")}</p>
          </Card>
        ))}
      </div>
      {!list.length && <p className="text-sm text-ink-500">No sequences match.</p>}
    </>
  );
}
