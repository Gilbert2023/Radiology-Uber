import type { PhantomPreset } from "@/content/types";
import type { PhantomOptions } from "@/lib/phantom";
import { TEACHING_EXAMPLE, withPreset, type SimParams } from "@/lib/sim";

export interface PresetDef { label: string; p: SimParams; opts?: PhantomOptions; note: string }

export function presetParams(k: PhantomPreset): PresetDef {
  switch (k) {
    case "T1": return { label: "T1 SE", p: withPreset("t1se"), note: "Short TR/TE: WM brighter than GM, CSF dark, fat bright." };
    case "T2": return { label: "T2 FRFSE", p: TEACHING_EXAMPLE, note: "Long TR/TE: CSF and oedema bright; fat bright on FSE." };
    case "PD": return { label: "PD FSE", p: { ...TEACHING_EXAMPLE, family: "FSE", tr: 3000, te: 30, etl: 8 }, note: "Long TR, short TE: high SNR, modest contrast." };
    case "FLAIR": return { label: "T2 FLAIR", p: withPreset("flair"), note: "CSF nulled; periventricular/lesion signal conspicuous." };
    case "STIR": return { label: "STIR", p: { ...TEACHING_EXAMPLE, family: "IR-FSE", tr: 4000, te: 50, ti: 160, etl: 10 }, note: "Fat nulled by inversion; fluid bright." };
    case "T2FS": return { label: "T2 FSE + Chem Sat", p: { ...TEACHING_EXAMPLE, fatSat: "chem" }, note: "Spectral fat saturation: fat dark, fluid bright." };
    case "DWI": return { label: "DWI b=1000", p: withPreset("dwi"), note: "Restricted diffusion bright; CSF dark." };
    case "ADC": return { label: "ADC map", p: withPreset("dwi"), opts: { adcMap: true, noise: false }, note: "Restricted diffusion dark (low ADC); CSF bright." };
    case "GRE": return { label: "T2* GRE", p: { ...TEACHING_EXAMPLE, family: "GRE", tr: 500, te: 20, flip: 20, etl: 1, slices: 20 }, note: "T2* weighting; susceptibility-sensitive." };
    case "T1C": return { label: "T1 SE post-contrast (simulated)", p: withPreset("t1se"), opts: { enhance: true }, note: "Lesion T1 shortened by gadolinium: enhancement." };
    case "motion": return { label: "T2 with motion", p: TEACHING_EXAMPLE, opts: { motion: 0.8 }, note: "Phase errors in k-space produce ghosts along the phase direction (vertical)." };
    case "wrap": return { label: "T2 with phase wrap", p: { ...TEACHING_EXAMPLE, phaseFov: 0.75 }, opts: { wrap: true }, note: "Anatomy outside the phase FOV folds onto the opposite side." };
    case "chemshift": return { label: "Narrow bandwidth (chemical shift)", p: { ...TEACHING_EXAMPLE, bw: 7.81 }, note: "Fat displaced along frequency (horizontal) — bright/dark bands at fat–water interfaces." };
  }
}
