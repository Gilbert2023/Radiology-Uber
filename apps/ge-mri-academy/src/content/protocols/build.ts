import type { Protocol, Region } from "../types";

export type ProtocolInput = Omit<Protocol, "region" | "preparation" | "positioning" | "coil" | "qc" | "mimics" | "refs" | "evidenceDate" | "depth" | "mistakes" | "alternative" | "limitations" | "contrast" | "coverage" | "planning"> &
  Partial<Pick<Protocol, "preparation" | "positioning" | "coil" | "qc" | "mimics" | "refs" | "depth" | "mistakes" | "alternative" | "limitations" | "contrast" | "coverage" | "planning">> & {
    extraPrep?: string[];
    extraQc?: string[];
    extraMimics?: string[];
    extraMistakes?: Protocol["mistakes"];
    extraRefs?: Protocol["refs"];
  };

export type RegionDefaults = Pick<Protocol, "preparation" | "positioning" | "coil" | "qc" | "mimics" | "refs" | "mistakes" | "alternative" | "limitations" | "contrast" | "coverage" | "planning"> & { synchronisation?: string };

const COMMON_PREP = [
  "Complete MRI safety screening per local policy (implants, devices, foreign bodies, pregnancy, previous surgery).",
  "Verify identity, clinical request and justification; confirm the clinical question with the referrer/radiologist if unclear.",
  "Remove metallic items; change into MR-safe clothing per local policy.",
  "Hearing protection for every patient.",
];

export function makeBuilder(region: Region, d: RegionDefaults, evidenceDate = "Content drafted 2026-10; check cited guideline versions") {
  return (p: ProtocolInput): Protocol => ({
    region,
    depth: p.depth ?? "full",
    preparation: [...COMMON_PREP, ...(p.preparation ?? d.preparation), ...(p.extraPrep ?? [])],
    positioning: p.positioning ?? d.positioning,
    coil: p.coil ?? d.coil,
    planning: p.planning ?? d.planning,
    coverage: p.coverage ?? d.coverage,
    contrast: p.contrast ?? d.contrast,
    qc: [...(p.qc ?? d.qc), ...(p.extraQc ?? [])],
    mimics: [...(p.mimics ?? d.mimics), ...(p.extraMimics ?? [])],
    mistakes: [...(p.mistakes ?? d.mistakes), ...(p.extraMistakes ?? [])],
    alternative: p.alternative ?? d.alternative,
    limitations: p.limitations ?? d.limitations,
    refs: [...(p.refs ?? d.refs), ...(p.extraRefs ?? [])],
    evidenceDate,
    id: p.id,
    title: p.title,
    tags: p.tags,
    indication: p.indication,
    anatomy: p.anatomy,
    sequences: p.sequences,
    synchronisation: p.synchronisation ?? d.synchronisation,
  });
}
