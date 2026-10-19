"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PROTOCOLS, REGIONS } from "@/content/protocols";
import { buildDecision, CAP_LABEL, type Capability, type DecisionInput } from "@/lib/decision";
import { Chip } from "@/components/ui";
import type { Region } from "@/content/types";

const ALL_CAPS = Object.keys(CAP_LABEL) as Capability[];

export function DecisionAssistant() {
  const [region, setRegion] = useState<Region>("Neuro");
  const regionProtocols = PROTOCOLS.filter((p) => p.region === region);
  const [pid, setPid] = useState(regionProtocols[0].id);
  const protocol = PROTOCOLS.find((p) => p.id === pid) ?? regionProtocols[0];
  const [pathology, setPathology] = useState("");
  const [age, setAge] = useState<DecisionInput["age"]>("adult");
  const [contrast, setContrast] = useState<DecisionInput["contrast"]>("suitable");
  const [stillness, setStillness] = useState<DecisionInput["stillness"]>("good");
  const [physiology, setPhysiology] = useState<DecisionInput["physiology"]>("none");
  const [caps, setCaps] = useState<Record<Capability, boolean>>(() => Object.fromEntries(ALL_CAPS.map((c) => [c, true])) as Record<Capability, boolean>);
  const [coil, setCoil] = useState(true);

  const out = useMemo(() => buildDecision({ protocol, pathology, age, contrast, stillness, physiology, caps, dedicatedCoil: coil }), [protocol, pathology, age, contrast, stillness, physiology, caps, coil]);

  const radio = <T extends string>(name: string, value: T, set: (v: T) => void, opts: [T, string][]) => (
    <fieldset>
      <legend className="label mb-1">{name}</legend>
      <div className="flex flex-wrap gap-1.5">
        {opts.map(([v, l]) => <button key={v} type="button" aria-pressed={value === v} onClick={() => set(v)} className={value === v ? "btn-primary px-2 py-1 text-xs" : "btn-secondary px-2 py-1 text-xs"}>{l}</button>)}
      </div>
    </fieldset>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
      <form className="panel panel-pad space-y-4 self-start" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="label" htmlFor="dr">Anatomical region</label>
          <select id="dr" className="input mt-1" value={region} onChange={(e) => { const r = e.target.value as Region; setRegion(r); setPid(PROTOCOLS.find((p) => p.region === r)!.id); }}>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select>
        </div>
        <div>
          <label className="label" htmlFor="di">Clinical indication</label>
          <select id="di" className="input mt-1" value={protocol.id} onChange={(e) => setPid(e.target.value)}>{regionProtocols.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select>
        </div>
        <div>
          <label className="label" htmlFor="dp">Suspected pathology</label>
          <input id="dp" list="dp-list" className="input mt-1" placeholder="optional, e.g. meniscal tear" value={pathology} onChange={(e) => setPathology(e.target.value)} />
          <datalist id="dp-list">{protocol.tags.map((t) => <option key={t} value={t} />)}</datalist>
        </div>
        {radio("Patient age group", age, setAge, [["adult", "Adult"], ["older", "Older adult"], ["paediatric", "Paediatric"]])}
        {radio("Contrast suitability", contrast, setContrast, [["suitable", "Suitable"], ["uncertain", "Uncertain"], ["not-suitable", "Not suitable"]])}
        {radio("Ability to remain still", stillness, setStillness, [["good", "Good"], ["limited", "Limited"], ["poor", "Poor"]])}
        {radio("Respiratory / cardiac limitation", physiology, setPhysiology, [["none", "None"], ["short-breath-hold", "Short breath-hold"], ["no-breath-hold", "Cannot breath-hold"], ["arrhythmia", "Arrhythmia"]])}
        <fieldset>
          <legend className="label mb-1">Scanner capability (installed options)</legend>
          <div className="space-y-1">
            {ALL_CAPS.map((c) => <label key={c} className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-teal-700" checked={caps[c]} onChange={(e) => setCaps({ ...caps, [c]: e.target.checked })} />{CAP_LABEL[c]}</label>)}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-teal-700" checked={coil} onChange={(e) => setCoil(e.target.checked)} />Dedicated coil available for this region</label>
          </div>
        </fieldset>
      </form>

      <div className="min-w-0 space-y-5" aria-live="polite">
        <div className="panel panel-pad">
          <div className="kicker">Proposed educational protocol</div>
          <h2 className="font-serif text-xl font-semibold">{protocol.title}</h2>
          <p className="mt-1 text-sm text-ink-600">{protocol.indication}</p>
          <Link href={`/protocols/${protocol.id}/`} className="mt-2 inline-block text-sm">Full protocol page →</Link>
        </div>
        <div className="panel overflow-x-auto">
          <table className="table">
            <thead><tr><th>#</th><th>Core sequence</th><th>Why it is included</th><th>Adaptations</th></tr></thead>
            <tbody>{out.core.map((s, k) => (
              <tr key={s.name + k}><td className="font-mono text-ink-400">{k + 1}</td><td className="font-medium">{s.name}<div className="text-xs font-normal text-ink-500">{s.plane}{s.params ? ` · ${s.params}` : ""}</div></td><td>{s.why}</td><td>{s.modifications.length ? <ul className="list-disc pl-4 text-xs">{s.modifications.map((m) => <li key={m}>{m}</li>)}</ul> : <span className="text-xs text-ink-400">—</span>}</td></tr>
            ))}</tbody>
          </table>
        </div>
        {out.optional.length > 0 && (
          <div className="panel panel-pad">
            <div className="kicker mb-2">Optional sequences</div>
            <ul className="space-y-1.5 text-sm">{out.optional.map((s) => <li key={s.name}><strong>{s.name}</strong> — {s.when} <span className="text-ink-500">({s.why})</span></li>)}</ul>
          </div>
        )}
        {out.omitted.length > 0 && (
          <div className="panel panel-pad border-signal-amber/40">
            <div className="kicker mb-2">Omitted or held</div>
            <ul className="space-y-1 text-sm">{out.omitted.map((o) => <li key={o.name}><Chip tone="amber">held</Chip> <strong>{o.name}</strong> — {o.reason}</li>)}</ul>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {[["Planning instructions", out.planning], ["Important parameters", out.importantParams], ["Preparation", out.preparation], ["Patient instructions", out.patientInstructions], ["Potential limitations", out.limitations], ["Quality checks", out.qc]].map(([t, items]) => (
            <div key={t as string} className="panel panel-pad">
              <div className="kicker mb-2">{t as string}</div>
              <ul className="list-disc space-y-1 pl-4 text-sm text-ink-700">{(items as string[]).map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
