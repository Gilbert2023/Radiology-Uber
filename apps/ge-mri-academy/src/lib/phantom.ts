/**
 * Synthetic digital head phantom. EDUCATIONAL ILLUSTRATION — not patient data.
 * Tissue intensities come from the simplified signal equations in sim.ts; the
 * image is passed through k-space so resolution loss, truncation ringing,
 * echo-train blurring and motion ghosts are produced by the same physics that
 * causes them on a scanner (in highly simplified form).
 */
import { fft2d, freqIndex } from "./fft";
import { simulate, tissueSignal, TISSUES, type SimParams, type Tissue } from "./sim";

export const N = 128;

// label indices
const BG = 0, FAT = 1, BONE = 2, CSF = 3, GM = 4, WM = 5, VENT = 6, LES = 7, INF = 8;

let labelCache: Uint8Array | null = null;

function inEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number) {
  const dx = (x - cx) / rx, dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

export function labels(): Uint8Array {
  if (labelCache) return labelCache;
  const L = new Uint8Array(N * N);
  const c = N / 2;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let v = BG;
      if (inEllipse(x, y, c, c, 52, 60)) v = FAT;
      if (inEllipse(x, y, c, c, 48.5, 56.5)) v = BONE;
      if (inEllipse(x, y, c, c, 45.5, 53.5)) v = CSF;
      if (inEllipse(x, y, c, c, 44, 52)) v = GM;
      // gyral pattern: alternate GM/WM boundary radius by angle
      const ang = Math.atan2(y - c, x - c);
      const wob = 3 * Math.sin(ang * 14);
      if (inEllipse(x, y, c, c, 37 + wob, 45 + wob)) v = WM;
      // ventricles (two lateral bodies)
      if (inEllipse(x, y, c - 8, c - 2, 4, 14) || inEllipse(x, y, c + 8, c - 2, 4, 14)) v = VENT;
      // midline falx CSF
      if (Math.abs(x - c) < 0.8 && Math.abs(y - c) > 20 && inEllipse(x, y, c, c, 45, 53)) v = CSF;
      // oedematous lesion (right frontal) and small infarct (left posterior)
      if (inEllipse(x, y, c + 22, c - 24, 7, 6)) v = LES;
      if (inEllipse(x, y, c - 24, c + 22, 5, 5)) v = INF;
      L[y * N + x] = v;
    }
  }
  labelCache = L;
  return L;
}

export interface PhantomOptions {
  motion?: number; // 0–1
  enhance?: boolean; // gadolinium in lesion (T1 shortening)
  adcMap?: boolean;
  wrap?: boolean;
  noise?: boolean;
  seed?: number;
}

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

function gauss(r: () => number) {
  const u = Math.max(1e-9, r()), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function renderPhantom(p: SimParams, opt: PhantomOptions = {}): Float64Array {
  const L = labels();
  const T = Object.fromEntries(TISSUES.map((t) => [t.key, t])) as Record<string, Tissue>;
  const lesion: Tissue = opt.enhance ? { ...T.lesion, t1: 350 } : T.lesion;
  const map: number[] = [];
  if (opt.adcMap) {
    map[BG] = 0; map[FAT] = 0.05; map[BONE] = 0; map[CSF] = T.csf.adc / 3; map[GM] = T.gm.adc / 3; map[WM] = T.wm.adc / 3; map[VENT] = T.csf.adc / 3; map[LES] = T.lesion.adc / 3; map[INF] = T.infarct.adc / 3;
  } else {
    map[BG] = 0; map[BONE] = 0.02;
    map[FAT] = tissueSignal(p, T.fat); map[CSF] = tissueSignal(p, T.csf); map[GM] = tissueSignal(p, T.gm); map[WM] = tissueSignal(p, T.wm);
    map[VENT] = map[CSF]; map[LES] = tissueSignal(p, lesion); map[INF] = tissueSignal(p, T.infarct);
  }
  const res = simulate(p);
  const re = new Float64Array(N * N), im = new Float64Array(N * N);
  // chemical shift: fat displaced along frequency (horizontal in this phantom)
  const shift = opt.adcMap ? 0 : Math.round(res.chemShiftPx * (N / p.freq) * 2);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const l = L[y * N + x];
      if (l === FAT) {
        const xs = x + shift;
        if (xs >= 0 && xs < N) re[y * N + xs] += map[FAT];
      } else re[y * N + x] += map[l];
    }
  }
  fft2d(re, im, N);

  // k-space: resolution (truncation), echo-train T2 filter (phase = vertical), motion
  const keepPh = Math.min(1, p.phase / 256), keepFr = Math.min(1, p.freq / 256);
  const isFse = p.family === "FSE" || p.family === "FRFSE" || p.family === "SSFSE" || p.family === "IR-FSE";
  const blurK = isFse ? res.trainMs / 80 : p.family === "DWI" ? 0.6 : 0;
  const r = rng(opt.seed ?? 7);
  for (let ky = 0; ky < N; ky++) {
    const fy = Math.abs(freqIndex(ky, N)) / (N / 2);
    let lineGain = 1;
    let phaseErr = 0;
    if (fy > keepPh) lineGain = 0;
    else if (blurK > 0) lineGain = Math.exp(-(fy / Math.max(keepPh, 1e-6)) * blurK * 0.5);
    if (opt.motion && opt.motion > 0 && r() < 0.35) phaseErr = (r() - 0.5) * 2.4 * opt.motion;
    const c = Math.cos(phaseErr), s = Math.sin(phaseErr);
    for (let kx = 0; kx < N; kx++) {
      const fx = Math.abs(freqIndex(kx, N)) / (N / 2);
      const g = fx > keepFr ? 0 : lineGain;
      const i = ky * N + kx;
      const a = re[i] * g, b = im[i] * g;
      re[i] = a * c - b * s;
      im[i] = a * s + b * c;
    }
  }
  fft2d(re, im, N, true);

  const out = new Float64Array(N * N);
  const sigma = opt.noise === false ? 0 : 0.018 / Math.max(0.05, res.relSnr);
  for (let i = 0; i < N * N; i++) {
    const nr = re[i] + sigma * gauss(r), ni = im[i] + sigma * gauss(r);
    out[i] = Math.sqrt(nr * nr + ni * ni); // magnitude image (Rician noise floor)
  }
  if (opt.wrap) {
    // fold the top 18 rows onto the bottom to illustrate phase wrap
    for (let y = 0; y < 18; y++) for (let x = 0; x < N; x++) out[(N - 18 + y) * N + x] += out[y * N + x] * 0.9;
  }
  return out;
}

export function toImageData(img: Float64Array, ctx: CanvasRenderingContext2D, windowMax?: number) {
  let max = windowMax ?? 0;
  if (!windowMax) for (let i = 0; i < img.length; i++) if (img[i] > max) max = img[i];
  max = max || 1;
  const data = ctx.createImageData(N, N);
  for (let i = 0; i < img.length; i++) {
    const v = Math.max(0, Math.min(255, (img[i] / max) * 255));
    data.data[i * 4] = v; data.data[i * 4 + 1] = v; data.data[i * 4 + 2] = v; data.data[i * 4 + 3] = 255;
  }
  return data;
}
