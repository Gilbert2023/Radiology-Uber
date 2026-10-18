/**
 * Content model for the academy. All learning content is plain typed data so it
 * can be reviewed by clinical experts, validated by scripts/validate-content.ts,
 * and later moved into a CMS or database without touching the UI components.
 */

export type ReferenceId = string;

export interface Reference {
  id: ReferenceId;
  title: string;
  publisher: string;
  /** Edition / publication / revision date as known at authoring time. */
  date: string;
  url?: string;
  category: ResourceCategory;
  jurisdiction: "International" | "USA" | "UK" | "EU" | "Manufacturer" | "Literature";
  /** True when the edition or currency could not be confirmed and must be checked before use. */
  verify: boolean;
  note?: string;
}

export type ResourceCategory =
  | "Guidelines"
  | "Implant screening"
  | "Terminology & labelling"
  | "Incident reporting"
  | "Emergency procedures"
  | "Quality assurance"
  | "Policies & checklists"
  | "Professional development";

export interface LessonSection {
  heading: string;
  body: string[];
  bullets?: string[];
  /** A callout rendered in a highlighted box. */
  callout?: { tone: "info" | "warning" | "danger"; title: string; text: string };
}

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  summary: string;
  objectives: string[];
  sections: LessonSection[];
  clinicalExample?: { title: string; text: string };
  checklist?: { title: string; items: string[] };
  mistakes: string[];
  /** Ids into the question bank used as the end-of-lesson knowledge check. */
  questionIds: string[];
  references: ReferenceId[];
  /** Named illustration rendered with the lesson (see components/art/LessonIllustration). */
  illustration?: IllustrationKey;
}

export type IllustrationKey =
  | "fringe-field"
  | "zones"
  | "projectile"
  | "labels"
  | "rf-loop"
  | "gradient"
  | "cryostat"
  | "screening"
  | "governance";

export interface Module {
  id: string;
  number: number;
  title: string;
  tagline: string;
  description: string;
  topic: Topic;
  /** Modules flagged "core" form the fully-built MVP set. */
  depth: "core" | "standard";
  lessons: Lesson[];
  labIds?: string[];
  furtherReading: ReferenceId[];
}

export type Topic =
  | "Physics"
  | "Zones & access"
  | "Projectiles"
  | "Implants"
  | "RF heating"
  | "Gradients & acoustics"
  | "Cryogens & quench"
  | "Emergency response"
  | "Screening"
  | "Occupational"
  | "Quality & governance"
  | "Leadership";

export type QuestionType = "mcq" | "multi" | "truefalse" | "scenario";

export interface Question {
  id: string;
  type: QuestionType;
  topic: Topic;
  moduleId: string;
  difficulty: 1 | 2 | 3;
  /** Optional clinical vignette shown above the stem. */
  scenario?: string;
  stem: string;
  options: string[];
  /** Indexes of correct options. Exactly one for mcq/truefalse/scenario. */
  correct: number[];
  explanation: string;
  references?: ReferenceId[];
}

export interface CaseStudy {
  id: string;
  number: number;
  title: string;
  topic: Topic;
  background: string;
  concerns: string[];
  informationNeeded: string[];
  riskClassification: string;
  decisionProcess: string[];
  appropriateAction: string[];
  avoid: string[];
  documentation: string[];
  debrief: string[];
  assumptions: string;
  escalation: string;
  references: ReferenceId[];
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  related?: string[];
}
