import type { Question } from "../types";

const TF = ["True", "False"];

/** Modules 5–8. */
export const bankB: Question[] = [
  // ── Module 5 ─────────────────────────────────────────────
  {
    id: "m5-q1", type: "mcq", topic: "RF heating", moduleId: "m5", difficulty: 1,
    stem: "SAR is expressed in:",
    options: ["µT", "W/kg", "T/m", "dB(A)"], correct: [1],
    explanation: "SAR is absorbed RF power per unit mass, W/kg. B1+rms is in µT.",
  },
  {
    id: "m5-q2", type: "truefalse", topic: "RF heating", moduleId: "m5", difficulty: 2,
    stem: "If a device label specifies B1+rms ≤ 2.0 µT, keeping whole-body SAR below 2 W/kg satisfies the condition.",
    options: TF, correct: [1],
    explanation: "False. SAR and B1+rms are different quantities. Apply the exact metric the label specifies.",
    references: ["fda-labeling-guidance"],
  },
  {
    id: "m5-q3", type: "mcq", topic: "RF heating", moduleId: "m5", difficulty: 2,
    stem: "Why does an inaccurate patient weight matter?",
    options: [
      "It changes the static field.",
      "The scanner uses it to estimate SAR, so the estimate becomes unreliable.",
      "It changes the Larmor frequency.",
      "It has no safety relevance.",
    ],
    correct: [1],
    explanation: "SAR is model-based, using entered patient data.",
  },
  {
    id: "m5-q4", type: "multi", topic: "RF heating", moduleId: "m5", difficulty: 2,
    stem: "Which positions increase burn risk? Select ALL that apply.",
    options: ["Hands clasped over abdomen", "Inner thighs touching", "Arm resting against the bore wall", "Arms padded at sides"],
    correct: [0, 1, 2],
    explanation: "Skin-to-skin loops and bore contact increase risk. Padded arms at the sides is the safe option.",
  },
  {
    id: "m5-q5", type: "mcq", topic: "RF heating", moduleId: "m5", difficulty: 2,
    stem: "Best practice for ECG cable routing is:",
    options: [
      "Loop excess cable to keep it tidy",
      "Run it straight, unlooped, along the table centre, padded from skin and away from the bore wall",
      "Run it along the bore wall",
      "Cross leads over the chest",
    ],
    correct: [1],
    explanation: "Avoid loops, crossings, skin contact and proximity to the transmit coil.",
  },
  {
    id: "m5-q6", type: "truefalse", topic: "RF heating", moduleId: "m5", difficulty: 1,
    stem: "Burns have been among the most frequently reported MRI adverse events to the FDA.",
    options: TF, correct: [0],
    explanation: "True. A 10-year review of FDA reports found thermal injuries were the most frequent category.",
    references: ["delfino-2019"],
  },
  {
    id: "m5-q7", type: "multi", topic: "RF heating", moduleId: "m5", difficulty: 2,
    stem: "Which should be removed or addressed before scanning? Select ALL that apply.",
    options: ["Clothing with metallic fibres", "Unused surface coil left in the bore", "Medication patch with metallic backing (per policy/prescriber advice)", "Facility gown"],
    correct: [0, 1, 2],
    explanation: "The facility gown is the desired clothing. Medication patches are handled per policy, with input from the prescriber where needed.",
  },
  {
    id: "m5-q8", type: "scenario", topic: "RF heating", moduleId: "m5", difficulty: 2,
    scenario: "Mid-way through a 3 T knee protocol, the patient says their calf feels hot. Two sequences remain.",
    stem: "Most appropriate action?",
    options: [
      "Finish quickly — only two sequences left.",
      "Stop scanning, remove the patient, inspect, treat, preserve evidence and report.",
      "Reduce SAR and continue.",
      "Add more padding without stopping.",
    ],
    correct: [1],
    explanation: "Stop immediately, assess and treat. Do not resume until the cause is understood and corrected.",
  },

  // ── Module 6 ─────────────────────────────────────────────
  {
    id: "m6-q1", type: "mcq", topic: "Gradients & acoustics", moduleId: "m6", difficulty: 1,
    stem: "Peripheral nerve stimulation is caused by:",
    options: ["Static field strength", "Rapidly changing gradient fields (dB/dt)", "RF heating", "Helium boil-off"],
    correct: [1],
    explanation: "Time-varying gradients induce electric fields in tissue that can stimulate nerves.",
  },
  {
    id: "m6-q2", type: "scenario", topic: "Gradients & acoustics", moduleId: "m6", difficulty: 2,
    scenario: "During diffusion imaging, a patient reports uncomfortable twitching across the back.",
    stem: "Best response?",
    options: [
      "Reassure them that it's normal and continue.",
      "Stop and adjust parameters (e.g. lower gradient mode or slew rate, change phase direction) before continuing.",
      "Quench the magnet.",
      "Increase SAR.",
    ],
    correct: [1],
    explanation: "PNS is managed by modifying gradient demand. Uncomfortable stimulation should not be ignored.",
  },
  {
    id: "m6-q3", type: "truefalse", topic: "Gradients & acoustics", moduleId: "m6", difficulty: 1,
    stem: "Sedated patients do not need hearing protection because they are asleep.",
    options: TF, correct: [1],
    explanation: "False. Noise exposure still occurs, and sedated patients cannot report discomfort.",
  },
  {
    id: "m6-q4", type: "mcq", topic: "Gradients & acoustics", moduleId: "m6", difficulty: 2,
    stem: "The main source of MRI acoustic noise is:",
    options: ["Coldhead only", "Lorentz forces on switched gradient coils", "RF amplifier fans", "Patient table motor"],
    correct: [1],
    explanation: "Switching currents in the gradient coils within B0 produce vibration and noise. The coldhead contributes a background noise only.",
  },

  // ── Module 7 ─────────────────────────────────────────────
  {
    id: "m7-q1", type: "mcq", topic: "Cryogens & quench", moduleId: "m7", difficulty: 1,
    stem: "The role of the coldhead is to:",
    options: ["Generate the RF field", "Recondense evaporated helium", "Switch gradients", "Monitor oxygen"],
    correct: [1],
    explanation: "The coldhead, driven by the compressor, recondenses helium to limit boil-off.",
  },
  {
    id: "m7-q2", type: "truefalse", topic: "Cryogens & quench", moduleId: "m7", difficulty: 1,
    stem: "A prolonged chiller or compressor failure can increase the risk of a quench.",
    options: TF, correct: [0],
    explanation: "True. Helium boils off without recondensation; low levels raise quench risk.",
  },
  {
    id: "m7-q3", type: "mcq", topic: "Cryogens & quench", moduleId: "m7", difficulty: 2,
    stem: "Liquid helium expands roughly how many times on becoming room-temperature gas?",
    options: ["~7", "~75", "~750", "~75,000"], correct: [2],
    explanation: "Approximately 750-fold, which is why venting must be engineered and why room release is dangerous.",
  },
  {
    id: "m7-q4", type: "multi", topic: "Cryogens & quench", moduleId: "m7", difficulty: 2,
    stem: "If helium vents into the scanner room, which hazards arise? Select ALL that apply.",
    options: ["Asphyxiation from oxygen displacement", "Cold burns", "Raised room pressure hindering door opening", "Increased SAR"],
    correct: [0, 1, 2],
    explanation: "SAR is an RF quantity unrelated to helium release.",
  },
  {
    id: "m7-q5", type: "truefalse", topic: "Cryogens & quench", moduleId: "m7", difficulty: 2,
    stem: "After a quench is initiated, the magnetic field disappears instantly.",
    options: TF, correct: [1],
    explanation: "False. The field decays over seconds to tens of seconds or longer depending on the design.",
  },
  {
    id: "m7-q6", type: "mcq", topic: "Cryogens & quench", moduleId: "m7", difficulty: 2,
    stem: "Which action removes power from scanner electronics but leaves the static field present?",
    options: ["Magnet emergency stop", "Emergency power off (EPO)", "Patient evacuation", "Ramp-down"],
    correct: [1],
    explanation: "EPO cuts electrical power. The superconducting field remains.",
  },
  {
    id: "m7-q7", type: "scenario", topic: "Cryogens & quench", moduleId: "m7", difficulty: 3,
    scenario: "A patient arrests in the bore of a 1.5 T system. A junior colleague reaches for the magnet stop button 'so the crash team can come in'.",
    stem: "Best response?",
    options: [
      "Allow it — field removal helps the team.",
      "Stop them; remove the patient from Zone IV to resuscitate, with the team met at Zone III.",
      "Press EPO instead so the team can enter.",
      "Wait for the field to decay before starting CPR.",
    ],
    correct: [1],
    explanation: "Evacuation is faster and avoids the hazards and consequences of a quench. EPO does not make Zone IV safe.",
  },
  {
    id: "m7-q8", type: "multi", topic: "Cryogens & quench", moduleId: "m7", difficulty: 2,
    stem: "Engineering controls relevant to cryogen safety include: Select ALL that apply.",
    options: ["Quench pipe integrity inspection", "Emergency exhaust ventilation", "Oxygen monitoring where indicated by risk assessment", "Larger warning stickers on the bore"],
    correct: [0, 1, 2],
    explanation: "Stickers are not engineering controls.",
  },

  // ── Module 8 ─────────────────────────────────────────────
  {
    id: "m8-q1", type: "mcq", topic: "Emergency response", moduleId: "m8", difficulty: 1,
    stem: "Where should defibrillation take place for a patient who arrests in Zone IV?",
    options: ["In the bore", "In Zone IV beside the magnet", "Outside Zone IV, in the designated resuscitation area", "Wherever the team prefers"],
    correct: [2],
    explanation: "Remove the patient from Zone IV. Standard defibrillators must not enter Zone IV.",
  },
  {
    id: "m8-q2", type: "multi", topic: "Emergency response", moduleId: "m8", difficulty: 2,
    stem: "Key roles in an MR emergency include: Select ALL that apply.",
    options: ["Gatekeeper at Zone III", "Team lead (Level 2 MR personnel)", "Scribe", "Someone to restart the scan"],
    correct: [0, 1, 2],
    explanation: "Scanning stops. Roles focus on evacuation, gatekeeping, resuscitation and documentation.",
  },
  {
    id: "m8-q3", type: "truefalse", topic: "Emergency response", moduleId: "m8", difficulty: 1,
    stem: "Resuscitation equipment may enter Zone IV only if its MR safety status and conditions have been verified.",
    options: TF, correct: [0],
    explanation: "True. Most standard resuscitation equipment is MR Unsafe.",
  },
  {
    id: "m8-q4", type: "scenario", topic: "Emergency response", moduleId: "m8", difficulty: 2,
    scenario: "The scanner-room oxygen alarm activates. There is no visible fog and no patient on the table.",
    stem: "Best action?",
    options: [
      "Walk in to check the sensor.",
      "Keep everyone out; follow the local oxygen-alarm procedure, ventilation and specialist assessment.",
      "Silence the alarm and continue the list.",
      "Quench the magnet.",
    ],
    correct: [1],
    explanation: "Treat the room as oxygen deficient until cleared. Do not enter to investigate.",
  },
  {
    id: "m8-q5", type: "mcq", topic: "Emergency response", moduleId: "m8", difficulty: 2,
    stem: "During a building power failure, the patient table will not move. What should you do?",
    options: [
      "Wait for power to return.",
      "Use the vendor's manual table release to withdraw the patient.",
      "Quench to allow staff in with tools.",
      "Bring in a standard trolley.",
    ],
    correct: [1],
    explanation: "The field persists. Manual release allows evacuation without other hazards.",
  },
  {
    id: "m8-q6", type: "multi", topic: "Emergency response", moduleId: "m8", difficulty: 3,
    stem: "In a fire in the MR suite, which statements are correct? Select ALL that apply.",
    options: [
      "Only MR Conditional extinguishers should be used in Zone IV.",
      "EPO may be appropriate for an electrical fire but does not remove the static field.",
      "Firefighters should be prevented from entering Zone IV with ferromagnetic equipment.",
      "Quench is always the first action.",
    ],
    correct: [0, 1, 2],
    explanation: "A quench may be considered under local procedure but is not automatically first.",
  },
  {
    id: "m8-q7", type: "multi", topic: "Emergency response", moduleId: "m8", difficulty: 2,
    stem: "Post-incident documentation should include: Select ALL that apply.",
    options: ["Timeline and witnesses", "Equipment involved and its MR labelling", "Notifications made", "Speculation about who is to blame"],
    correct: [0, 1, 2],
    explanation: "Records should be factual and neutral. Blame is not part of the record.",
  },
  {
    id: "m8-q8", type: "truefalse", topic: "Emergency response", moduleId: "m8", difficulty: 1,
    stem: "Equipment involved in an MRI burn should be returned to service as soon as possible.",
    options: TF, correct: [1],
    explanation: "False. Quarantine it for investigation and manufacturer/regulator reporting as required.",
  },
];
