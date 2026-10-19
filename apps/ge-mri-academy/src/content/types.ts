/**
 * Content model for GE MRI Protocol Mastery.
 *
 * Every content type is a plain serialisable object so the same records can be
 * moved into a database (one table per type, `id` as primary key, string-array
 * fields as join tables or JSON columns) without changing the UI components.
 */

/** How confident we are that a label/behaviour matches a GE implementation. */
export type Verification =
  | "console" // visible on the supplied console screenshots
  | "standard" // universal MRI concept, vendor-neutral
  | "ge-plausible" // plausible GE implementation, not confirmed for every release
  | "verify"; // must be confirmed in the exact software manual

export type Availability = "standard" | "optional" | "software-dependent";

export interface RefLink {
  /** id in references.ts */
  id: string;
  note?: string;
}

export interface Effects {
  snr?: string;
  resolution?: string;
  time?: string;
  contrast?: string;
  blurring?: string;
  artefacts?: string;
  sar?: string;
}

export interface Parameter {
  id: string;
  label: string; // exact console label (or closest generic label)
  group: ParameterGroup;
  verification: Verification;
  aka?: string[];
  definition: string;
  physics: string;
  increase: string;
  decrease: string;
  effects: Effects;
  appearance: string;
  clinical: string;
  example: string;
  mistakes: string[];
  troubleshooting: { scenario: string; approach: string };
  interactions: string[]; // ids of other parameters
  interactionNotes: string;
  systemNotes: string;
  refs: RefLink[];
}

export type ParameterGroup =
  | "Geometry"
  | "Timing & contrast"
  | "Resolution & SNR"
  | "Echo train"
  | "Suppression & preparation"
  | "Acceleration"
  | "Motion & synchronisation"
  | "RF, shim & system"
  | "Reconstruction";

export interface AdvancedParam {
  id: string;
  name: string;
  likelyLocation: string; // always hedged
  verification: Verification;
  summary: string;
  physics: string;
  practice: string;
  caution?: string;
  refs: RefLink[];
}

export type Weighting = "T1" | "T2" | "PD" | "T2*" | "Diffusion" | "Flow" | "Mixed" | "Spectral" | "Susceptibility" | "Perfusion";

export interface Sequence {
  id: string;
  name: string;
  family: string;
  geNames: string; // GE product naming, hedged
  otherVendors?: string;
  availability: Availability;
  principle: string;
  appearance: string;
  weighting: Weighting[];
  fat: string;
  fluid: string;
  flow: string;
  artefacts: string[];
  advantages: string[];
  limitations: string[];
  applications: string[];
  criticalParams: string[];
  alternatives: string[]; // sequence ids
  safety?: string;
  diagram?: "se" | "fse" | "gre" | "ir" | "dwi" | "ssfp" | "none";
  refs: RefLink[];
}

export type Region = "Neuro" | "Spine" | "MSK" | "Abdomen" | "Pelvis" | "Vascular & Cardiac" | "Breast, Oncology & Other";

export interface ProtocolSequence {
  name: string;
  plane: string;
  purpose: string;
  params?: string; // suggested educational ranges
  optional?: boolean;
  when?: string; // for optional sequences
  postContrast?: boolean;
}

export interface Protocol {
  id: string;
  title: string;
  region: Region;
  tags: string[];
  indication: string;
  anatomy: string;
  preparation: string[];
  positioning: string;
  coil: string;
  planning: string[];
  sequences: ProtocolSequence[];
  coverage: string;
  contrast: string;
  synchronisation?: string;
  mistakes: { mistake: string; fix: string }[];
  mimics: string[];
  qc: string[];
  alternative: string;
  limitations: string;
  refs: RefLink[];
  evidenceDate: string;
  depth: "full" | "core";
}

export interface TroubleshootingCase {
  id: string;
  title: string;
  category: "Image quality" | "Artefact" | "Workflow" | "Patient" | "System" | "Safety" | "Contrast & flow";
  observe: string;
  causes: string[];
  check: string[];
  safeActions: string[];
  adjust: string[];
  reacquire: string;
  verify: string[];
  escalate: string;
  pathologyVsArtefact?: string;
  params: string[];
}

export interface CaseStep {
  prompt: string;
  info?: string;
  options: { text: string; correct: boolean; feedback: string }[];
  multi?: boolean;
}

export interface ClinicalCase {
  id: string;
  title: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  region: Region;
  presentation: string;
  request: string;
  safety: string;
  steps: CaseStep[];
  challenge: { description: string; image?: PhantomPreset };
  expert: string;
  qa: string[];
  protocolId?: string;
}

export interface Question {
  id: string;
  topic: QuestionTopic;
  type: "MCQ" | "Scenario" | "Parameter" | "Sequence selection" | "Troubleshooting";
  difficulty: 1 | 2 | 3;
  stem: string;
  options: string[];
  answer: number;
  explanation: string;
}

export type QuestionTopic = "Physics" | "Parameters" | "Sequences" | "Protocols" | "Artefacts" | "Safety";

export interface Reference {
  id: string;
  citation: string;
  kind: "Textbook" | "Journal" | "Guideline" | "Standard" | "Manufacturer" | "Web resource";
  url?: string;
  note?: string;
}

/** Synthetic-phantom presets used for teaching images (never patient data). */
export type PhantomPreset =
  | "T1"
  | "T2"
  | "PD"
  | "FLAIR"
  | "STIR"
  | "T2FS"
  | "DWI"
  | "ADC"
  | "GRE"
  | "T1C"
  | "motion"
  | "wrap"
  | "chemshift";
