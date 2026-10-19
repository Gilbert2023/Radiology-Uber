import type { Protocol, ProtocolSequence } from "@/content/types";

export interface DecisionInput {
  protocol: Protocol;
  pathology: string;
  age: "adult" | "paediatric" | "older";
  contrast: "suitable" | "not-suitable" | "uncertain";
  stillness: "good" | "limited" | "poor";
  physiology: "none" | "short-breath-hold" | "no-breath-hold" | "arrhythmia";
  caps: Record<Capability, boolean>;
  dedicatedCoil: boolean;
}

export type Capability = "propeller" | "parallel" | "3dfse" | "dixon" | "swan" | "resptrig" | "dwi";

export const CAP_LABEL: Record<Capability, string> = {
  propeller: "PROPELLER",
  parallel: "Parallel imaging (ARC/ASSET)",
  "3dfse": "3D FSE (CUBE)",
  dixon: "Dixon (IDEAL / LAVA Flex)",
  swan: "SWAN susceptibility imaging",
  resptrig: "Respiratory triggering / navigator",
  dwi: "Diffusion-weighted imaging",
};

export interface PlannedSequence extends ProtocolSequence {
  why: string;
  modifications: string[];
}

export interface DecisionOutput {
  core: PlannedSequence[];
  optional: PlannedSequence[];
  omitted: { name: string; reason: string }[];
  planning: string[];
  importantParams: string[];
  limitations: string[];
  preparation: string[];
  patientInstructions: string[];
  qc: string[];
}

const has = (s: ProtocolSequence, re: RegExp) => re.test(s.name);

export function buildDecision(i: DecisionInput): DecisionOutput {
  const p = i.protocol;
  const omitted: DecisionOutput["omitted"] = [];
  const limitations: string[] = [p.limitations];
  const importantParams: string[] = [];
  const prep = [...p.preparation];
  const instr: string[] = ["Explain the examination length and noise; confirm hearing protection.", "Show the call bell and agree how to communicate during the scan."];
  const qc = [...p.qc];

  const adapt = (s: ProtocolSequence): PlannedSequence | null => {
    const mods: string[] = [];
    let name = s.name;
    if (s.postContrast && i.contrast !== "suitable") {
      omitted.push({ name: s.name, reason: i.contrast === "not-suitable" ? "Contrast not suitable for this patient — discuss non-contrast alternatives with the radiologist." : "Contrast suitability uncertain — hold until screening/radiologist decision is complete." });
      return null;
    }
    if (has(s, /DWI|ADC/) && !i.caps.dwi) {
      omitted.push({ name: s.name, reason: "DWI not available on this system configuration." });
      return null;
    }
    if (has(s, /SWAN/) && !i.caps.swan) { name = name.replace(/SWAN \/ /, "").replace(/SWAN/, "2D T2* GRE"); mods.push("SWAN unavailable → 2D T2* GRE for haemorrhage sensitivity."); }
    if (has(s, /3D FLAIR|CUBE|3D FSE/) && !i.caps["3dfse"]) { name = `${name} → 2D thin-slice equivalent`; mods.push("3D FSE unavailable → acquire 2D thin slices (≤3 mm) in two planes."); }
    if (has(s, /Dixon|IDEAL/) && !i.caps.dixon) mods.push("Dixon unavailable → STIR (non-contrast) or Chem Sat with careful shimming.");
    if (i.stillness !== "good" && has(s, /T2|FLAIR/) && !s.postContrast && !has(s, /SSFSE|MRCP|DWI/)) {
      mods.push(i.caps.propeller ? "Motion risk → use PROPELLER version where available." : "Motion risk → consider SSFSE alternative; shorten with fewer NEX.");
    }
    if (i.stillness === "poor") mods.push("Keep NEX minimal; acquire in order of diagnostic yield.");
    if (/resp|breath/i.test((s.params ?? "") + s.name) || p.region === "Abdomen") {
      if (i.physiology === "short-breath-hold") mods.push(i.caps.parallel ? "Short breath-hold → increase ARC factor/partial Fourier, split into shorter breath-holds." : "Short breath-hold → reduce slices/matrix; consider SSFSE.");
      if (i.physiology === "no-breath-hold") mods.push(i.caps.resptrig ? "Cannot breath-hold → respiratory-triggered/navigator versions." : "Cannot breath-hold → free-breathing SSFSE and multi-NEX averaging.");
    }
    if (p.region === "Vascular & Cardiac" && i.physiology === "arrhythmia") mods.push("Arrhythmia → arrhythmia rejection or real-time cine if available; discuss with cardiac team.");
    return { ...s, name, modifications: mods, why: s.purpose };
  };

  const ordered = [...p.sequences];
  const core = ordered.filter((s) => !s.optional).map(adapt).filter(Boolean) as PlannedSequence[];
  const optional = ordered.filter((s) => s.optional).map(adapt).filter(Boolean) as PlannedSequence[];

  if (i.contrast !== "suitable" && p.sequences.some((s) => s.postContrast)) {
    limitations.push("Without contrast, enhancement-dependent questions (e.g. active inflammation, small metastases, dynamic characterisation) may not be fully answered — radiologist to decide whether to proceed, modify or use alternative imaging.");
    if (/cvst|mra|venous/i.test(p.id + p.title)) core.push({ name: "Non-contrast MRV (2D TOF or PC) + susceptibility imaging", plane: "Oblique", purpose: "Flow and thrombus assessment without gadolinium.", why: "Replaces contrast-enhanced MRV.", modifications: [] });
  }
  if (i.stillness !== "good") {
    instr.push("Agree a strategy for breaks; immobilise comfortably with pads.");
    limitations.push("Motion may limit diagnostic quality; prioritise the highest-yield sequences first.");
    if (i.stillness === "poor") limitations.push("Consider sedation/anaesthesia pathway or alternative imaging per local policy.");
  }
  if (i.age === "paediatric") {
    prep.push("Paediatric: accurate weight, age-appropriate preparation, feed-and-wrap or sedation/anaesthesia pathway per local policy; parent/carer screening if accompanying.");
    importantParams.push("Smaller FOV and adjusted coil choice for body size; SAR depends on accurate weight.");
  }
  if (i.age === "older") prep.push("Older patient: check comfort, hearing/vision for communication, cognitive status for consent and screening reliability.");
  if (i.physiology === "short-breath-hold" || i.physiology === "no-breath-hold") instr.push("Practise breathing instructions before scanning; use consistent (e.g. end-expiration) breath-holds.");
  if (!i.dedicatedCoil) limitations.push("No dedicated coil: expect lower SNR — increase voxel size or NEX and accept longer scans, or reschedule on a suitably equipped system.");
  if (!i.caps.parallel) importantParams.push("No parallel imaging: scan times longer; prioritise sequences and consider reduced phase FOV.");
  if (i.pathology) importantParams.push(`Tailor coverage and plane angulation to the suspected pathology (${i.pathology}).`);

  importantParams.push(
    "Match pre- and post-contrast geometry and parameters exactly.",
    "Check Relative SNR, pixel size, bandwidth/pixel and scan time after each change.",
    "Read SAR/B1+rms on the console when implant conditions apply.",
  );
  qc.push("Every sequence reviewed for motion, coverage and artefact before the patient leaves.");

  return { core, optional, omitted, planning: p.planning, importantParams, limitations, preparation: prep, patientInstructions: instr, qc };
}
