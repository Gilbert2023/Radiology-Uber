import type { Module } from "../types";

export const m05: Module = {
  id: "m5",
  number: 5,
  title: "MRI Radiofrequency Heating and Burns",
  tagline: "SAR, B1+rms, loops and leads — the most reported MRI injury",
  description:
    "RF energy deposition, SAR and B1+rms, burn mechanisms, safe positioning, cable routing and the response to a reported burning sensation.",
  topic: "RF heating",
  depth: "core",
  labIds: ["rf-burn", "rf-sar"],
  furtherReading: ["delfino-2019", "dempsey-2001", "iec-60601-2-33", "acr-manual-2024"],
  lessons: [
    {
      id: "sar-b1rms",
      title: "RF energy deposition, SAR and B1+rms",
      minutes: 20,
      illustration: "rf-loop",
      summary: "Two different quantities that limit RF exposure — and why they are not interchangeable.",
      objectives: [
        "Define SAR and describe how the scanner estimates it.",
        "Define B1+rms and explain why device labelling increasingly uses it.",
        "Describe the IEC operating modes.",
        "Explain why SAR and B1+rms limits cannot be substituted for each other.",
      ],
      sections: [
        {
          heading: "Specific absorption rate (SAR)",
          body: [
            "SAR is the RF power absorbed per unit mass of tissue (W/kg). The scanner does not measure SAR in the patient; it estimates it from transmitted power and a body model, using the patient weight (and sometimes height) entered at registration. An inaccurate weight means an inaccurate SAR estimate.",
            "IEC 60601-2-33 defines operating modes. In Normal Operating Mode, whole-body SAR is limited to 2 W/kg and head SAR to 3.2 W/kg (averaged over 6 minutes); First Level Controlled Operating Mode allows whole-body SAR up to 4 W/kg and requires medical supervision considerations. Confirm values against the edition your scanner complies with.",
          ],
        },
        {
          heading: "B1+rms",
          body: [
            "B1+rms is the root-mean-square of the transmitted RF magnetic field component that excites spins, in microtesla (µT), averaged over a defined period. Because it describes the field the scanner actually produces, not a model-based absorption estimate, it is a more consistent metric across scanners and patients — and many implant labels now specify a B1+rms limit.",
          ],
        },
        {
          heading: "Not interchangeable",
          body: [
            "A label that says 'B1+rms ≤ 2.0 µT' is not satisfied by keeping whole-body SAR low, and vice versa. Depending on patient size and coil, a sequence can have low SAR but high B1+rms. Use the exact metric the labelling specifies and confirm how your scanner displays and limits it.",
          ],
          callout: {
            tone: "warning",
            title: "Apply the specific restriction",
            text: "Always apply the specific scanner, device and protocol restriction — never convert between SAR and B1+rms by rule of thumb.",
          },
        },
      ],
      mistakes: [
        "Entering an estimated weight 'to save time'.",
        "Meeting a SAR limit when the label specifies B1+rms.",
        "Assuming First Level mode is acceptable for an implant whose label requires Normal Operating Mode.",
      ],
      questionIds: ["m5-q1", "m5-q2", "m5-q3"],
      references: ["iec-60601-2-33", "fda-labeling-guidance", "panych-2018"],
    },
    {
      id: "burn-mechanisms",
      title: "Burn mechanisms, positioning and cable routing",
      minutes: 22,
      illustration: "rf-loop",
      summary: "How burns actually happen — and the positioning habits that prevent them.",
      objectives: [
        "Describe the conductive loop, skin-contact and resonant-lead mechanisms of burns.",
        "Position patients to avoid skin-to-skin contact and contact with the bore.",
        "Route cables and leads safely.",
      ],
      sections: [
        {
          heading: "Mechanisms",
          body: [
            "The RF field induces currents in conductive loops. A loop can be formed by the body itself — hands clasped, thighs or calves touching, hand resting on the hip — with a small contact point where current density and heating concentrate. Cables and leads can form loops or act as antennas that resonate at the RF frequency, concentrating energy at their tips. Contact with the bore lining places tissue close to the transmit coil where the field is strongest.",
            "Burns were the most frequently reported MRI adverse event in a 10-year review of FDA reports, and many are preventable through positioning.",
          ],
          bullets: [
            "Skin-to-skin contact (inner thighs, calves, arms against torso, hands together).",
            "Skin contact with the bore wall or transmit coil.",
            "Looped or crossed cables, ECG leads, coil cables.",
            "Moist or sweaty skin, wet clothing, garments with metallic fibres.",
            "Medication patches with metallic backing, jewellery, piercings.",
          ],
        },
        {
          heading: "Safe positioning",
          body: [
            "Use the manufacturer's pads to keep the patient off the bore and to separate skin surfaces — thighs, calves, arms and torso. Patients should wear facility gowns. Keep arms by the sides (not clasped across the body) unless the protocol requires otherwise, with padding between arms and body.",
          ],
        },
        {
          heading: "Cable routing",
          body: [
            "Use only MR Conditional monitoring equipment, set up according to its instructions. Run cables straight, without loops, along the centre of the table and away from the bore wall; do not let cables cross or touch the skin directly — pad them. Remove unused coils and cables from the bore. Inspect leads and electrodes for damage before use.",
          ],
        },
      ],
      checklist: {
        title: "RF burn prevention — positioning check",
        items: [
          "Patient in facility gown; clothing with metallic fibres removed",
          "No skin-to-skin contact (thighs, calves, hands, arms/torso) — padded",
          "No skin contact with bore wall — manufacturer pads in place",
          "Cables straight, unlooped, uncrossed, padded from skin, away from bore wall",
          "Unused coils and cables removed",
          "Only MR Conditional ECG/monitoring, used per instructions",
          "Patient told to report warmth or burning immediately; call bell tested",
        ],
      },
      mistakes: [
        "Letting the patient clasp hands on the abdomen.",
        "Running an ECG lead up the side of the bore.",
        "Leaving an unused surface coil cable in the bore.",
      ],
      questionIds: ["m5-q4", "m5-q5", "m5-q6", "m5-q7"],
      references: ["dempsey-2001", "delfino-2019", "acr-manual-2024"],
    },
    {
      id: "burn-response",
      title: "Responding to a reported burning sensation",
      minutes: 12,
      illustration: "rf-loop",
      summary: "Stop, inspect, treat, preserve evidence, report.",
      objectives: [
        "Describe the immediate response to a patient reporting heat or burning.",
        "Describe evidence preservation and reporting requirements.",
      ],
      sections: [
        {
          heading: "Immediate response",
          body: [
            "Stop the scan immediately, communicate with the patient, and remove them from the bore. Inspect the area, provide first aid and arrange clinical review. Do not resume scanning until the cause is understood and corrected.",
          ],
        },
        {
          heading: "Evidence and reporting",
          body: [
            "Record the sequence, coil, SAR/B1+rms displayed, positioning, padding and any monitoring equipment. Photograph the injury with consent per policy. Quarantine the equipment involved. Report internally, and to the manufacturer and regulator as required (e.g. FDA MedWatch/MAUDE pathway in the US, MHRA Yellow Card in the UK).",
          ],
        },
      ],
      mistakes: [
        "Reassuring the patient and finishing 'just one more sequence'.",
        "Discarding the ECG electrodes that may be evidence.",
      ],
      questionIds: ["m5-q8"],
      references: ["fda-maude", "mhra-yellowcard", "local-policy"],
    },
  ],
};

export const m06: Module = {
  id: "m6",
  number: 6,
  title: "Gradient-Related Hazards and Acoustic Noise",
  tagline: "Stimulation, noise and the patient who cannot tell you",
  description:
    "Rapidly switched gradients, peripheral nerve stimulation, acoustic noise, hearing protection and communication with sedated or non-verbal patients.",
  topic: "Gradients & acoustics",
  depth: "standard",
  furtherReading: ["iec-60601-2-33", "panych-2018", "acr-manual-2024"],
  lessons: [
    {
      id: "pns",
      title: "Switched gradients and peripheral nerve stimulation",
      minutes: 14,
      illustration: "gradient",
      summary: "dB/dt, stimulation thresholds and gradient effects on implants.",
      objectives: [
        "Explain how dB/dt induces electric fields in tissue.",
        "Recognise PNS and respond appropriately.",
        "Identify sequences likely to approach PNS limits.",
      ],
      sections: [
        {
          heading: "Mechanism",
          body: [
            "Switching gradients rapidly produces a time-varying magnetic field. Faraday's law tells us this induces electric fields in conductive tissue. Above a threshold, peripheral nerves depolarise — patients describe tingling, twitching or a sensation of being touched, often across the back, buttocks or nose. Cardiac stimulation has a much higher threshold, and scanner limits are designed to stay well below it.",
            "IEC 60601-2-33 limits gradient output by operating mode. Fast sequences such as echo-planar imaging (diffusion, functional MRI) and high-performance gradient protocols are more likely to approach PNS thresholds.",
          ],
        },
        {
          heading: "Response",
          body: [
            "Warn patients that mild tingling can occur, and ask them to report discomfort. If PNS is uncomfortable, stop and adjust — change phase-encoding direction, reduce slew rate, or select a lower gradient mode. Gradient-induced voltages in implanted leads are a separate concern addressed by device conditions.",
          ],
        },
      ],
      mistakes: ["Dismissing reported twitching as anxiety.", "Ignoring gradient (slew rate/dB/dt) limits on implant labelling."],
      questionIds: ["m6-q1", "m6-q2"],
      references: ["iec-60601-2-33", "panych-2018"],
    },
    {
      id: "acoustic",
      title: "Acoustic noise, hearing protection and communication",
      minutes: 14,
      illustration: "gradient",
      summary: "Protection that works — fitted, verified and appropriate for the patient.",
      objectives: [
        "Explain the source of acoustic noise in MRI.",
        "Select and verify hearing protection.",
        "Adapt communication and protection for sedated, paediatric and non-verbal patients.",
      ],
      sections: [
        {
          heading: "Source and levels",
          body: [
            "Lorentz forces on the gradient coils make them vibrate, producing noise that can exceed 100 dB(A) on some sequences and tends to be louder at higher field strengths and with faster gradient switching. IEC 60601-2-33 requires hearing protection to be used above a specified sound level — in practice, provide protection to every patient and to anyone remaining in the room during scanning.",
          ],
        },
        {
          heading: "Protection that works",
          body: [
            "Foam earplugs only protect when correctly inserted. Show the patient how to fit them, check the fit, and add headphones or ear defenders where possible. Ensure hearing protection does not prevent the patient from hearing instructions or using the call device.",
          ],
          bullets: [
            "Neonates and infants: use dedicated neonatal ear protection; consider noise-reduced sequences.",
            "Sedated or anaesthetised patients: protection is still required; they cannot report discomfort.",
            "Patients unable to communicate: agree a signal, maintain visual monitoring, involve carers.",
            "Patients with hearing aids or cochlear implants: follow device-specific instructions.",
          ],
        },
      ],
      checklist: {
        title: "Routine scan — gradients and noise",
        items: [
          "Earplugs fitted correctly and checked",
          "Headphones/defenders added where possible",
          "Call device given, explained and tested",
          "Patient warned about noise and possible tingling",
          "Additional measures for sedated, paediatric or non-communicating patients",
          "Hearing protection for anyone remaining in Zone IV",
        ],
      },
      mistakes: ["Handing earplugs over without checking insertion.", "Omitting protection for a sedated patient."],
      questionIds: ["m6-q3", "m6-q4"],
      references: ["iec-60601-2-33", "acr-manual-2024"],
    },
  ],
};

export const m07: Module = {
  id: "m7",
  number: 7,
  title: "Cryogens, Quenching and MRI Engineering Safety",
  tagline: "Liquid helium, quench pipes, oxygen and the button you hope never to press",
  description:
    "Superconducting magnet engineering, cryogen hazards, quench physics, room engineering controls and risk-based decisions on emergency magnet shutdown.",
  topic: "Cryogens & quench",
  depth: "core",
  labIds: ["quench"],
  furtherReading: ["mhra-mri", "acr-manual-2024", "manufacturer-ifu"],
  lessons: [
    {
      id: "cryogenics",
      title: "Superconducting magnets and cryogenic systems",
      minutes: 16,
      illustration: "cryostat",
      summary: "Cryostat, coldhead, compressor and the helium that keeps it all cold.",
      objectives: [
        "Describe the main components of a superconducting magnet system.",
        "Explain the role of the coldhead and compressor.",
        "Identify engineering faults that raise quench risk.",
      ],
      sections: [
        {
          heading: "The cryostat",
          body: [
            "The superconducting windings (commonly niobium–titanium) must remain at about 4 K. In conventional designs they sit in a vessel of liquid helium (boiling point about 4.2 K at atmospheric pressure), surrounded by thermal shields and a vacuum vessel that minimises heat transfer. Some newer designs use much smaller, sealed helium volumes; the specific design changes the hazard profile, so know what is installed in your department.",
          ],
        },
        {
          heading: "Coldhead and compressor",
          body: [
            "A coldhead driven by a helium compressor (itself cooled by a water chiller) recondenses evaporated helium, so modern systems lose little or no helium in normal operation. If the coldhead, compressor or chiller fails, helium boils off; if the level falls too low, the risk of quench rises. Coldhead noise changes, alarms and helium-level trends are early warnings.",
          ],
          bullets: [
            "Monitor helium level and pressure per vendor arrangements.",
            "Respond to chiller/compressor alarms promptly — escalate to the vendor.",
            "Never interfere with the quench pipe, burst disc or cryogen fill ports.",
          ],
        },
      ],
      mistakes: ["Ignoring a silent coldhead.", "Assuming a power cut will 'turn the magnet off'."],
      questionIds: ["m7-q1", "m7-q2"],
      references: ["mhra-mri", "manufacturer-ifu"],
    },
    {
      id: "quench",
      title: "Quench: helium release, oxygen displacement and room engineering",
      minutes: 20,
      illustration: "cryostat",
      summary: "What happens in the seconds after superconductivity is lost.",
      objectives: [
        "Explain quench physics and the rapid boil-off of helium.",
        "Describe asphyxiation, cold-injury and pressure hazards.",
        "Describe the purpose of the quench pipe, ventilation and oxygen monitoring.",
      ],
      sections: [
        {
          heading: "Quench physics",
          body: [
            "In a quench, part of the winding loses superconductivity. Its resistance converts the stored magnetic energy into heat, which boils the liquid helium very rapidly. Liquid helium expands roughly 750-fold when it becomes gas at room temperature, so large volumes of very cold gas are produced in seconds to minutes. The field decays over a period of seconds to tens of seconds or longer depending on the design.",
            "Quenches can be spontaneous (fault, low helium, external disturbance) or deliberately initiated through the magnet emergency stop.",
          ],
        },
        {
          heading: "Hazards if helium enters the room",
          body: [
            "The quench pipe should vent helium safely outside. If it is blocked, damaged or disconnected, helium can enter the scanner room. Helium displaces oxygen, causing asphyxiation without warning; the gas is extremely cold, causing cold burns; and rapid gas release can increase room pressure, making an inward-opening door difficult to open. A dense white cloud of condensed water vapour may obscure vision.",
          ],
          callout: {
            tone: "danger",
            title: "If helium vents into the room",
            text: "Evacuate the patient and everyone in the room immediately, following local procedure. Do not re-enter. Escalate to the vendor and estates. Treat the room as an oxygen-deficient atmosphere until cleared.",
          },
        },
        {
          heading: "Engineering controls",
          body: [
            "Controls include a quench pipe of appropriate design and integrity, inspected per vendor and estates schedules; emergency exhaust ventilation; room pressure relief features; oxygen monitoring in the scanner room where indicated by risk assessment; and door designs that allow egress under pressure. The MR Safety Expert and vendor advise on these controls.",
          ],
        },
      ],
      mistakes: ["Believing the field vanishes instantly after a quench.", "Re-entering a fog-filled room to fetch belongings."],
      questionIds: ["m7-q3", "m7-q4", "m7-q5"],
      references: ["mhra-mri", "acr-manual-2024", "manufacturer-ifu"],
    },
    {
      id: "shutdown-decisions",
      title: "Emergency evacuation, emergency power off and magnet stop: three different things",
      minutes: 16,
      illustration: "zones",
      summary: "Why a quench is not the routine first response to every MRI emergency.",
      objectives: [
        "Distinguish patient evacuation, emergency power off (EPO) and magnet emergency stop (quench).",
        "Describe situations in which a quench may be indicated.",
        "Explain the consequences and risks of a deliberate quench.",
      ],
      sections: [
        {
          heading: "Three controls",
          body: [
            "Emergency patient evacuation removes the patient from Zone IV to a safe area — the usual first action in a medical emergency. Emergency power off (EPO) cuts electrical power to the scanner electronics; it does NOT remove the static field of a superconducting magnet. Magnet emergency stop (quench) dissipates the magnetic field and boils off helium.",
          ],
        },
        {
          heading: "When a quench may be considered",
          body: [
            "Commonly cited indications include a person pinned or trapped by a ferromagnetic object with risk to life or limb, and fire or other emergencies where responders must enter Zone IV with ferromagnetic equipment and no safe alternative exists. The decision follows local procedure and the manufacturer's instructions and is taken by designated, trained personnel.",
          ],
        },
        {
          heading: "Why not by default",
          body: [
            "A deliberate quench does not remove the field instantly; may release helium into the room if venting fails; leaves the department without the scanner for days or longer; and carries significant cost. For cardiac arrest, removing the patient from Zone IV is faster and safer than waiting for the field to decay.",
          ],
          callout: {
            tone: "warning",
            title: "Not a substitute for local procedure",
            text: "These principles do not replace your local emergency procedures or the scanner manufacturer's instructions.",
          },
        },
      ],
      mistakes: [
        "Pressing the quench button for a cardiac arrest.",
        "Believing EPO makes Zone IV safe for ferromagnetic equipment.",
      ],
      questionIds: ["m7-q6", "m7-q7", "m7-q8"],
      references: ["acr-manual-2024", "mhra-mri", "manufacturer-ifu", "local-policy"],
    },
  ],
};

export const m08: Module = {
  id: "m8",
  number: 8,
  title: "MRI Emergency Management",
  tagline: "Get the patient out. Keep the crash team out.",
  description:
    "Cardiac arrest, fire, projectile incidents, burns, quench, oxygen alarms, power failure, deterioration and entrapment — priorities, roles, communication and documentation.",
  topic: "Emergency response",
  depth: "core",
  labIds: ["emergency"],
  furtherReading: ["acr-manual-2024", "mhra-mri", "local-policy"],
  lessons: [
    {
      id: "cardiac-arrest",
      title: "Cardiac arrest and the deteriorating patient",
      minutes: 18,
      illustration: "zones",
      summary: "Remove the patient from Zone IV to resuscitate — the cornerstone of MR emergency practice.",
      objectives: [
        "Describe the sequence of actions for a cardiac arrest in Zone IV.",
        "Allocate roles for an MR emergency.",
        "Explain why resuscitation equipment must not enter Zone IV unless verified.",
      ],
      sections: [
        {
          heading: "Priorities",
          body: [
            "Stop the scan, call for help using the local emergency number with the MR-specific location, begin basic life support and remove the patient from Zone IV — typically on the detachable MR table or an MR Conditional trolley — to a designated resuscitation area in Zone III or II. Resuscitation and defibrillation take place outside Zone IV.",
            "Resuscitation equipment — defibrillators, laryngoscopes, oxygen cylinders, monitors — must not be brought into Zone IV unless its MR safety status and conditions have been verified. Arriving teams are met at the Zone III entrance by a designated MR staff member.",
          ],
          callout: {
            tone: "danger",
            title: "The crash team stops at Zone III",
            text: "Designate a gatekeeper before you need one. The arriving team brings ferromagnetic equipment by default.",
          },
        },
        {
          heading: "Roles",
          body: ["Allocate roles explicitly and rehearse them:"],
          bullets: [
            "Team lead (Level 2 MR personnel) — coordinates the evacuation and handover.",
            "Gatekeeper — secures Zone IV door, stops unscreened people and equipment.",
            "Compressions/airway — begins BLS and continues during transfer where possible.",
            "Communicator — calls the team, gives exact location, meets responders.",
            "Scribe — times and actions for the record.",
          ],
        },
        {
          heading: "Patient deterioration",
          body: [
            "For deterioration short of arrest — reduced consciousness, respiratory difficulty, contrast reaction, seizure — the same principle applies: stop the scan and bring the patient out of the bore promptly. Sedated and anaesthetised patients require monitoring with MR Conditional equipment by appropriately trained staff.",
          ],
        },
      ],
      checklist: {
        title: "Cardiac arrest in Zone IV",
        items: [
          "Stop scan; call emergency team with MR-specific location",
          "Begin BLS",
          "Remove patient from bore and from Zone IV to designated resuscitation area",
          "Gatekeeper stops unscreened staff and equipment at Zone III",
          "Resuscitate outside Zone IV; defibrillate outside Zone IV",
          "Secure Zone IV door; account for all staff",
          "Document times and actions; report and debrief",
        ],
      },
      mistakes: ["Wheeling the defibrillator into the scanner room.", "Quenching the magnet instead of evacuating the patient."],
      questionIds: ["m8-q1", "m8-q2", "m8-q3"],
      references: ["acr-manual-2024", "mhra-mri", "local-policy"],
    },
    {
      id: "fire-quench-o2-power",
      title: "Fire, quench, oxygen alarm, power failure and entrapment",
      minutes: 20,
      illustration: "cryostat",
      summary: "Different emergencies, different first actions — evacuation, EPO, or magnet stop.",
      objectives: [
        "Describe the response to fire or smoke in the MR suite.",
        "Describe the response to a quench, suspected helium release or oxygen alarm.",
        "Describe the response to power failure and patient entrapment.",
      ],
      sections: [
        {
          heading: "Fire or smoke",
          body: [
            "Evacuate the patient. Use only MR Conditional extinguishers in Zone IV. Electrical fire may warrant emergency power off — which does not remove the static field. Fire services must be prevented from entering Zone IV with ferromagnetic equipment; if entry is essential and the field is a hazard, a magnet stop may be considered under local procedure. Pre-briefing local fire services is essential.",
          ],
        },
        {
          heading: "Quench, helium release and oxygen alarm",
          body: [
            "Evacuate the patient and all staff from the scanner room immediately, close the door if possible, and do not re-enter. Call the vendor and estates. An oxygen-deficiency alarm means treat the room as unsafe: evacuate, do not enter to investigate, and follow the local procedure for ventilation and specialist assessment.",
          ],
        },
        {
          heading: "Power failure",
          body: [
            "A superconducting magnet remains at field during power failure. The patient table may not move under power; use the manual table release per vendor instructions to withdraw the patient. Ensure lighting, communication and access control are maintained, and keep Zone IV restricted.",
          ],
        },
        {
          heading: "Entrapment and equipment failure",
          body: [
            "If a patient is trapped by equipment failure, use the manual release and summon help. If a person is pinned by a ferromagnetic object with risk to life or limb, a magnet emergency stop may be indicated per local procedure.",
          ],
        },
      ],
      mistakes: ["Assuming firefighters know about MRI.", "Investigating an oxygen alarm by walking into the room."],
      questionIds: ["m8-q4", "m8-q5", "m8-q6"],
      references: ["mhra-mri", "acr-manual-2024", "manufacturer-ifu", "local-policy"],
    },
    {
      id: "post-incident",
      title: "Projectile incidents, burns and post-incident documentation",
      minutes: 14,
      illustration: "governance",
      summary: "What to capture, who to tell and how to learn.",
      objectives: [
        "Describe immediate actions for projectile incidents and burns.",
        "List the elements of post-incident documentation.",
        "Describe debriefing and reporting obligations.",
      ],
      sections: [
        {
          heading: "Immediate actions",
          body: [
            "Projectile: assess and protect people first; stop further entry; consider magnet stop only if someone is trapped and at risk. Burn: stop scan, remove patient, assess, treat, preserve evidence.",
          ],
        },
        {
          heading: "Documentation",
          body: ["Capture facts while fresh:"],
          bullets: [
            "Date, time, location, people involved and witnesses",
            "Sequence of events in neutral language",
            "Equipment involved (asset numbers, MR labelling) — quarantined",
            "Scanner parameters (sequence, coil, SAR/B1+rms) where relevant",
            "Injuries, treatment and clinical follow-up",
            "Notifications: MRSO, MR Medical Director, risk management, manufacturer, regulator as required",
          ],
        },
        {
          heading: "Debrief",
          body: [
            "Hold a hot debrief to support staff and capture immediate learning, followed by a structured investigation (Module 11). Focus on systems, not blame.",
          ],
        },
      ],
      mistakes: ["Writing the report days later from memory.", "Returning equipment to service before investigation."],
      questionIds: ["m8-q7", "m8-q8"],
      references: ["fda-maude", "mhra-yellowcard", "local-policy"],
    },
  ],
};
