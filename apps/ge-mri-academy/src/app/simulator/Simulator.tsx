"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RotateCcw, Save, Trash2, Columns2 } from "lucide-react";
import { explainChange, FAMILY_LABEL, formatTime, PRESETS, simulate, TEACHING_EXAMPLE, TISSUES, withPreset, type SimParams, type SeqFamily, type FatSat, type Plane } from "@/lib/sim";
import { progress, useProgress } from "@/lib/progress";
import { PhantomCanvas } from "@/components/PhantomCanvas";
import { KV, Chip, Callout } from "@/components/ui";

const BWS = [7.81, 10.42, 15.63, 20.83, 31.25, 41.67, 50, 62.5, 83.33, 125, 250];
const MATRIX = [128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 512];
const NEXS = [0.5, 0.75, 1, 1.5, 2, 3, 4];
const PFOV = [0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1];
const ACCEL = [1, 1.5, 2, 2.5, 3, 4];

const isFse = (f: SeqFamily) => f === "FSE" || f === "FRFSE" || f === "SSFSE" || f === "IR-FSE";

function Num({ label, value, min, max, step = 1, unit, onChange, hint }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void; hint?: string }) {
  const id = `f-${label.replace(/\W+/g, "-")}`;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="label">{label}</label>
        <span className="font-mono text-xs text-ink-500">{unit}</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <input aria-label={`${label} slider`} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-teal-700" />
        <input id={id} type="number" min={min} max={max} step={step} value={value} onChange={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) onChange(Math.min(max, Math.max(min, v))); }} className="input w-20 px-2 py-1 font-mono text-xs" />
      </div>
      {hint && <p className="mt-0.5 text-[11px] text-ink-500">{hint}</p>}
    </div>
  );
}

function Sel<T extends string | number>({ label, value, options, onChange, fmt }: { label: string; value: T; options: readonly T[]; onChange: (v: T) => void; fmt?: (v: T) => string }) {
  const id = `s-${label.replace(/\W+/g, "-")}`;
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <select id={id} className="input mt-1" value={String(value)} onChange={(e) => { const o = options.find((x) => String(x) === e.target.value); if (o !== undefined) onChange(o); }}>
        {options.map((o) => <option key={String(o)} value={String(o)}>{fmt ? fmt(o) : String(o)}</option>)}
      </select>
    </div>
  );
}

function Controls({ p, set }: { p: SimParams; set: (patch: Partial<SimParams>) => void }) {
  const fse = isFse(p.family);
  const gre = p.family === "GRE" || p.family === "3D-GRE";
  return (
    <div className="space-y-5">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="kicker mb-2">Sequence &amp; geometry</legend>
        <Sel label="Sequence family" value={p.family} options={Object.keys(FAMILY_LABEL) as SeqFamily[]} fmt={(f) => FAMILY_LABEL[f]} onChange={(family) => set({ family, etl: family === "SE" || family === "GRE" || family === "3D-GRE" || family === "DWI" ? 1 : family === "SSFSE" ? Math.round(p.phase * p.phaseFov * 0.55) : Math.max(p.etl, 8) })} />
        <Sel label="Imaging plane" value={p.plane} options={["Axial", "Sagittal", "Coronal"] as Plane[]} onChange={(plane) => set({ plane })} />
        <Num label="FOV" unit="cm" value={p.fov} min={8} max={48} step={0.5} onChange={(fov) => set({ fov })} />
        <Sel label="Phase FOV" value={p.phaseFov} options={PFOV} fmt={(v) => v.toFixed(2)} onChange={(phaseFov) => set({ phaseFov })} />
        <Num label={p.family === "3D-GRE" ? "Slice (partition) thickness" : "Slice thickness"} unit="mm" value={p.thickness} min={0.5} max={10} step={0.1} onChange={(thickness) => set({ thickness })} />
        <Num label={p.family === "3D-GRE" ? "Slice encodes" : "Number of slices"} value={p.slices} min={1} max={p.family === "3D-GRE" ? 256 : 80} onChange={(slices) => set({ slices })} />
      </fieldset>
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="kicker mb-2">Timing &amp; contrast</legend>
        <Num label="TR" unit="ms" value={p.tr} min={gre ? 3 : 200} max={12000} step={gre ? 1 : 10} onChange={(tr) => set({ tr })} />
        <Num label="TE (effective)" unit="ms" value={p.te} min={1} max={300} step={0.5} onChange={(te) => set({ te })} />
        {p.family === "IR-FSE" && <Num label="TI" unit="ms" value={p.ti} min={50} max={3000} step={5} onChange={(ti) => set({ ti })} hint="~150–170 ms nulls fat; ~2000–2500 ms nulls CSF at long TR (1.5 T, approx.)" />}
        {(gre || fse) && <Num label={gre ? "Flip angle" : "Refocusing flip angle"} unit="°" value={p.flip} min={gre ? 3 : 90} max={gre ? 90 : 180} onChange={(flip) => set({ flip })} />}
        {fse && <Num label="Echo train length" value={p.etl} min={2} max={p.family === "SSFSE" ? 256 : 40} onChange={(etl) => set({ etl })} />}
        {p.family === "DWI" && <Num label="b-value" unit="s/mm²" value={p.bValue} min={0} max={2000} step={50} onChange={(bValue) => set({ bValue })} />}
        <Sel label="Fat suppression" value={p.fatSat} options={(fse ? ["none", "chem", "stir", "dixon"] : ["none", "chem", "dixon"]) as FatSat[]} fmt={(v) => ({ none: "None", chem: "Chem Sat (spectral)", stir: "STIR (inversion)", dixon: "Dixon / IDEAL (if licensed)" })[v]} onChange={(fatSat) => set({ fatSat })} />
      </fieldset>
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="kicker mb-2">Resolution, SNR &amp; acceleration</legend>
        <Sel label="Frequency matrix" value={p.freq} options={MATRIX} onChange={(freq) => set({ freq })} />
        <Sel label="Phase matrix" value={p.phase} options={MATRIX} onChange={(phase) => set({ phase })} />
        <Sel label="NEX" value={p.nex} options={NEXS} onChange={(nex) => set({ nex })} />
        <Sel label="Receive bandwidth (± kHz)" value={p.bw} options={BWS} fmt={(v) => `±${v}`} onChange={(bw) => set({ bw })} />
        <Sel label="Parallel imaging factor (ARC/ASSET)" value={p.accel} options={ACCEL} onChange={(accel) => set({ accel })} />
      </fieldset>
    </div>
  );
}

function Results({ p, compact = false }: { p: SimParams; compact?: boolean }) {
  const r = useMemo(() => simulate(p), [p]);
  const maxSig = Math.max(...Object.values(r.signals), 1e-6);
  return (
    <div className="space-y-4">
      {r.warnings.length > 0 && <Callout tone="warn" title="Parameter conflict">{r.warnings.map((w) => <p key={w}>{w}</p>)}</Callout>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="panel panel-pad">
          <div className="kicker mb-2">Estimates</div>
          <KV k="Estimated scan time" v={formatTime(r.timeSec)} />
          <KV k="Relative SNR (vs teaching example)" v={r.relSnr.toFixed(2)} />
          <KV k="Pixel (freq × phase)" v={`${r.pixelFreq.toFixed(2)} × ${r.pixelPhase.toFixed(2)} mm`} />
          <KV k="Voxel volume" v={`${r.voxel.toFixed(2)} mm³`} />
          <KV k="Bandwidth / pixel" v={`${r.bwPerPixel.toFixed(0)} Hz`} />
          <KV k="Fat–water shift" v={`${r.chemShiftPx.toFixed(2)} px`} />
          {isFse(p.family) && <KV k="Echo spacing / train" v={`${r.esp.toFixed(1)} / ${r.trainMs.toFixed(0)} ms`} />}
          {r.acqs > 1 && <KV k="Acquisitions" v={r.acqs} />}
          <KV k="Phase lines acquired" v={r.phaseLines} />
          <KV k="Relative RF demand*" v={r.rfIndex.toFixed(2)} />
          <p className="mt-2 text-[11px] leading-snug text-ink-500">Time: {r.timeNote}. SNR ∝ voxel × √(lines × NEX × readout) ÷ (g√R). *RF demand is a relative pulse-energy index for teaching, NOT SAR or B1+rms.</p>
        </div>
        <div className="panel panel-pad">
          <div className="kicker mb-2">Likely contrast</div>
          <p className="font-medium text-ink-900">{r.weighting}</p>
          <ul className="mt-1 list-disc pl-4 text-sm text-ink-600">{r.contrastNotes.map((c) => <li key={c}>{c}</li>)}</ul>
          <div className="mt-3 space-y-1">
            {TISSUES.map((t) => (
              <div key={t.key} className="grid grid-cols-[7.5rem_1fr] items-center gap-2 text-xs">
                <span className="truncate text-ink-600">{t.label}</span>
                <div className="h-2 rounded-sm bg-paper-300"><div className="h-2 rounded-sm bg-ink-700" style={{ width: `${(r.signals[t.key] / maxSig) * 100}%` }} /></div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-ink-500">Relative signal from simplified equations with approximate 1.5 T relaxation values.</p>
        </div>
      </div>
      {!compact && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="panel panel-pad">
            <div className="kicker mb-2">Artefact risks</div>
            {r.risks.length ? <ul className="list-disc space-y-1 pl-4 text-sm text-ink-700">{r.risks.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="text-sm text-ink-500">No major model-flagged risks.</p>}
          </div>
          <div className="panel panel-pad">
            <div className="kicker mb-2">Parameter interactions</div>
            {r.interactions.length ? <ul className="list-disc space-y-1 pl-4 text-sm text-ink-700">{r.interactions.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="text-sm text-ink-500">—</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function KeyStats({ p }: { p: SimParams }) {
  const r = useMemo(() => simulate(p), [p]);
  const stats: [string, string, string][] = [
    ["Scan time", formatTime(r.timeSec), "estimate"],
    ["Relative SNR", r.relSnr.toFixed(2), "vs teaching example"],
    ["Pixel", `${r.pixelFreq.toFixed(2)} × ${r.pixelPhase.toFixed(2)}`, `mm · ${p.thickness} mm slice`],
  ];
  return (
    <div className="grid grid-cols-3 divide-x divide-rule rounded-md border border-rule bg-white">
      {stats.map(([k, v, sub]) => (
        <div key={k} className="px-3 py-3">
          <div className="kicker">{k}</div>
          <div className="mt-1 font-mono text-lg text-ink-900 xl:text-xl">{v}</div>
          <div className="text-[11px] text-ink-500">{sub}</div>
        </div>
      ))}
    </div>
  );
}

export function Simulator() {
  const search = useSearchParams();
  const s = useProgress();
  const [a, setA] = useState<SimParams>(TEACHING_EXAMPLE);
  const [b, setB] = useState<SimParams>(TEACHING_EXAMPLE);
  const [active, setActive] = useState<"A" | "B">("A");
  const [compare, setCompare] = useState(false);
  const [lastChange, setLastChange] = useState<string[]>([]);
  const [name, setName] = useState("");
  const loadedConfig = useRef(false);

  useEffect(() => {
    progress.visit("simulator", "simulator", "Console Simulator", "/simulator/");
  }, []);

  useEffect(() => {
    const id = search.get("config");
    if (!id || loadedConfig.current) return;
    const cfg = s.savedConfigs.find((c) => c.id === id);
    if (cfg) {
      loadedConfig.current = true;
      setA({ ...TEACHING_EXAMPLE, ...(cfg.params as Partial<SimParams>) });
    }
  }, [search, s.savedConfigs]);

  const cur = active === "A" ? a : b;
  const setCur = active === "A" ? setA : setB;
  const set = (patch: Partial<SimParams>) => {
    const next = { ...cur, ...patch };
    setLastChange(explainChange(cur, next));
    setCur(next);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button className="btn-secondary" onClick={() => { setCur(TEACHING_EXAMPLE); setLastChange([]); }}><RotateCcw size={15} /> Reset to Teaching Example</button>
        <label className="sr-only" htmlFor="preset">Load preset</label>
        <select id="preset" className="input w-auto" value="" onChange={(e) => { if (e.target.value) { setCur(withPreset(e.target.value)); setLastChange([]); } }}>
          <option value="">Load preset…</option>
          {Object.entries(PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button className={compare ? "btn-primary" : "btn-secondary"} aria-pressed={compare} onClick={() => setCompare(!compare)}><Columns2 size={15} /> Compare A / B</button>
        {compare && (
          <div className="flex rounded border border-rule" role="group" aria-label="Edit configuration">
            {(["A", "B"] as const).map((k) => (
              <button key={k} className={`px-3 py-1.5 text-sm ${active === k ? "bg-ink-800 text-white" : "bg-white"}`} aria-pressed={active === k} onClick={() => setActive(k)}>Edit {k}</button>
            ))}
          </div>
        )}
        {compare && <button className="btn-ghost" onClick={() => setB(a)}>Copy A → B</button>}
      </div>

      <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
        <div className="panel panel-pad self-start">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold">Configuration {compare ? active : ""}</h2>
            <Chip tone="teal">{FAMILY_LABEL[cur.family].split(" (")[0]}</Chip>
          </div>
          <Controls p={cur} set={set} />
          <div className="mt-5 border-t border-rule pt-4">
            <label htmlFor="cfgname" className="label">Save this configuration</label>
            <div className="mt-1 flex gap-2">
              <input id="cfgname" className="input" placeholder="e.g. Knee PD FS — sharper" value={name} onChange={(e) => setName(e.target.value)} />
              <button className="btn-secondary" disabled={!name.trim()} onClick={() => { progress.saveConfig(name.trim(), cur as unknown as Record<string, unknown>); setName(""); }}><Save size={15} /> Save</button>
            </div>
            {s.savedConfigs.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {s.savedConfigs.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <button className="truncate text-left text-teal-700 hover:underline" onClick={() => setCur({ ...TEACHING_EXAMPLE, ...(c.params as Partial<SimParams>) })}>{c.name}</button>
                    <button className="btn-ghost px-1.5 py-1" aria-label={`Delete ${c.name}`} onClick={() => progress.deleteConfig(c.id)}><Trash2 size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          {compare ? (
            <div className="grid gap-6 2xl:grid-cols-2">
              {([["A", a], ["B", b]] as const).map(([k, p]) => (
                <div key={k} className={`space-y-4 rounded-md p-1 ${active === k ? "ring-2 ring-teal-600" : ""}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-40 shrink-0"><PhantomCanvas params={p} label={`Configuration ${k}`} size={256} /></div>
                    <div><div className="font-serif text-lg font-semibold">Configuration {k}</div><p className="text-sm text-ink-600">{FAMILY_LABEL[p.family]} · TR {p.tr} / TE {p.te}{p.family === "IR-FSE" ? ` / TI ${p.ti}` : ""}</p></div>
                  </div>
                  <Results p={p} compact />
                </div>
              ))}
              <div className="panel panel-pad 2xl:col-span-2">
                <div className="kicker mb-1">A → B difference</div>
                <ul className="list-disc space-y-1 pl-4 text-sm">{explainChange(a, b).map((l) => <li key={l}>{l}</li>)}</ul>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
                <figure>
                  <PhantomCanvas params={cur} label="Simulated phantom" size={384} />
                  <figcaption className="mt-2 text-[11px] leading-snug text-ink-500">
                    Synthetic digital phantom (educational illustration, not patient data): scalp fat, cortex, white matter, ventricles, an oedematous lesion (upper right) and a small diffusion-restricting focus (lower left). Frequency direction is horizontal.
                  </figcaption>
                </figure>
                <div className="space-y-4">
                  <KeyStats p={cur} />
                  <div className="panel panel-pad border-teal-600/40 bg-teal-50" aria-live="polite">
                    <div className="kicker mb-1 text-teal-800">What your last change did — reasoning</div>
                    {lastChange.length > 0 ? (
                      <ul className="list-disc space-y-1 pl-4 text-sm text-ink-800">{lastChange.map((l) => <li key={l}>{l}</li>)}</ul>
                    ) : (
                      <p className="text-sm text-ink-700">Change any control. The physical reasoning behind the new time, SNR and contrast will appear here.</p>
                    )}
                  </div>
                </div>
              </div>
              <Results p={cur} />
            </>
          )}
          <p className="text-xs text-ink-500">Learn the parameters behind each control in the <Link href="/parameters/">Parameter Academy</Link>. The simulator models a subset of behaviour; real GE sequences include additional timing overheads and constraints that are only shown on the scanner.</p>
        </div>
      </div>
    </div>
  );
}
