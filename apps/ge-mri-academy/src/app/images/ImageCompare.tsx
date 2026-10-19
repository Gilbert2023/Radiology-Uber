"use client";

import { useState } from "react";
import { PhantomCanvas } from "@/components/PhantomCanvas";
import type { PhantomPreset } from "@/content/types";
import { presetParams } from "./presets";

const PAIRS: { a: PhantomPreset; b: PhantomPreset; title: string; teach: string }[] = [
  { a: "T1", b: "T2", title: "T1 versus T2", teach: "T1: short TR exploits T1 differences — WM brighter than GM, CSF dark. T2: long TE exploits T2 differences — CSF and oedema bright. Check fluid first to identify the weighting." },
  { a: "T2", b: "FLAIR", title: "T2 versus FLAIR", teach: "FLAIR nulls CSF so lesions adjacent to ventricles and sulci stand out. Posterior fossa lesions can be less conspicuous on FLAIR, and CSF-flow artefacts can mimic disease." },
  { a: "DWI", b: "ADC", title: "DWI versus ADC", teach: "Restricted diffusion is bright on high-b DWI and dark on ADC. Bright on both = T2 shine-through. The small focus (lower left) restricts; the oedematous lesion (upper right) does not." },
  { a: "GRE", b: "T2", title: "GRE versus spin echo", teach: "GRE lacks a 180° refocusing pulse, so T2* dephasing (susceptibility) is not reversed — sensitive to haemorrhage/calcium but vulnerable near metal and air." },
  { a: "STIR", b: "T2FS", title: "STIR versus frequency-selective fat suppression", teach: "STIR nulls fat by T1 (B0-robust, lower SNR, not for post-contrast). Chem Sat targets fat frequency (higher SNR, fails where B0 is inhomogeneous)." },
  { a: "T1", b: "T1C", title: "Pre- versus post-contrast T1", teach: "Gadolinium shortens T1 of enhancing tissue. Compare with identical pre-contrast parameters and geometry; intrinsic T1 hyperintensity must be identified first." },
  { a: "T2", b: "motion", title: "Artefact: motion ghosting", teach: "Ghosts propagate along the phase-encoding direction and extend beyond anatomy — a key discriminator from pathology." },
  { a: "T2", b: "chemshift", title: "Artefact: chemical shift", teach: "Narrow bandwidth per pixel shifts fat along the frequency axis. Widen bandwidth or swap frequency direction to confirm." },
  { a: "T2", b: "wrap", title: "Artefact: phase wrap", teach: "Tissue outside the phase FOV aliases onto the opposite side. Enable No Phase Wrap or enlarge the phase FOV." },
];

export function ImageCompare() {
  const [i, setI] = useState(0);
  const [pos, setPos] = useState(50);
  const pair = PAIRS[i];
  const A = presetParams(pair.a), B = presetParams(pair.b);
  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Comparison">
        {PAIRS.map((p, k) => <button key={p.title} role="tab" aria-selected={k === i} className={k === i ? "btn-primary" : "btn-secondary"} onClick={() => setI(k)}>{p.title}</button>)}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <div>
          <div className="relative aspect-square w-full select-none overflow-hidden rounded-md bg-black">
            <div className="absolute inset-0"><PhantomCanvas params={B.p} opts={B.opts} label={B.label} size={384} /></div>
            <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}><PhantomCanvas params={A.p} opts={A.opts} label={A.label} size={384} /></div>
            <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-teal-100" style={{ left: `${pos}%` }} aria-hidden />
            <span className="absolute left-2 top-2 rounded-sm bg-black/70 px-1.5 py-0.5 text-[11px] text-white">{A.label}</span>
            <span className="absolute right-2 top-2 rounded-sm bg-black/70 px-1.5 py-0.5 text-[11px] text-white">{B.label}</span>
          </div>
          <label htmlFor="cmp" className="sr-only">Comparison slider</label>
          <input id="cmp" type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} className="mt-2 w-full accent-teal-700" />
          <p className="text-[11px] text-ink-500">Synthetic phantom — educational illustration, not patient data.</p>
        </div>
        <div className="space-y-3">
          <h2 className="font-serif text-xl font-semibold">{pair.title}</h2>
          <p className="text-sm leading-relaxed text-ink-700">{pair.teach}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="panel panel-pad text-sm"><div className="kicker mb-1">{A.label}</div>{A.note}</div>
            <div className="panel panel-pad text-sm"><div className="kicker mb-1">{B.label}</div>{B.note}</div>
          </div>
          <div className="panel panel-pad text-sm text-ink-600">
            <div className="kicker mb-1">Phantom key</div>
            Outer bright ring: scalp fat · dark ring: skull · cortex (GM) and central white matter · paired ventricles (CSF) · upper-right oval: oedematous lesion · lower-left focus: diffusion-restricting tissue.
          </div>
        </div>
      </div>
    </section>
  );
}
