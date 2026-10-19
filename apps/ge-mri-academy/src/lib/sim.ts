/**
 * Educational MRI parameter model.
 *
 * Every number produced here is an EDUCATIONAL APPROXIMATION based on textbook
 * relationships (see McRobbie et al.; Bernstein et al.). It is not a GE scanner
 * prediction and must never be used for clinical, SAR or safety decisions.
 */

export type SeqFamily = "SE" | "FSE" | "FRFSE" | "SSFSE" | "IR-FSE" | "GRE" | "3D-GRE" | "DWI";
export type FatSat = "none" | "chem" | "stir" | "dixon";
export type Plane = "Axial" | "Sagittal" | "Coronal";

export interface SimParams {
  family: SeqFamily;
  plane: Plane;
  tr: number; // ms
  te: number; // ms (effective TE for FSE)
  ti: number; // ms (IR only)
  flip: number; // deg (GRE excitation; FSE refocusing)
  etl: number;
  nex: number;
  freq: number;
  phase: number;
  fov: number; // cm
  phaseFov: number; // fraction
  thickness: number; // mm
  slices: number;
  bw: number; // ± kHz (GE convention)
  accel: number; // parallel imaging factor
  fatSat: FatSat;
  bValue: number; // DWI
}

export const FAMILY_LABEL: Record<SeqFamily, string> = {
  SE: "Spin Echo (SE)",
  FSE: "Fast Spin Echo (FSE)",
  FRFSE: "Fast Recovery FSE (FRFSE)",
  SSFSE: "Single-shot FSE (SSFSE)",
  "IR-FSE": "Inversion Recovery FSE (FLAIR/STIR/T1 FLAIR)",
  GRE: "2D Spoiled Gradient Echo",
  "3D-GRE": "3D Spoiled Gradient Echo",
  DWI: "Diffusion-weighted EPI",
};

/** Teaching example modelled loosely on the supplied axial FRFSE T2 screenshot (values are typical, not copied). */
export const TEACHING_EXAMPLE: SimParams = {
  family: "FRFSE", plane: "Axial", tr: 4000, te: 100, ti: 0, flip: 160, etl: 16, nex: 1,
  freq: 320, phase: 256, fov: 24, phaseFov: 0.8, thickness: 5, slices: 24, bw: 31.25, accel: 1, fatSat: "none", bValue: 1000,
};

export const PRESETS: Record<string, { label: string; p: Partial<SimParams> }> = {
  t2frfse: { label: "Axial T2 FRFSE brain", p: TEACHING_EXAMPLE },
  t1se: { label: "Axial T1 SE brain", p: { family: "SE", tr: 550, te: 12, etl: 1, flip: 180, nex: 2, freq: 256, phase: 192, slices: 20, bw: 15.63 } },
  flair: { label: "Axial T2 FLAIR", p: { family: "IR-FSE", tr: 9000, te: 120, ti: 2350, etl: 20, freq: 320, phase: 224, slices: 24, bw: 31.25 } },
  stir: { label: "Sagittal STIR spine", p: { family: "IR-FSE", plane: "Sagittal", tr: 4000, te: 50, ti: 160, etl: 10, freq: 320, phase: 224, fov: 30, phaseFov: 1, thickness: 3, slices: 13, bw: 41.67 } },
  pdfs: { label: "Knee PD FS", p: { family: "FSE", plane: "Sagittal", tr: 3000, te: 35, etl: 8, freq: 384, phase: 256, fov: 16, phaseFov: 0.8, thickness: 3.5, slices: 24, bw: 41.67, fatSat: "chem", nex: 1 } },
  spgr3d: { label: "3D T1 GRE", p: { family: "3D-GRE", tr: 8, te: 3, flip: 12, etl: 1, freq: 256, phase: 256, fov: 24, phaseFov: 1, thickness: 1, slices: 160, bw: 31.25, accel: 2 } },
  dwi: { label: "Axial DWI b1000", p: { family: "DWI", tr: 5000, te: 80, etl: 1, freq: 128, phase: 128, fov: 24, phaseFov: 1, thickness: 5, slices: 24, bw: 250, accel: 2, fatSat: "chem", nex: 2, bValue: 1000 } },
  ssfse: { label: "Coronal SSFSE abdomen", p: { family: "SSFSE", plane: "Coronal", tr: 1200, te: 90, etl: 128, freq: 320, phase: 224, fov: 38, phaseFov: 1, thickness: 6, slices: 20, bw: 83.33 } },
};

export function withPreset(key: string): SimParams {
  return { ...TEACHING_EXAMPLE, ...PRESETS[key].p };
}

/** Approximate 1.5 T relaxation values (ms) — textbook ranges vary between sources (e.g. Bottomley et al. 1984). */
export interface Tissue {
  key: string;
  label: string;
  t1: number;
  t2: number;
  t2s: number;
  pd: number;
  adc: number; // mm²/s ×1e-3
  fat?: boolean;
}

export const TISSUES: Tissue[] = [
  { key: "wm", label: "White matter", t1: 650, t2: 80, t2s: 60, pd: 0.7, adc: 0.75 },
  { key: "gm", label: "Grey matter", t1: 1050, t2: 100, t2s: 70, pd: 0.82, adc: 0.85 },
  { key: "csf", label: "CSF", t1: 4000, t2: 2000, t2s: 1500, pd: 1, adc: 3.0 },
  { key: "fat", label: "Fat", t1: 260, t2: 80, t2s: 40, pd: 0.9, adc: 0.02, fat: true },
  { key: "lesion", label: "Oedematous lesion", t1: 1100, t2: 180, t2s: 120, pd: 0.88, adc: 1.3 },
  { key: "infarct", label: "Acute infarct (restricted)", t1: 1000, t2: 120, t2s: 90, pd: 0.85, adc: 0.4 },
];

const GAMMA_BAR = 42.58; // MHz/T
export const FAT_WATER_HZ = 3.5 * GAMMA_BAR * 1.5; // ≈ 224 Hz at 1.5 T

export interface SimResult {
  timeSec: number;
  timeNote: string;
  relSnr: number;
  pixelFreq: number;
  pixelPhase: number;
  voxel: number;
  bwPerPixel: number;
  chemShiftPx: number;
  esp: number;
  trainMs: number;
  blurIndex: number;
  slicesPerTr: number;
  acqs: number;
  phaseLines: number;
  signals: Record<string, number>;
  weighting: string;
  contrastNotes: string[];
  risks: string[];
  interactions: string[];
  rfIndex: number;
  warnings: string[];
}

function g(R: number) {
  // Illustrative geometry-factor model: grows with R. Real g depends on coil geometry.
  return 1 + 0.08 * Math.pow(Math.max(0, R - 1), 1.6);
}

export function readoutMs(p: SimParams) {
  return (p.freq / (2 * p.bw * 1000)) * 1000;
}

export function echoSpacing(p: SimParams) {
  if (p.family === "DWI") return readoutMs(p) + 0.3; // EPI line spacing: one readout plus ramps (approx.)
  return readoutMs(p) + 3; // + refocusing pulse and crushers (approx.)
}

function isFse(f: SeqFamily) {
  return f === "FSE" || f === "FRFSE" || f === "SSFSE" || f === "IR-FSE";
}

export function tissueSignal(p: SimParams, t: Tissue): number {
  const fatT2 = isFse(p.family) && p.etl > 1 ? 140 : t.t2; // J-coupling: fat brighter on FSE (approx.)
  const T2 = t.fat ? fatT2 : t.t2;
  const tr = p.family === "SSFSE" ? Math.max(p.tr, 6000) : p.tr; // single-shot: effectively long recovery per slice
  const E1 = Math.exp(-tr / t.t1);
  let s = 0;
  const train = trainDuration(p);
  switch (p.family) {
    case "SE":
    case "FSE":
    case "SSFSE":
      s = t.pd * (1 - E1) * Math.exp(-p.te / T2);
      break;
    case "FRFSE": {
      const resid = Math.exp(-train / T2);
      const recov = Math.max(0, tr - train);
      s = t.pd * (1 - (1 - resid) * Math.exp(-recov / t.t1)) * Math.exp(-p.te / T2);
      break;
    }
    case "IR-FSE":
      s = t.pd * Math.abs(1 - 2 * Math.exp(-p.ti / t.t1) + E1) * Math.exp(-p.te / T2);
      break;
    case "GRE":
    case "3D-GRE": {
      const a = (p.flip * Math.PI) / 180;
      s = (t.pd * Math.sin(a) * (1 - E1)) / (1 - Math.cos(a) * E1) * Math.exp(-p.te / t.t2s);
      break;
    }
    case "DWI":
      s = t.pd * (1 - E1) * Math.exp(-p.te / T2) * Math.exp(-p.bValue * t.adc * 1e-3);
      break;
  }
  if (t.fat) {
    if (p.fatSat === "chem") s *= 0.1;
    if (p.fatSat === "dixon") s *= 0.05;
    if (p.fatSat === "stir" && p.family !== "IR-FSE") {
      s = t.pd * Math.abs(1 - 2 * Math.exp(-160 / t.t1) + E1) * Math.exp(-p.te / T2);
    }
  }
  if (p.fatSat === "stir" && !t.fat && p.family !== "IR-FSE") {
    s = t.pd * Math.abs(1 - 2 * Math.exp(-160 / t.t1) + E1) * Math.exp(-p.te / T2);
  }
  return s;
}

export function trainDuration(p: SimParams) {
  if (p.family === "SSFSE") return (p.phase * p.phaseFov) / Math.max(1, p.accel) * 0.55 * echoSpacing(p);
  if (!isFse(p.family)) return 0;
  return p.etl * echoSpacing(p);
}

function perSliceMs(p: SimParams) {
  const fs = p.fatSat === "chem" || p.fatSat === "dixon" ? 12 : 0;
  switch (p.family) {
    case "SE":
      return p.te + readoutMs(p) / 2 + 8 + fs;
    case "FSE":
    case "FRFSE":
      return trainDuration(p) + 12 + fs + (p.family === "FRFSE" ? 6 : 0);
    case "IR-FSE":
      return trainDuration(p) + 20 + fs;
    case "GRE":
      return p.tr; // one slice per TR in this simplified 2D model
    default:
      return p.tr;
  }
}

export function simulate(p: SimParams, ref: SimParams = TEACHING_EXAMPLE): SimResult {
  const warnings: string[] = [];
  const phaseLines = Math.round(p.phase * p.phaseFov);
  const pixelFreq = (p.fov * 10) / p.freq;
  const pixelPhase = (p.fov * 10) / p.phase;
  const voxel = pixelFreq * pixelPhase * p.thickness;
  const bwPerPixel = (2 * p.bw * 1000) / p.freq;
  const chemShiftPx = FAT_WATER_HZ / bwPerPixel;
  const esp = echoSpacing(p);
  const trainMs = trainDuration(p);
  const R = Math.max(1, p.accel);

  // Slices per TR and acquisitions (2D multi-slice)
  let slicesPerTr = p.slices;
  let acqs = 1;
  if (p.family === "SE" || p.family === "FSE" || p.family === "FRFSE" || p.family === "IR-FSE") {
    slicesPerTr = Math.max(1, Math.floor(p.tr / perSliceMs(p)));
    acqs = Math.ceil(p.slices / slicesPerTr);
  }

  // Scan time (seconds)
  let timeMs = 0;
  let timeNote = "";
  const linesAccel = phaseLines / R;
  switch (p.family) {
    case "SE":
      timeMs = p.tr * linesAccel * p.nex * acqs;
      timeNote = "TR × phase lines × NEX × acquisitions ÷ R";
      break;
    case "FSE":
    case "FRFSE":
    case "IR-FSE":
      timeMs = (p.tr * linesAccel * p.nex * acqs) / Math.max(1, p.etl);
      timeNote = "TR × phase lines × NEX × acquisitions ÷ (ETL × R)";
      break;
    case "SSFSE":
      timeMs = p.slices * Math.max(p.tr, trainMs + 100) * p.nex;
      timeNote = "slices × per-slice TR (single-shot, half-Fourier approximation)";
      break;
    case "GRE":
      timeMs = p.tr * linesAccel * p.nex * p.slices;
      timeNote = "TR × phase lines × NEX × slices (sequential 2D GRE simplification)";
      break;
    case "3D-GRE":
      timeMs = p.tr * linesAccel * p.slices * p.nex;
      timeNote = "TR × phase lines × slice encodes × NEX ÷ R";
      break;
    case "DWI":
      timeMs = p.tr * p.nex * 4;
      timeNote = "TR × NEX × (b0 + 3 diffusion directions), single-shot EPI";
      break;
  }

  // Relative SNR ∝ voxel × √(lines × NEX × readout) ÷ (g√R)
  const snrRaw = (q: SimParams) => {
    const lines = Math.round(q.phase * q.phaseFov);
    const vox = ((q.fov * 10) / q.freq) * ((q.fov * 10) / q.phase) * (q.family === "3D-GRE" ? q.thickness * Math.sqrt(q.slices) : q.thickness);
    return (vox * Math.sqrt((lines * q.nex * q.freq) / (2 * q.bw))) / (g(Math.max(1, q.accel)) * Math.sqrt(Math.max(1, q.accel)));
  };
  const relSnr = snrRaw(p) / snrRaw(ref);

  const signals: Record<string, number> = {};
  for (const t of TISSUES) signals[t.key] = tissueSignal(p, t);

  // Weighting classification (heuristic)
  let weighting = "Mixed";
  const contrastNotes: string[] = [];
  if (p.family === "DWI") weighting = `Diffusion-weighted (b = ${p.bValue})`;
  else if (p.family === "IR-FSE") {
    if (p.ti > 1500) weighting = "T2 FLAIR (CSF-nulled) — check null point vs TR";
    else if (p.ti < 250) weighting = "STIR (fat-nulled)";
    else weighting = "T1-weighted inversion recovery (e.g. T1 FLAIR)";
  } else if (p.family === "GRE" || p.family === "3D-GRE") {
    if (p.flip >= 30 && p.te < 10) weighting = "T1-weighted spoiled GRE";
    else if (p.flip < 30 && p.te >= 15) weighting = "T2*-weighted GRE";
    else weighting = "PD/mixed GRE";
  } else {
    if (p.tr < 900 && p.te < 30) weighting = "T1-weighted";
    else if (p.tr >= 2000 && p.te >= 70) weighting = "T2-weighted";
    else if (p.tr >= 2000 && p.te < 45) weighting = "Proton-density weighted";
    else weighting = "Mixed weighting (intermediate TR/TE)";
  }
  if (signals.csf > signals.wm * 1.3) contrastNotes.push("CSF brighter than white matter (fluid-bright).");
  else if (signals.csf < signals.wm * 0.6) contrastNotes.push("CSF darker than white matter.");
  if (signals.wm > signals.gm) contrastNotes.push("White matter brighter than grey matter (T1-type grey–white contrast).");
  else contrastNotes.push("Grey matter brighter than white matter (T2/PD-type grey–white contrast).");
  if (signals.fat < 0.1) contrastNotes.push("Fat suppressed/nulled.");
  else if (signals.fat > signals.wm) contrastNotes.push("Fat bright.");
  if (p.family === "DWI") contrastNotes.push(signals.infarct > signals.wm * 1.3 ? "Restricted-diffusion tissue bright on this b-value — confirm with ADC." : "Little diffusion contrast at this b-value.");

  // Blur index: echo-train duration relative to WM T2
  const blurIndex = isFse(p.family) ? trainMs / 80 : 0;

  // Artefact risks
  const risks: string[] = [];
  if (chemShiftPx > 1.5 && p.family !== "DWI") risks.push(`Chemical shift ≈ ${chemShiftPx.toFixed(1)} px in the frequency direction (narrow bandwidth per pixel).`);
  if (p.family === "DWI") risks.push("EPI: large fat–water shift and susceptibility distortion in the phase direction — fat suppression and shim are essential; parallel imaging shortens the echo train.");
  if (blurIndex > 2) risks.push("Long echo train relative to tissue T2: expect blurring of short-T2 structures.");
  else if (blurIndex > 1.2) risks.push("Moderate echo-train blurring possible.");
  if (p.phase < 192 && p.family !== "DWI") risks.push("Low phase matrix: truncation (Gibbs) ringing near sharp interfaces.");
  if (p.phaseFov < 0.8) risks.push("Reduced phase FOV: wrap risk if anatomy extends beyond the FOV (consider No Phase Wrap).");
  if (R >= 3) risks.push("High parallel-imaging factor: noise amplification and residual aliasing depend on coil geometry.");
  if (p.fatSat === "chem") risks.push("Frequency-selective fat sat depends on B0 homogeneity: may fail near metal/air or at FOV edges.");
  if (p.fatSat === "stir") risks.push("STIR nulls any tissue with T1 near fat — do not use for post-contrast enhancement.");
  if ((p.family === "GRE" || p.family === "3D-GRE") && p.te > 10) risks.push("Longer TE GRE: susceptibility blooming around air, metal, haemorrhage.");
  if (timeMs / 1000 > 300) risks.push("Long acquisition (> 5 min): motion risk increases.");
  if (pixelFreq / pixelPhase > 1.6 || pixelPhase / pixelFreq > 1.6) risks.push("Strongly rectangular pixels: anisotropic in-plane resolution.");

  // Interactions
  const interactions: string[] = [];
  if (acqs > 1) interactions.push(`${p.slices} slices do not fit in one TR (≈${slicesPerTr} per TR): ${acqs} acquisitions multiply the scan time.`);
  if (isFse(p.family) && p.family !== "SSFSE") {
    const k = Math.max(1, Math.round(p.te / esp));
    if (k > p.etl) warnings.push(`Requested effective TE (${p.te} ms) exceeds the echo-train duration (${(p.etl * esp).toFixed(0)} ms). Increase ETL or reduce TE.`);
    interactions.push(`Echo spacing ≈ ${esp.toFixed(1)} ms: achievable effective TEs are multiples (nearest ≈ ${(k * esp).toFixed(0)} ms).`);
  }
  if (p.family === "SE" && p.te < readoutMs(p) / 2 + 5) warnings.push(`TE ${p.te} ms is below the approximate minimum (${(readoutMs(p) / 2 + 5).toFixed(1)} ms) for this bandwidth and matrix.`);
  if (p.family === "IR-FSE" && p.ti >= p.tr) warnings.push("TI must be shorter than TR.");
  if (p.family === "IR-FSE" && p.ti > 1500) {
    const nullTi = 4000 * Math.log(2 / (1 + Math.exp(-p.tr / 4000)));
    interactions.push(`For TR ${p.tr} ms, CSF (T1 ≈ 4000 ms) nulls at TI ≈ ${nullTi.toFixed(0)} ms in this model.`);
  }
  if (p.bw > 50 && p.family !== "DWI") interactions.push("Wide bandwidth shortens echo spacing and chemical shift but costs SNR (∝ 1/√BW).");
  if (p.nex > 2) interactions.push("NEX > 2: SNR rises only with √NEX while time rises linearly — consider voxel size or coil choice first.");
  if (R > 1) interactions.push(`Parallel imaging R = ${R}: time ÷ ~${R}, SNR ÷ (g√R) — g-factor here is illustrative.`);

  // Relative RF demand (NOT SAR)
  const rfPulsesPerSec = (q: SimParams) => {
    const spt = Math.min(q.slices, q.family === "GRE" || q.family === "3D-GRE" || q.family === "DWI" ? 1 : Math.max(1, Math.floor(q.tr / perSliceMs(q))));
    const refoc = isFse(q.family) ? q.etl * Math.pow(q.flip / 180, 2) : q.family === "SE" || q.family === "DWI" ? 1 : 0;
    const exc = q.family === "GRE" || q.family === "3D-GRE" ? Math.pow(q.flip / 90, 2) * 0.25 : 0.25;
    const inv = q.family === "IR-FSE" || q.fatSat === "stir" ? 1 : 0;
    const fs = q.fatSat === "chem" ? 0.25 : 0;
    return (spt * (refoc + exc + inv + fs)) / (q.tr / 1000);
  };
  const rfIndex = rfPulsesPerSec(p) / rfPulsesPerSec(ref);

  if (p.family === "SSFSE" && p.etl < phaseLines * 0.5) warnings.push("Single-shot imaging fills (about half of) k-space in one train; ETL is set by the phase lines.");

  return { timeSec: timeMs / 1000, timeNote, relSnr, pixelFreq, pixelPhase, voxel, bwPerPixel, chemShiftPx, esp, trainMs, blurIndex, slicesPerTr, acqs, phaseLines, signals, weighting, contrastNotes, risks, interactions, rfIndex, warnings };
}

export function formatTime(sec: number) {
  if (!isFinite(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

/** Explain the delta between two configurations in plain language. */
export function explainChange(a: SimParams, b: SimParams): string[] {
  const out: string[] = [];
  const ra = simulate(a), rb = simulate(b);
  const pct = (x: number, y: number) => `${y >= x ? "+" : ""}${(((y - x) / x) * 100).toFixed(0)}%`;
  if (a.nex !== b.nex) out.push(`NEX ${a.nex} → ${b.nex}: SNR changes by √(${b.nex}/${a.nex}) and time scales linearly.`);
  if (a.bw !== b.bw) out.push(`Bandwidth ±${a.bw} → ±${b.bw} kHz: SNR ∝ 1/√BW; chemical shift ${ra.chemShiftPx.toFixed(1)} → ${rb.chemShiftPx.toFixed(1)} px; echo spacing ${ra.esp.toFixed(1)} → ${rb.esp.toFixed(1)} ms.`);
  if (a.etl !== b.etl) out.push(`ETL ${a.etl} → ${b.etl}: time ∝ 1/ETL; echo-train duration ${ra.trainMs.toFixed(0)} → ${rb.trainMs.toFixed(0)} ms (blur risk).`);
  if (a.thickness !== b.thickness) out.push(`Slice thickness ${a.thickness} → ${b.thickness} mm: SNR ∝ thickness; through-plane resolution changes inversely.`);
  if (a.phase !== b.phase) out.push(`Phase matrix ${a.phase} → ${b.phase}: phase lines (time) ${pct(ra.phaseLines, rb.phaseLines)}; phase pixel ${ra.pixelPhase.toFixed(2)} → ${rb.pixelPhase.toFixed(2)} mm.`);
  if (a.te !== b.te) out.push(`TE ${a.te} → ${b.te} ms: longer TE increases T2 (or T2*) weighting and reduces overall signal.`);
  if (a.tr !== b.tr) out.push(`TR ${a.tr} → ${b.tr} ms: longer TR reduces T1 weighting, increases signal and time.`);
  if (a.accel !== b.accel) out.push(`Acceleration ${a.accel} → ${b.accel}: time falls roughly by the factor; SNR falls by g√R.`);
  if (a.fov !== b.fov) out.push(`FOV ${a.fov} → ${b.fov} cm: pixel size and SNR change with FOV² (square FOV, fixed matrix).`);
  out.push(`Net: time ${pct(ra.timeSec, rb.timeSec)}, relative SNR ${pct(ra.relSnr, rb.relSnr)}.`);
  return out;
}
