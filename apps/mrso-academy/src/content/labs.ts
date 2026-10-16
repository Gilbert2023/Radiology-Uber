export interface LabMeta {
  id: string;
  title: string;
  summary: string;
  moduleId: string;
  minutes: number;
}

export const labs: LabMeta[] = [
  { id: "zones", title: "MRI Safety Zone Identification", summary: "Assign every room on a department plan to the correct zone and choose its access control.", moduleId: "m2", minutes: 8 },
  { id: "screening", title: "Patient Screening Simulation", summary: "Work through a branching screening interview and decide whether the patient may enter Zone IV.", moduleId: "m9", minutes: 10 },
  { id: "implant", title: "Implant Risk Assessment", summary: "Compare device labelling against scanner, coil and protocol and classify the risk.", moduleId: "m4", minutes: 10 },
  { id: "projectile", title: "Projectile Risk Identification", summary: "Triage items arriving at the Zone III door: allow, verify or stop.", moduleId: "m3", minutes: 6 },
  { id: "emergency", title: "MRI Emergency Decision-Making", summary: "Make time-pressured decisions in a cardiac arrest and fire scenario.", moduleId: "m8", minutes: 8 },
  { id: "incident", title: "Safety Incident Investigation", summary: "Build a timeline, identify failed barriers and choose strong corrective actions.", moduleId: "m11", minutes: 10 },
  { id: "rf-burn", title: "RF Burn Positioning Check", summary: "Find every positioning and cable-routing hazard on a patient set-up.", moduleId: "m5", minutes: 6 },
  { id: "rf-sar", title: "SAR and B1+rms Explorer", summary: "See how field strength, flip angle and timing affect RF exposure, and why SAR and B1+rms limits differ.", moduleId: "m5", minutes: 8 },
  { id: "quench", title: "Quench and Cryogen Hazard Scenario", summary: "Distinguish evacuation, EPO and magnet stop as events unfold.", moduleId: "m7", minutes: 8 },
];

export const labById = Object.fromEntries(labs.map((l) => [l.id, l])) as Record<string, LabMeta>;
