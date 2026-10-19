"use client";

import { useMemo, useState } from "react";
import { PARAMETERS, PARAM_GROUPS } from "@/content/parameters";
import { Card, VerificationBadge } from "@/components/ui";
import { useProgress } from "@/lib/progress";
import type { Verification } from "@/content/types";

export function ParameterIndex() {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string>("all");
  const [ver, setVer] = useState<Verification | "all">("all");
  const s = useProgress();

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return PARAMETERS.filter((p) => (group === "all" || p.group === group) && (ver === "all" || p.verification === ver)).filter(
      (p) => !needle || [p.label, p.definition, ...(p.aka ?? [])].join(" ").toLowerCase().includes(needle),
    );
  }, [q, group, ver]);

  const studied = PARAMETERS.filter((p) => s.completed[`parameter:${p.id}`]).length;

  return (
    <div>
      <div className="panel panel-pad mb-6 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div>
          <label className="label" htmlFor="pq">Search parameters</label>
          <input id="pq" className="input mt-1" placeholder="e.g. bandwidth, NPW, echo train" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="pg">Group</label>
          <select id="pg" className="input mt-1" value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="all">All groups</option>
            {PARAM_GROUPS.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pv">Verification</label>
          <select id="pv" className="input mt-1" value={ver} onChange={(e) => setVer(e.target.value as Verification | "all")}>
            <option value="all">All</option>
            <option value="console">On supplied console</option>
            <option value="ge-plausible">GE implementation — verify</option>
            <option value="standard">Standard concept</option>
            <option value="verify">Confirm in manual</option>
          </select>
        </div>
        <p className="text-xs text-ink-500 sm:col-span-3">{list.length} of {PARAMETERS.length} parameters · {studied} marked as studied</p>
      </div>
      {PARAM_GROUPS.filter((g) => list.some((p) => p.group === g)).map((g) => (
        <section key={g} className="mb-8">
          <h2 className="mb-3 font-serif text-lg font-semibold">{g}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.filter((p) => p.group === g).map((p) => (
              <Card key={p.id} href={`/parameters/${p.id}/`} title={p.label} meta={s.completed[`parameter:${p.id}`] ? <span className="text-xs text-signal-green">✓</span> : null}>
                <div className="mb-2"><VerificationBadge v={p.verification} /></div>
                {p.definition}
              </Card>
            ))}
          </div>
        </section>
      ))}
      {list.length === 0 && <p className="text-sm text-ink-500">No parameters match. Try a different term.</p>}
    </div>
  );
}
