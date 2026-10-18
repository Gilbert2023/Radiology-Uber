import type { Question } from "../types";

const TF = ["True", "False"];

/** Modules 9–14 and capstone-only scenario items. */
export const bankC: Question[] = [
  // ── Module 9 ─────────────────────────────────────────────
  {
    id: "m9-q1", type: "mcq", topic: "Screening", moduleId: "m9", difficulty: 1,
    stem: "Robust MR screening combines:",
    options: ["A form only", "A verbal check only", "A written questionnaire plus verbal review by trained MR personnel", "A metal detector only"],
    correct: [2],
    explanation: "Two-stage screening catches misunderstanding and omissions.",
  },
  {
    id: "m9-q2", type: "truefalse", topic: "Screening", moduleId: "m9", difficulty: 1,
    stem: "A patient screened last month does not need re-screening today.",
    options: TF, correct: [1],
    explanation: "False. Re-screen on every visit; history can change.",
  },
  {
    id: "m9-q3", type: "scenario", topic: "Screening", moduleId: "m9", difficulty: 2,
    scenario: "A patient ticks 'no previous surgery'. While they change, you notice a midline sternotomy scar.",
    stem: "Next step?",
    options: [
      "Proceed — the form says no.",
      "Resolve the discrepancy (ask, check the record and imaging) before Zone IV; escalate if unresolved.",
      "Scan at lower SAR.",
      "Ask them to sign again.",
    ],
    correct: [1],
    explanation: "Discrepancies must be resolved. Sternotomy may indicate valves, wires or CIED-related surgery.",
  },
  {
    id: "m9-q4", type: "multi", topic: "Screening", moduleId: "m9", difficulty: 2,
    stem: "For an unconscious trauma patient, appropriate screening sources include: Select ALL that apply.",
    options: ["Family/carers", "Electronic record and prior imaging", "Physical inspection for scars/devices", "Assuming no implants"],
    correct: [0, 1, 2],
    explanation: "Use collateral sources, document residual uncertainty, and involve the responsible radiologist.",
  },
  {
    id: "m9-q5", type: "truefalse", topic: "Screening", moduleId: "m9", difficulty: 1,
    stem: "A parent accompanying a child into Zone IV must also be screened.",
    options: TF, correct: [0],
    explanation: "True. Everyone entering Zone IV is screened.",
  },
  {
    id: "m9-q6", type: "mcq", topic: "Screening", moduleId: "m9", difficulty: 2,
    stem: "A complex question on whether a neurostimulator's conditions can be met on your scanner is best directed to:",
    options: ["The receptionist", "The MR Safety Expert", "The porter", "The patient's family"],
    correct: [1],
    explanation: "Technical physics and device questions go to the MRSE; clinical risk–benefit decisions involve the MR Medical Director or responsible radiologist.",
  },
  {
    id: "m9-q7", type: "truefalse", topic: "Screening", moduleId: "m9", difficulty: 1,
    stem: "Postponing an examination until screening concerns are resolved is a legitimate outcome.",
    options: TF, correct: [0],
    explanation: "True.",
  },

  // ── Module 10 ────────────────────────────────────────────
  {
    id: "m10-q1", type: "multi", topic: "Occupational", moduleId: "m10", difficulty: 2,
    stem: "Transient effects associated with movement in strong static fields include: Select ALL that apply.",
    options: ["Vertigo", "Metallic taste", "Visual phosphenes", "Permanent hearing loss"],
    correct: [0, 1, 2],
    explanation: "Hearing loss relates to acoustic noise, not static-field movement.",
  },
  {
    id: "m10-q2", type: "truefalse", topic: "Occupational", moduleId: "m10", difficulty: 2,
    stem: "Current evidence establishes that occupational static-field exposure in MRI causes long-term harm.",
    options: TF, correct: [1],
    explanation: "False. Long-term harm is not established, but data are limited — use risk assessment rather than absolute claims.",
  },
  {
    id: "m10-q3", type: "mcq", topic: "Occupational", moduleId: "m10", difficulty: 2,
    stem: "A newly employed radiographer has an implanted loop recorder. The right approach is:",
    options: [
      "No action needed for staff.",
      "Individual risk assessment using the device's labelling, documented confidentially.",
      "Automatic redeployment away from MRI.",
      "Ask colleagues what they think.",
    ],
    correct: [1],
    explanation: "Staff implants require the same rigour as patient implants.",
  },
  {
    id: "m10-q4", type: "multi", topic: "Occupational", moduleId: "m10", difficulty: 2,
    stem: "Contractor access to Zone IV should include: Select ALL that apply.",
    options: ["Screening", "Briefing and supervision", "Tool control / permit-to-work", "Unrestricted out-of-hours key access"],
    correct: [0, 1, 2],
    explanation: "Access must be controlled, not unrestricted.",
  },

  // ── Module 11 ────────────────────────────────────────────
  {
    id: "m11-q1", type: "truefalse", topic: "Quality & governance", moduleId: "m11", difficulty: 1,
    stem: "Near-miss reports are valuable even though no harm occurred.",
    options: TF, correct: [0],
    explanation: "True. They reveal failing barriers before an injury.",
  },
  {
    id: "m11-q2", type: "multi", topic: "Quality & governance", moduleId: "m11", difficulty: 2,
    stem: "An MR safety audit programme should include: Select ALL that apply.",
    options: ["Screening compliance", "Access control checks", "Equipment labelling", "Staff social media use"],
    correct: [0, 1, 2],
    explanation: "Focus on safety-critical processes.",
  },
  {
    id: "m11-q3", type: "mcq", topic: "Quality & governance", moduleId: "m11", difficulty: 2,
    stem: "Which corrective action is strongest in the hierarchy of controls?",
    options: ["Re-training staff", "A new policy memo", "Installing access-controlled doors to Zone III", "A reminder poster"],
    correct: [2],
    explanation: "Engineering controls beat administrative ones.",
  },
  {
    id: "m11-q4", type: "truefalse", topic: "Quality & governance", moduleId: "m11", difficulty: 1,
    stem: "'Human error' is an adequate root cause for an MR incident investigation.",
    options: TF, correct: [1],
    explanation: "False. Ask why the error was possible and why barriers did not stop it.",
  },

  // ── Module 12 ────────────────────────────────────────────
  {
    id: "m12-q1", type: "mcq", topic: "Leadership", moduleId: "m12", difficulty: 1,
    stem: "The MR Safety Expert is typically:",
    options: ["A receptionist", "An MR physicist providing scientific/technical advice", "The hospital CEO", "A vendor salesperson"],
    correct: [1],
    explanation: "The MRSE provides physics and engineering expertise.",
    references: ["calamante-2016"],
  },
  {
    id: "m12-q2", type: "truefalse", topic: "Leadership", moduleId: "m12", difficulty: 1,
    stem: "Completing an online MR safety course automatically qualifies a person to act as MRSO in any jurisdiction.",
    options: TF, correct: [1],
    explanation: "False. Requirements vary by jurisdiction and institution.",
  },
  {
    id: "m12-q3", type: "multi", topic: "Leadership", moduleId: "m12", difficulty: 2,
    stem: "A multidisciplinary MR safety committee typically includes: Select ALL that apply.",
    options: ["MR Medical Director", "MRSO", "MRSE", "Estates/engineering"],
    correct: [0, 1, 2, 3],
    explanation: "Broad membership ensures clinical, technical and estates input.",
  },
  {
    id: "m12-q4", type: "mcq", topic: "Leadership", moduleId: "m12", difficulty: 2,
    stem: "Procurement proposes buying a cheaper trolley described as 'MRI compatible'. The MRSO should:",
    options: [
      "Approve — compatible means safe.",
      "Require current ASTM-based labelling and conditions before acceptance.",
      "Test it with a fridge magnet and approve.",
      "Let the vendor decide where to use it.",
    ],
    correct: [1],
    explanation: "'MRI compatible' is obsolete and ambiguous.",
  },

  // ── Module 13 / 14 ───────────────────────────────────────
  {
    id: "m13-q1", type: "mcq", topic: "Leadership", moduleId: "m13", difficulty: 2,
    stem: "In the structured case method, what comes before risk classification?",
    options: ["Documentation", "Identifying the information needed", "Debrief", "Corrective action"],
    correct: [1],
    explanation: "You cannot classify risk before knowing what is unknown and obtaining it.",
  },
  {
    id: "m13-q2", type: "truefalse", topic: "Leadership", moduleId: "m13", difficulty: 1,
    stem: "Complex MR safety cases can be resolved by a single universal rule.",
    options: TF, correct: [1],
    explanation: "False. Cases require context-specific reasoning and escalation.",
  },
  {
    id: "m14-q1", type: "truefalse", topic: "Leadership", moduleId: "m14", difficulty: 1,
    stem: "This course's completion record is an externally recognised MRSO credential.",
    options: TF, correct: [1],
    explanation: "False. It records completion of this educational course only.",
  },

  // ── Capstone scenario items ──────────────────────────────
  {
    id: "cap-q1", type: "scenario", topic: "Implants", moduleId: "m14", difficulty: 3,
    scenario: "A patient with an MR Conditional spinal cord stimulator is booked on 3 T for a lumbar spine. The labelling permits 1.5 T only, with B1+rms ≤ 2.0 µT, and requires the device's MRI mode.",
    stem: "Most appropriate action?",
    options: [
      "Scan at 3 T with low SAR.",
      "Rebook on a 1.5 T system where conditions can be met, with device mode set and B1+rms monitored.",
      "Scan at 3 T in Normal Operating Mode.",
      "Turn the stimulator off and scan at 3 T.",
    ],
    correct: [1],
    explanation: "Conditions are not negotiable; 3 T is outside the labelling. Meet all conditions on a compliant system.",
  },
  {
    id: "cap-q2", type: "scenario", topic: "Projectiles", moduleId: "m14", difficulty: 2,
    scenario: "A ward wheelchair is being pushed through the Zone III door toward the open Zone IV door.",
    stem: "Immediate priority?",
    options: ["Shout and stop the wheelchair; close the Zone IV door", "Let it in if the patient is light", "Check the label after it's in", "Call estates later"],
    correct: [0],
    explanation: "Stop it immediately; a standard wheelchair is a classic projectile. Then report the near miss.",
  },
  {
    id: "cap-q3", type: "multi", topic: "RF heating", moduleId: "m14", difficulty: 3,
    scenario: "A large patient is positioned for a 3 T abdomen. Their arms touch the bore and their hands rest on their thighs.",
    stem: "Which corrections are needed? Select ALL that apply.",
    options: ["Pad between arms and bore", "Separate hands from thighs with padding", "Verify weight entered accurately", "Increase B1+rms to shorten scan"],
    correct: [0, 1, 2],
    explanation: "Remove contact points and ensure accurate SAR estimation.",
  },
  {
    id: "cap-q4", type: "scenario", topic: "Cryogens & quench", moduleId: "m14", difficulty: 3,
    scenario: "A loud bang is followed by white fog entering the scanner room from above the magnet. A patient is on the table.",
    stem: "Best action?",
    options: [
      "Finish the sequence.",
      "Evacuate the patient and staff immediately, do not re-enter, escalate to vendor/estates.",
      "Open the quench pipe valve.",
      "Enter with an oxygen cylinder.",
    ],
    correct: [1],
    explanation: "Possible quench with helium venting into the room: evacuate and keep out.",
  },
  {
    id: "cap-q5", type: "scenario", topic: "Screening", moduleId: "m14", difficulty: 2,
    scenario: "An interpreter is unavailable; the patient's 12-year-old child offers to translate the screening questions.",
    stem: "Best approach?",
    options: [
      "Use the child.",
      "Use a professional interpreter (including telephone/video) for safety-critical screening; postpone if necessary.",
      "Skip verbal screening.",
      "Use gestures.",
    ],
    correct: [1],
    explanation: "Safety-critical screening requires reliable communication.",
  },
  {
    id: "cap-q6", type: "scenario", topic: "Quality & governance", moduleId: "m14", difficulty: 3,
    scenario: "Three near misses in a month involve unscreened staff entering Zone III through a door wedged open for trolley access.",
    stem: "Strongest corrective action?",
    options: [
      "Email reminding staff.",
      "Redesign trolley flow and install a self-closing access-controlled door; audit compliance.",
      "Discipline the last person.",
      "Add a sign.",
    ],
    correct: [1],
    explanation: "An engineering/system fix addresses the root cause; measure its effect.",
  },
  {
    id: "cap-q7", type: "scenario", topic: "Implants", moduleId: "m14", difficulty: 3,
    scenario: "A patient's pacemaker generator is from an MR Conditional system, but records show an abandoned lead from a previous system.",
    stem: "Correct classification?",
    options: [
      "MR Conditional — the generator is.",
      "Not within MR Conditional system labelling; escalate for documented specialist risk–benefit decision.",
      "MR Safe.",
      "MR Conditional if scanned at 1.5 T.",
    ],
    correct: [1],
    explanation: "Abandoned leads typically fall outside MR Conditional system labelling.",
    references: ["hrs-2017"],
  },
  {
    id: "cap-q8", type: "scenario", topic: "Occupational", moduleId: "m14", difficulty: 2,
    scenario: "A visiting maintenance engineer arrives at 19:00 with a toolbox and asks for the scanner room key.",
    stem: "Best response?",
    options: [
      "Give the key.",
      "Screen, brief, verify permit-to-work and supervise; control tools.",
      "Ask security to supervise.",
      "Tell them to leave tools at the door of Zone IV.",
    ],
    correct: [1],
    explanation: "Contractor access is controlled and supervised by MR personnel.",
  },
  {
    id: "cap-q9", type: "scenario", topic: "Physics", moduleId: "m14", difficulty: 3,
    scenario: "An implant label states a maximum SFG of 3 T/m. The scanner's SFG map shows values above this only within the cover, near the bore entrance at the periphery.",
    stem: "Best reasoning?",
    options: [
      "Cannot scan — maximum SFG exceeds 3 T/m somewhere.",
      "Interpret per the label's wording and the scanner SFG map; escalate to the MRSE to confirm the patient-accessible region meets the condition.",
      "SFG doesn't matter at 1.5 T.",
      "Use a lower SAR mode.",
    ],
    correct: [1],
    explanation: "SFG assessment requires careful interpretation and MRSE input.",
  },
  {
    id: "cap-q10", type: "scenario", topic: "Emergency response", moduleId: "m14", difficulty: 3,
    scenario: "A patient on the MR table begins seizing during a contrast-enhanced scan.",
    stem: "First actions?",
    options: [
      "Continue to finish the contrast phase.",
      "Stop scan, remove from bore, call for help, manage airway, move out of Zone IV for further treatment.",
      "Bring in a standard monitor.",
      "Quench.",
    ],
    correct: [1],
    explanation: "Deterioration follows the same principle: stop, remove and treat outside Zone IV.",
  },
  {
    id: "cap-q11", type: "multi", topic: "Leadership", moduleId: "m14", difficulty: 2,
    stem: "Which belong in an MRSO's routine responsibilities? Select ALL that apply.",
    options: ["Maintaining safety procedures", "Coordinating training", "Following up incidents", "Signing off clinical risk–benefit decisions alone for all implants"],
    correct: [0, 1, 2],
    explanation: "Clinical risk–benefit decisions involve the MR Medical Director/responsible radiologist.",
  },
  {
    id: "cap-q12", type: "scenario", topic: "Zones & access", moduleId: "m14", difficulty: 2,
    scenario: "A new MR unit has a direct corridor door from a public waiting room into the control room.",
    stem: "What is the main issue?",
    options: [
      "None.",
      "Zone III is not physically restricted from Zone I; access control needs redesign.",
      "The door should be painted red.",
      "Only an issue at 3 T.",
    ],
    correct: [1],
    explanation: "Zone III must be physically restricted from the general public.",
  },
];
