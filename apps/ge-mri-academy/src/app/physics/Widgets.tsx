"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TISSUES, FAT_WATER_HZ } from "@/lib/sim";
import { fft2d, freqIndex } from "@/lib/fft";
import { labels, N } from "@/lib/phantom";

const COLORS: Record<string, string> = { wm: "#13233f", gm: "#5b6b88", csf: "#0f6f68", fat: "#b45309" };
const T4 = TISSUES.filter((t) => ["wm", "gm", "csf", "fat"].includes(t.key));

function Slider({ label, value, min, max, step = 1, unit, onChange }: { label: string; value: number; min: number; max: number; step?: number; unit: string; onChange: (v: number) => void }) {
  const id = `w-${label.replace(/\W+/g, "")}`;
  return (
    <div>
      <div className="flex justify-between text-xs"><label htmlFor={id} className="label">{label}</label><span className="font-mono">{value} {unit}</span></div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-teal-700" />
    </div>
  );
}

function Plot({ fn, xMax, marker, yMin = 0, yLabel, xLabel }: { fn: (k: string, t: number) => number; xMax: number; marker: number; yMin?: number; yLabel: string; xLabel: string }) {
  const W = 320, H = 150, P = 26;
  const sx = (t: number) => P + (t / xMax) * (W - P - 6);
  const sy = (v: number) => H - P - ((v - yMin) / (1 - yMin)) * (H - P - 8);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${yLabel} versus ${xLabel}`}>
      <line x1={P} y1={sy(0)} x2={W - 4} y2={sy(0)} stroke="#d8d2c4" />
      <line x1={P} y1={8} x2={P} y2={H - P} stroke="#d8d2c4" />
      {T4.map((t) => {
        const pts = Array.from({ length: 81 }, (_, i) => { const x = (i / 80) * xMax; return `${sx(x)},${sy(fn(t.key, x))}`; }).join(" ");
        return <polyline key={t.key} points={pts} fill="none" stroke={COLORS[t.key]} strokeWidth={1.6} />;
      })}
      <line x1={sx(marker)} x2={sx(marker)} y1={8} y2={H - P} stroke="#b42318" strokeDasharray="3 3" />
      <text x={W / 2} y={H - 6} fontSize={9} textAnchor="middle" fill="#5b6b88">{xLabel}</text>
      <text x={4} y={12} fontSize={9} fill="#5b6b88">{yLabel}</text>
    </svg>
  );
}

function Legend() {
  return <div className="flex flex-wrap gap-3 text-[11px]">{T4.map((t) => <span key={t.key} className="flex items-center gap-1"><span className="inline-block h-2 w-3" style={{ background: COLORS[t.key] }} />{t.label}</span>)}</div>;
}

function Relaxation() {
  const [tr, setTr] = useState(600);
  const [te, setTe] = useState(15);
  const T = Object.fromEntries(TISSUES.map((t) => [t.key, t]));
  const sig = (k: string) => T[k].pd * (1 - Math.exp(-tr / T[k].t1)) * Math.exp(-te / T[k].t2);
  const max = Math.max(...T4.map((t) => sig(t.key)));
  const weighting = tr < 900 && te < 30 ? "T1-weighted" : tr > 2000 && te > 70 ? "T2-weighted" : tr > 2000 && te < 45 ? "PD-weighted" : "Mixed";
  return (
    <div className="panel panel-pad space-y-3">
      <div className="kicker">Interactive · T1 recovery and T2 decay</div>
      <Plot fn={(k, t) => T[k].pd * (1 - Math.exp(-t / T[k].t1))} xMax={5000} marker={tr} yLabel="Mz (T1 recovery)" xLabel="time (ms) — red line = TR" />
      <Slider label="TR" value={tr} min={100} max={5000} step={50} unit="ms" onChange={setTr} />
      <Plot fn={(k, t) => T[k].pd * (1 - Math.exp(-tr / T[k].t1)) * Math.exp(-t / (k === "csf" ? 2000 : T[k].t2))} xMax={300} marker={te} yLabel="Mxy at echo" xLabel="time (ms) — red line = TE" />
      <Slider label="TE" value={te} min={5} max={300} step={1} unit="ms" onChange={setTe} />
      <Legend />
      <div className="space-y-1">{T4.map((t) => <div key={t.key} className="grid grid-cols-[6rem_1fr] items-center gap-2 text-xs"><span>{t.label}</span><div className="h-2 bg-paper-300"><div className="h-2" style={{ width: `${(sig(t.key) / max) * 100}%`, background: COLORS[t.key] }} /></div></div>)}</div>
      <p className="text-xs text-ink-600">Result: <strong>{weighting}</strong> (spin-echo approximation, approximate 1.5 T values).</p>
    </div>
  );
}

function IRWidget() {
  const [ti, setTi] = useState(160);
  const [tr, setTr] = useState(5000);
  const T = Object.fromEntries(TISSUES.map((t) => [t.key, t]));
  const mz = (k: string, t: number) => T[k].pd * (1 - 2 * Math.exp(-t / T[k].t1) + Math.exp(-tr / T[k].t1));
  const nulls = T4.map((t) => ({ l: t.label, ti: Math.round(t.t1 * Math.log(2 / (1 + Math.exp(-tr / t.t1)))) }));
  return (
    <div className="panel panel-pad space-y-3">
      <div className="kicker">Interactive · inversion recovery null points</div>
      <Plot fn={(k, t) => mz(k, t)} xMax={4000} marker={ti} yMin={-1} yLabel="Mz after 180° inversion" xLabel="time after inversion (ms) — red line = TI" />
      <Slider label="TI" value={ti} min={20} max={4000} step={10} unit="ms" onChange={setTi} />
      <Slider label="TR" value={tr} min={1500} max={12000} step={100} unit="ms" onChange={setTr} />
      <Legend />
      <ul className="text-xs text-ink-600">{nulls.map((n) => <li key={n.l}>{n.l} nulls at TI ≈ <span className="font-mono">{n.ti} ms</span></li>)}</ul>
    </div>
  );
}

function Larmor() {
  const [b0, setB0] = useState(1.5);
  return (
    <div className="panel panel-pad space-y-3">
      <div className="kicker">Calculator · Larmor and fat–water shift</div>
      <Slider label="B0" value={b0} min={0.2} max={7} step={0.1} unit="T" onChange={setB0} />
      <p className="text-sm">Water: <span className="font-mono">{(42.58 * b0).toFixed(2)} MHz</span></p>
      <p className="text-sm">Fat–water difference (3.5 ppm): <span className="font-mono">{(3.5 * 42.58 * b0).toFixed(0)} Hz</span></p>
      <p className="text-sm">Opposed-phase TE (first): <span className="font-mono">{(1000 / (2 * 3.5 * 42.58 * b0)).toFixed(2)} ms</span></p>
      <p className="text-xs text-ink-500">The single-peak 3.5 ppm model is a simplification; fat has several spectral peaks.</p>
    </div>
  );
}

function ChemShift() {
  const [bw, setBw] = useState(31.25);
  const [freq, setFreq] = useState(256);
  const bpp = (2 * bw * 1000) / freq;
  return (
    <div className="panel panel-pad space-y-3">
      <div className="kicker">Calculator · bandwidth and chemical shift (1.5 T)</div>
      <Slider label="Receive bandwidth (±)" value={bw} min={5} max={125} step={0.25} unit="kHz" onChange={setBw} />
      <Slider label="Frequency matrix" value={freq} min={128} max={512} step={32} unit="" onChange={setFreq} />
      <p className="text-sm">Bandwidth/pixel: <span className="font-mono">{bpp.toFixed(0)} Hz</span></p>
      <p className="text-sm">Fat–water shift: <span className="font-mono">{(FAT_WATER_HZ / bpp).toFixed(2)} pixels</span></p>
      <p className="text-sm">Relative SNR (∝ 1/√BW vs ±31.25): <span className="font-mono">{Math.sqrt(31.25 / bw).toFixed(2)}</span></p>
    </div>
  );
}

function SNR() {
  const [nex, setNex] = useState(1);
  const [th, setTh] = useState(5);
  const [bw, setBw] = useState(31.25);
  const rel = Math.sqrt(nex) * (th / 5) * Math.sqrt(31.25 / bw);
  return (
    <div className="panel panel-pad space-y-3">
      <div className="kicker">Calculator · SNR trade-offs</div>
      <Slider label="NEX" value={nex} min={1} max={8} unit="" onChange={setNex} />
      <Slider label="Slice thickness" value={th} min={1} max={10} step={0.5} unit="mm" onChange={setTh} />
      <Slider label="Bandwidth (±)" value={bw} min={7.8} max={125} step={0.1} unit="kHz" onChange={setBw} />
      <p className="text-sm">Relative SNR: <span className="font-mono text-lg">{rel.toFixed(2)}</span> · relative time (NEX): <span className="font-mono">×{nex}</span></p>
    </div>
  );
}

function KSpace() {
  const [radius, setRadius] = useState(0.25);
  const [mode, setMode] = useState<"centre" | "periphery">("centre");
  const ref = useRef<HTMLCanvasElement>(null);
  const kref = useRef<HTMLCanvasElement>(null);
  const base = useMemo(() => {
    const L = labels();
    const vals = [0, 0.9, 0.02, 0.95, 0.55, 0.35, 0.95, 0.75, 0.6];
    const re = new Float64Array(N * N), im = new Float64Array(N * N);
    for (let i = 0; i < N * N; i++) re[i] = vals[L[i]];
    fft2d(re, im, N);
    return { re, im };
  }, []);
  useEffect(() => {
    const re = new Float64Array(base.re), im = new Float64Array(base.im);
    const kimg = new Float64Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const r = Math.hypot(freqIndex(x, N), freqIndex(y, N)) / (N / 2);
      const keep = mode === "centre" ? r <= radius : r > radius;
      const i = y * N + x;
      if (!keep) { re[i] = 0; im[i] = 0; }
      const sx = (x + N / 2) % N, sy = (y + N / 2) % N;
      kimg[sy * N + sx] = Math.log(1 + Math.hypot(re[i], im[i]));
    }
    fft2d(re, im, N, true);
    const draw = (c: HTMLCanvasElement | null, arr: Float64Array, mag: boolean) => {
      if (!c) return;
      const ctx = c.getContext("2d")!;
      const d = ctx.createImageData(N, N);
      let max = 0;
      const v = arr.map((_, i) => (mag ? Math.hypot(re[i], im[i]) : arr[i]));
      for (const x of v) if (x > max) max = x;
      for (let i = 0; i < N * N; i++) { const g = (v[i] / (max || 1)) * 255; d.data[i * 4] = g; d.data[i * 4 + 1] = g; d.data[i * 4 + 2] = g; d.data[i * 4 + 3] = 255; }
      ctx.putImageData(d, 0, 0);
    };
    draw(ref.current, re, true);
    draw(kref.current, kimg, false);
  }, [base, radius, mode]);
  return (
    <div className="panel panel-pad space-y-3">
      <div className="kicker">Interactive · which k-space carries what</div>
      <div className="grid grid-cols-2 gap-2">
        <figure><canvas ref={kref} width={N} height={N} className="w-full bg-black [image-rendering:pixelated]" role="img" aria-label="Masked k-space (log magnitude)" /><figcaption className="text-[11px] text-ink-500">k-space (kept region)</figcaption></figure>
        <figure><canvas ref={ref} width={N} height={N} className="w-full bg-black" role="img" aria-label="Reconstructed synthetic phantom image" /><figcaption className="text-[11px] text-ink-500">Reconstructed image</figcaption></figure>
      </div>
      <div className="flex gap-2">
        <button className={mode === "centre" ? "btn-primary" : "btn-secondary"} onClick={() => setMode("centre")}>Keep centre</button>
        <button className={mode === "periphery" ? "btn-primary" : "btn-secondary"} onClick={() => setMode("periphery")}>Keep periphery</button>
      </div>
      <Slider label="Mask radius (fraction of k-max)" value={radius} min={0.02} max={1} step={0.02} unit="" onChange={setRadius} />
      <p className="text-xs text-ink-600">Centre only: contrast preserved, edges blurred, ringing at boundaries. Periphery only: edges without contrast. Synthetic phantom — educational illustration.</p>
    </div>
  );
}

export function PhysicsWidget({ kind }: { kind: "relaxation" | "larmor" | "kspace" | "chemshift" | "ir" | "snr" }) {
  switch (kind) {
    case "relaxation": return <Relaxation />;
    case "ir": return <IRWidget />;
    case "larmor": return <Larmor />;
    case "chemshift": return <ChemShift />;
    case "snr": return <SNR />;
    case "kspace": return <KSpace />;
  }
}
