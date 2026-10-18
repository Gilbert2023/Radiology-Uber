import type { Module } from "../types";

export const m09: Module = {
  id: "m9",
  number: 9,
  title: "MRI Safety Screening and Risk Assessment",
  tagline: "The last reliable barrier before Zone IV",
  description:
    "Questionnaires, verbal screening, identity checks, implant documentation, discrepancies, special populations, staff and visitor screening, and escalation.",
  topic: "Screening",
  depth: "core",
  labIds: ["screening"],
  furtherReading: ["acr-manual-2024", "mhra-mri", "local-policy"],
  lessons: [
    {
      id: "screening-process",
      title: "The two-stage screening process",
      minutes: 18,
      illustration: "screening",
      summary: "Written questionnaire plus verbal review by trained MR personnel — every time.",
      objectives: [
        "Describe a two-stage screening process.",
        "Verify identity and reconcile the questionnaire with the record.",
        "Handle screening discrepancies.",
      ],
      sections: [
        {
          heading: "Written and verbal",
          body: [
            "Screening combines a written questionnaire with a face-to-face verbal review by Level 2 MR personnel, who go through each answer — including 'no' answers — with the patient. The verbal step catches misunderstanding, literacy and language barriers, and forgotten history. Repeat screening on each visit; history changes.",
            "Confirm patient identity using local identifiers before screening. Ask patients to change into facility gowns, which removes clothing with metallic components and hidden pocket items.",
          ],
        },
        {
          heading: "Documentation and discrepancies",
          body: [
            "Cross-check the questionnaire with referral information, the electronic record, prior imaging and surgical history. A discrepancy — a sternotomy scar but 'no surgery', a prior radiograph showing a device not declared — must be resolved before entering Zone IV. When it cannot be resolved, treat the item as unidentified and escalate.",
          ],
        },
      ],
      checklist: {
        title: "Screening — every patient, every visit",
        items: [
          "Identity confirmed",
          "Written questionnaire completed and signed per policy",
          "Verbal review of every answer by Level 2 MR personnel",
          "Cross-checked against record, referral and prior imaging",
          "Patient changed into facility gown; belongings secured",
          "Discrepancies resolved or escalated before Zone IV",
          "Final check immediately before entering Zone IV",
        ],
      },
      mistakes: ["Accepting a ticked form without discussion.", "Not re-screening a returning patient."],
      questionIds: ["m9-q1", "m9-q2", "m9-q3"],
      references: ["acr-manual-2024", "mhra-mri"],
    },
    {
      id: "special-populations",
      title: "Patients who cannot fully screen themselves",
      minutes: 18,
      illustration: "screening",
      summary: "Cognitive impairment, sedation, unconscious patients, children and language barriers.",
      objectives: [
        "Adapt screening for patients unable to give a reliable history.",
        "Use collateral sources and imaging appropriately.",
        "Apply pregnancy screening in line with policy.",
      ],
      sections: [
        {
          heading: "Unreliable or unavailable history",
          body: [
            "For unconscious, sedated, confused or non-verbal patients, gather collateral history from family, carers, referring clinicians and the record; inspect for scars; review prior imaging; and consider radiographs per local policy to look for implants or foreign bodies. Document the sources used and the residual uncertainty, and involve the responsible radiologist in the risk–benefit decision.",
          ],
        },
        {
          heading: "Children",
          body: [
            "Screen both the child and any accompanying parent or guardian who will enter Zone IV. Check for clothing with metallic components, hair accessories, and devices such as insulin pumps or continuous glucose monitors.",
          ],
        },
        {
          heading: "Language, literacy and pregnancy",
          body: [
            "Use professional interpreters; do not rely on family members for critical safety questions where avoidable. Apply pregnancy screening per your local policy, which will define who is asked, how, and what happens with a positive or uncertain answer.",
          ],
        },
      ],
      mistakes: ["Scanning an unconscious trauma patient without any implant search.", "Forgetting to screen the parent."],
      questionIds: ["m9-q4", "m9-q5"],
      references: ["acr-manual-2024", "local-policy"],
    },
    {
      id: "staff-visitor-escalation",
      title: "Staff, visitor and contractor screening; escalation",
      minutes: 14,
      illustration: "governance",
      summary: "Everyone entering Zone III or IV is screened — and unresolved risk goes up, not around.",
      objectives: [
        "Screen staff, visitors and contractors proportionately.",
        "Define an escalation pathway for unresolved screening risks.",
      ],
      sections: [
        {
          heading: "Non-patients",
          body: [
            "Staff, students, carers, visitors and contractors must be screened before entering Zone IV, and accompanied by Level 2 MR personnel unless appropriately trained. Staff with implants or wearable devices need an individual risk assessment.",
          ],
        },
        {
          heading: "Escalation",
          body: [
            "Unresolved screening risks are escalated to the designated MR safety personnel — typically the MRSO, MR Safety Expert (for technical device and physics questions) and MR Medical Director or responsible radiologist (for clinical risk–benefit decisions). Postponing or modifying the examination is a legitimate outcome.",
          ],
        },
      ],
      mistakes: ["Letting a contractor 'just pop in' with tools.", "Resolving a doubtful device by majority vote in the control room."],
      questionIds: ["m9-q6", "m9-q7"],
      references: ["acr-manual-2024", "calamante-2016", "local-policy"],
    },
  ],
};

export const m10: Module = {
  id: "m10",
  number: 10,
  title: "Occupational and Staff Safety",
  tagline: "Evidence, regulation and individual risk assessment",
  description:
    "Static-field exposure effects, regulatory frameworks, pregnant staff, staff implants, manual handling, hearing protection and contractor access.",
  topic: "Occupational",
  depth: "standard",
  furtherReading: ["icnirp-static-2009", "eu-2013-35", "uk-cemfaw-2016", "acr-manual-2024"],
  lessons: [
    {
      id: "occupational-exposure",
      title: "Occupational exposure to static and time-varying fields",
      minutes: 16,
      illustration: "fringe-field",
      summary: "What is established, what is regulated, and what needs individual assessment.",
      objectives: [
        "Describe established transient effects of movement in a static field.",
        "Outline relevant regulatory frameworks.",
        "Distinguish established hazards from areas of uncertainty.",
      ],
      sections: [
        {
          heading: "Established effects",
          body: [
            "Moving through a strong static field can induce transient sensory effects — vertigo, nausea, a metallic taste and visual phosphenes. These are associated with movement and are reduced by moving slowly near the magnet. Evidence does not establish long-term harm from occupational static-field exposure, but data are limited; this is neither 'automatically harmful' nor 'proven harmless'.",
          ],
        },
        {
          heading: "Regulation",
          body: [
            "In the EU, Directive 2013/35/EU sets requirements for worker EMF exposure with a conditional derogation for MRI; in Great Britain the Control of Electromagnetic Fields at Work Regulations 2016 apply, with HSE guidance. ICNIRP publishes exposure guidelines. Requirements depend on jurisdiction — your organisation's risk assessment applies them locally.",
          ],
        },
      ],
      mistakes: ["Telling staff exposure is definitely harmless.", "Ignoring reported vertigo."],
      questionIds: ["m10-q1", "m10-q2"],
      references: ["icnirp-static-2009", "eu-2013-35", "uk-cemfaw-2016"],
    },
    {
      id: "staff-risk",
      title: "Pregnant staff, staff implants, manual handling and contractors",
      minutes: 16,
      illustration: "governance",
      summary: "Individual risk assessment and documented competence.",
      objectives: [
        "Describe the approach to pregnant MR staff.",
        "Manage staff with implants or wearable devices.",
        "Control contractor and maintenance access.",
      ],
      sections: [
        {
          heading: "Pregnant staff",
          body: [
            "US guidance (ACR) has indicated that pregnant staff may work in and around the MR environment, with a recommendation not to remain in the scanner room during active scanning; UK practice centres on individual risk assessment. Verify current guidance and apply your organisation's policy.",
          ],
        },
        {
          heading: "Implants, manual handling, records",
          body: [
            "Staff with implants or wearable devices need the same rigour as patients, documented confidentially. Transferring patients on and off MR tables is a manual-handling risk — use appropriate aids that are MR Conditional where they enter Zone IV. Training and competency records must show who is Level 1 / Level 2 and when training was last refreshed.",
          ],
        },
        {
          heading: "Contractors",
          body: [
            "Engineers, estates staff and contractors require screening, briefing, supervision and a permit-to-work process for Zone IV. Tools must be controlled; vendor service engineers follow the vendor's own safety rules in addition to yours.",
          ],
        },
      ],
      mistakes: ["Assuming every engineer is trained.", "Keeping no record of who is Level 2."],
      questionIds: ["m10-q3", "m10-q4"],
      references: ["acr-manual-2024", "mhra-mri", "uk-cemfaw-2016"],
    },
  ],
};

export const m11: Module = {
  id: "m11",
  number: 11,
  title: "MRI Safety Quality Assurance and Incident Investigation",
  tagline: "Find the weak signal before the strong one",
  description:
    "Audits, near-miss reporting, incident investigation, root cause analysis, CAPA, drills and governance — with downloadable, editable templates.",
  topic: "Quality & governance",
  depth: "standard",
  labIds: ["incident"],
  furtherReading: ["acr-mr-qc-2015", "aapm-100", "tjc-sea-38", "mhra-mri"],
  lessons: [
    {
      id: "audit-culture",
      title: "Audits, near misses and safety culture",
      minutes: 16,
      illustration: "governance",
      summary: "What to audit and how to make reporting normal.",
      objectives: [
        "Design an MR safety audit programme.",
        "Encourage near-miss reporting within a just culture.",
      ],
      sections: [
        {
          heading: "What to audit",
          body: ["A practical programme covers:"],
          bullets: [
            "Screening compliance — completed, verbally reviewed, signed, discrepancies resolved.",
            "Access control — doors, keys, out-of-hours access lists.",
            "Equipment inventory and labelling.",
            "Signage condition and accuracy.",
            "Training and competency records.",
            "Emergency drills completed and actions closed.",
            "Engineering checks — quench pipe, oxygen monitor, ventilation, per schedule.",
          ],
        },
        {
          heading: "Near misses and culture",
          body: [
            "Near misses — the oxygen cylinder stopped at the door — are free lessons. Make reporting quick, non-punitive, and visibly acted on. Separate individual accountability for reckless behaviour from system failures that made the error likely.",
          ],
        },
      ],
      mistakes: ["Auditing paperwork only.", "Thanking the reporter, then doing nothing."],
      questionIds: ["m11-q1", "m11-q2"],
      references: ["tjc-sea-38", "acr-manual-2024"],
    },
    {
      id: "rca-capa",
      title: "Incident investigation, root cause analysis and CAPA",
      minutes: 18,
      illustration: "governance",
      summary: "From timeline to contributory factors to controls that actually work.",
      objectives: [
        "Conduct a structured incident investigation.",
        "Apply root cause analysis tools.",
        "Write corrective and preventive actions using the hierarchy of controls.",
      ],
      sections: [
        {
          heading: "Investigation",
          body: [
            "Build a timeline from records and interviews; identify where barriers failed and why; analyse contributory factors (people, task, equipment, environment, organisation). Tools include 5 Whys and fishbone (Ishikawa) diagrams.",
          ],
        },
        {
          heading: "CAPA and the hierarchy of controls",
          body: [
            "Prefer stronger controls: eliminate the hazard or engineer it out (locked doors, FMDS, removing MR Unsafe equipment from Zone III) over administrative controls (new policy, retraining) alone. Each action needs an owner, a deadline and a measure of effectiveness.",
          ],
          callout: {
            tone: "info",
            title: "Editable templates",
            text: "Download the audit, incident report, risk register and CAPA templates from the Resources library.",
          },
        },
      ],
      mistakes: ["Stopping at 'human error'.", "Closing actions without checking they worked."],
      questionIds: ["m11-q3", "m11-q4"],
      references: ["tjc-sea-38", "local-policy"],
    },
  ],
};

export const m12: Module = {
  id: "m12",
  number: 12,
  title: "MRI Safety Officer Leadership",
  tagline: "Roles, committees, SOPs and continuous improvement",
  description:
    "MRSO, MR Medical Director and MR Safety Expert responsibilities; committees, SOPs, training, vendors and quality improvement — with jurisdictional caveats.",
  topic: "Leadership",
  depth: "standard",
  furtherReading: ["calamante-2016", "acr-manual-2024", "mhra-mri"],
  lessons: [
    {
      id: "roles",
      title: "MRMD, MRSO and MRSE: who does what",
      minutes: 16,
      illustration: "governance",
      summary: "Role definitions vary by jurisdiction — know which framework you work under.",
      objectives: [
        "Describe the typical responsibilities of the MR Medical Director, MR Safety Officer and MR Safety Expert.",
        "Relate these to UK role titles.",
      ],
      sections: [
        {
          heading: "Typical responsibilities",
          body: [],
          bullets: [
            "MR Medical Director (MRMD) — overall responsibility for MR safety at the site; approves policy; makes or delegates clinical risk–benefit decisions.",
            "MR Safety Officer (MRSO) — day-to-day implementation of the safety programme: procedures, training, audits, incident follow-up; usually an experienced MR radiographer/technologist.",
            "MR Safety Expert (MRSE) — scientific and technical advice on physics, engineering, device conditions and complex assessments; usually an MR physicist.",
          ],
        },
        {
          heading: "Jurisdiction matters",
          body: [
            "Titles, responsibilities and qualifications vary by country and institution. UK guidance has used MR Responsible Person, MR Safety Expert and MR Authorised Personnel. Completing this course does not by itself qualify anyone for a designated role; appointment follows your organisation's requirements and any external certification your jurisdiction expects.",
          ],
        },
      ],
      mistakes: ["Assuming the MRSO makes clinical risk–benefit decisions alone.", "Leaving the MRSE role unfilled for complex device cases."],
      questionIds: ["m12-q1", "m12-q2"],
      references: ["calamante-2016", "acr-manual-2024", "mhra-mri"],
    },
    {
      id: "programme",
      title: "Running the safety programme",
      minutes: 16,
      illustration: "governance",
      summary: "Committees, SOPs, training, vendors and continuous improvement.",
      objectives: [
        "Structure a multidisciplinary MR safety committee.",
        "Maintain SOPs, training and competency.",
        "Manage vendors and contractors.",
      ],
      sections: [
        {
          heading: "Governance",
          body: [
            "A multidisciplinary MR safety committee typically includes the MRMD, MRSO, MRSE, radiographers, nursing, anaesthesia, estates, procurement and risk management. It approves policy, reviews incidents and audits, tracks the risk register and oversees actions.",
          ],
        },
        {
          heading: "SOPs, training and vendors",
          body: [
            "Keep SOPs version-controlled with review dates. Training needs analysis covers every group entering Zone III/IV, with refresher intervals and competency assessments. Procurement routes new equipment through MR safety review; vendor and contractor activity is controlled by permit-to-work.",
          ],
        },
        {
          heading: "Continuous improvement",
          body: [
            "Use audit results, incident trends and drill findings to set improvement priorities; report to organisational governance; and share learning across sites.",
          ],
        },
      ],
      mistakes: ["SOPs past review date.", "Procurement buying 'MR compatible' equipment without MRSO review."],
      questionIds: ["m12-q3", "m12-q4"],
      references: ["acr-manual-2024", "mhra-mri", "calamante-2016"],
    },
  ],
};

export const m13: Module = {
  id: "m13",
  number: 13,
  title: "Advanced Clinical Case Studies",
  tagline: "Ten realistic cases, worked end to end",
  description:
    "Structured reasoning applied to ten complex cases — from an unidentified device to repeated screening failures. Each case states its assumptions and escalation points.",
  topic: "Leadership",
  depth: "core",
  furtherReading: ["acr-manual-2024", "mhra-mri", "manufacturer-ifu"],
  lessons: [
    {
      id: "case-method",
      title: "A structured method for MR safety cases",
      minutes: 12,
      illustration: "governance",
      summary: "A repeatable reasoning frame to use on every case in the library.",
      objectives: [
        "Apply a structured frame to an MR safety case.",
        "Identify when escalation to designated MR safety personnel is required.",
      ],
      sections: [
        {
          heading: "The frame",
          body: ["Work through each case in this order:"],
          bullets: [
            "Background — what do we actually know?",
            "Initial concerns — which fields and hazards are relevant?",
            "Information needed — what is unknown, and where can it be found?",
            "Risk classification — known MR Conditional with conditions met / conditions conflict / unidentified / MR Unsafe.",
            "Decision process — who decides, on what evidence?",
            "Action — and actions to avoid.",
            "Documentation, debrief and learning.",
          ],
        },
        {
          heading: "Using the case library",
          body: [
            "Open the Case Studies page to work through all ten cases. Each reveals its analysis step by step so you can commit to your own reasoning first.",
          ],
        },
      ],
      mistakes: ["Jumping to a decision before establishing what is known.", "Reducing a complex case to a universal rule."],
      questionIds: ["m13-q1", "m13-q2"],
      references: ["acr-manual-2024"],
    },
  ],
};

export const m14: Module = {
  id: "m14",
  number: 14,
  title: "Capstone Assessment",
  tagline: "Scenario-based reasoning across the whole curriculum",
  description:
    "A comprehensive final assessment covering physics, screening, implants, RF, projectiles, emergencies, QA, governance, risk assessment and leadership.",
  topic: "Leadership",
  depth: "core",
  furtherReading: ["acr-manual-2024", "mhra-mri"],
  lessons: [
    {
      id: "capstone-brief",
      title: "Capstone brief and completion criteria",
      minutes: 6,
      illustration: "governance",
      summary: "What the capstone covers and how a course completion record is earned.",
      objectives: ["Understand the capstone blueprint.", "Understand the completion criteria and what the completion record does — and does not — mean."],
      sections: [
        {
          heading: "Blueprint",
          body: [
            "The capstone draws scenario-based questions from every topic in the bank. It is timed (60 minutes) and randomised. Open it from the Examination Centre.",
          ],
        },
        {
          heading: "Completion criteria",
          body: [
            "A course completion record is issued in this demonstration when you have completed every lesson and scored at least 80% on the capstone. It records completion of this educational course only. It is not an accreditation, a licence, or a recognised MRSO credential, and does not qualify you for any designated safety role.",
          ],
          callout: {
            tone: "info",
            title: "External credentials",
            text: "Externally recognised MR safety certifications are issued by independent bodies with their own eligibility rules and examinations. This course has no affiliation with, or approval from, any such body.",
          },
        },
      ],
      mistakes: ["Treating a course completion record as a professional credential."],
      questionIds: ["m14-q1"],
      references: ["acr-manual-2024"],
    },
  ],
};
