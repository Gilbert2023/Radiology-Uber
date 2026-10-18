import type { Module } from "../types";

export const m01: Module = {
  id: "m1",
  number: 1,
  title: "Foundations of MRI Safety",
  tagline: "The four fields every MR safety decision rests on",
  description:
    "Static field B0, spatial field gradients, the RF field B1 and switched imaging gradients — what each does to people, implants and objects at 1.5 T and 3 T, and why the hazard persists when nobody is being scanned.",
  topic: "Physics",
  depth: "core",
  labIds: ["rf-sar"],
  furtherReading: ["panych-2018", "iec-60601-2-33", "acr-manual-2024"],
  lessons: [
    {
      id: "static-field",
      title: "The static magnetic field (B0), fringe fields and resonance",
      minutes: 18,
      illustration: "fringe-field",
      summary: "What B0 is, how far it reaches, and why a superconducting magnet is always on.",
      objectives: [
        "Describe B0 in tesla and gauss and relate field strength to clinical systems.",
        "Explain the fringe field and the significance of the 0.5 mT (5 gauss) contour.",
        "Calculate the Larmor frequency at 1.5 T and 3 T.",
        "Explain why the static field is a hazard when no imaging is taking place.",
      ],
      sections: [
        {
          heading: "B0: the main field",
          body: [
            "B0 is the strong, static magnetic field produced by the main magnet. Clinical systems are most commonly 1.5 T or 3 T; 1 T = 10,000 gauss, so a 3 T scanner is roughly 60,000 times the Earth's field (about 25–65 µT depending on location).",
            "In a superconducting magnet the windings are held below their critical temperature, so current circulates with essentially no resistance once the magnet has been ramped. The field does not depend on mains power, the scanner being switched on, or a patient being on the table.",
          ],
          callout: {
            tone: "danger",
            title: "The magnet is always on",
            text: "Turning off the scanner console, the lights or the building power does not remove the field of a superconducting magnet. Only a controlled ramp-down by the vendor or a quench removes it.",
          },
        },
        {
          heading: "Fringe field and the 0.5 mT line",
          body: [
            "The field does not stop at the bore. It extends into the room — and potentially through walls, floors and ceilings — as the fringe field. Active shielding (additional opposing coils) pulls the fringe field closer to the magnet, which makes the field rise very steeply over a short distance near the bore.",
            "The 0.5 mT (5 gauss) contour is widely used as the boundary beyond which pacemakers and other susceptible devices are not expected to be affected by the static field. Your site plan from the vendor shows where this and other contours fall; it is three-dimensional and can extend into adjacent rooms or floors.",
          ],
          bullets: [
            "Use the vendor siting drawings, not guesswork, to know where the 0.5 mT and higher contours lie.",
            "Check the floors above and below the magnet — access to these areas may need control too.",
            "Fringe field contours are not the same as the spatial field gradient contours used for implant conditions.",
          ],
        },
        {
          heading: "Resonance and the Larmor frequency",
          body: [
            "Protons precess at the Larmor frequency f = γ̄·B0, where γ̄ for hydrogen is approximately 42.58 MHz/T. At 1.5 T this is about 63.9 MHz; at 3 T about 127.7 MHz.",
            "This matters for safety because the RF transmit field must operate at this frequency. Higher frequency means shorter RF wavelength in tissue, more inhomogeneous B1 at 3 T, different antenna behaviour of leads and implants, and generally greater RF power deposition for an equivalent flip angle. An implant labelled for 1.5 T only must not be assumed acceptable at 3 T — or vice versa.",
          ],
        },
        {
          heading: "Why the hazard exists when imaging is not underway",
          body: [
            "Projectile and torque hazards come from B0 and its spatial gradient — both present 24 hours a day. Cleaning staff, estates workers, security officers and emergency responders enter MR suites out of hours, often without imaging staff present. A large proportion of serious projectile incidents occur when no scan is taking place.",
          ],
        },
      ],
      clinicalExample: {
        title: "Out-of-hours cleaning",
        text: "An agency cleaner is sent at 22:00 to clean the scanner room. The scanner console is off and the room is dark. They assume the machine is 'off' and push a steel floor polisher through the door. This is exactly why access control, signage and training must work independently of whether the scanner is in use.",
      },
      mistakes: [
        "Believing the scanner is 'off' when the console or room lights are off.",
        "Assuming fringe-field contours are confined to the scanner room.",
        "Treating 1.5 T and 3 T conditions as interchangeable.",
      ],
      questionIds: ["m1-q1", "m1-q2", "m1-q3"],
      references: ["panych-2018", "acr-manual-2024", "mhra-mri"],
    },
    {
      id: "gradient-force-torque",
      title: "Spatial field gradients, susceptibility, force and torque",
      minutes: 20,
      illustration: "projectile",
      summary: "Why objects are pulled, why they twist, and where in the room each effect is strongest.",
      objectives: [
        "Distinguish diamagnetic, paramagnetic and ferromagnetic materials.",
        "Explain translational force and its dependence on the spatial field gradient.",
        "Explain rotational torque and why it is greatest near isocentre.",
        "Interpret a spatial field gradient (SFG) condition on an implant label.",
      ],
      sections: [
        {
          heading: "Magnetic susceptibility",
          body: [
            "Susceptibility describes how strongly a material magnetises in an applied field. Diamagnetic materials (water, most tissue, copper) are weakly repelled; paramagnetic materials (e.g. gadolinium chelates, titanium) are weakly attracted; ferromagnetic materials (iron, nickel, cobalt and many steels) are strongly attracted and can magnetise to saturation.",
            "'Stainless steel' is not a safety category. Austenitic grades can be weakly magnetic, but work-hardening, welding and composition changes can make them significantly ferromagnetic. Material names never replace verified labelling.",
          ],
        },
        {
          heading: "Translational force",
          body: [
            "A uniform field produces no net pulling force. Force arises where the field changes with position — the spatial field gradient, measured in T/m (or G/cm). For a ferromagnetic object below saturation the force scales approximately with B × dB/dz; once saturated, it scales with dB/dz.",
            "In actively shielded magnets the field rises from a few mT to the full B0 over roughly a metre or two, so the pull can go from barely noticeable to many times the object's weight within a single step. People holding an object frequently cannot react or let go in time.",
          ],
          callout: {
            tone: "warning",
            title: "Where the gradient peaks",
            text: "The highest spatial field gradients occur near the bore entrance and are often off-axis close to the cover, not at isocentre. Implant labels specify a maximum SFG; the vendor's SFG map tells you where in the bore that is met.",
          },
        },
        {
          heading: "Rotational torque",
          body: [
            "A magnetised elongated object tries to align with the field lines. Torque depends on the field strength itself rather than its gradient, so it is greatest inside the bore. This is the mechanism of concern for some aneurysm clips, foreign bodies near delicate structures and certain implants.",
          ],
        },
        {
          heading: "Reading SFG conditions",
          body: [
            "A typical MR Conditional label states a maximum spatial field gradient (e.g. 'X T/m'). Compare it against the scanner manufacturer's published SFG data for the region of the bore the implant will pass through or sit in — not the maximum anywhere in the system unless the label requires that. When the data cannot be reconciled, escalate to the MR Safety Expert.",
          ],
        },
      ],
      clinicalExample: {
        title: "Same object, different scanner",
        text: "A small ferromagnetic item that hangs freely near one 1.5 T system may be pulled hard at the bore entrance of a compact, actively shielded 3 T system with a higher peak SFG. Force is a property of the object–scanner combination, not of the object alone.",
      },
      mistakes: [
        "Saying force is greatest at isocentre (it is torque that is greatest there).",
        "Assuming 'stainless' or 'surgical steel' means non-magnetic.",
        "Comparing an implant SFG limit with a scanner value from a different bore position without checking the label's requirement.",
      ],
      questionIds: ["m1-q4", "m1-q5", "m1-q6"],
      references: ["panych-2018", "astm-test-methods", "fda-labeling-guidance"],
    },
    {
      id: "rf-and-gradients-overview",
      title: "RF (B1) and switched gradient fields: the active hazards",
      minutes: 15,
      illustration: "gradient",
      summary: "The fields that exist only during scanning — and what they do to tissue and implants.",
      objectives: [
        "Relate RF transmission to tissue heating and implant heating.",
        "Explain why RF heating concerns increase at 3 T.",
        "Relate switched gradients to peripheral nerve stimulation and acoustic noise.",
      ],
      sections: [
        {
          heading: "The RF transmit field B1",
          body: [
            "During imaging the transmit coil produces an oscillating magnetic field (B1) at the Larmor frequency. Some of this energy is absorbed by tissue and appears as heat. The scanner estimates the specific absorption rate (SAR) and constrains sequences accordingly.",
            "For the same flip angle, RF power deposition rises steeply with frequency, so 3 T protocols often run closer to SAR limits than 1.5 T protocols. Conductive implants and leads can concentrate RF energy at their tips, independent of whole-body SAR.",
          ],
        },
        {
          heading: "Switched gradients",
          body: [
            "Gradient coils are switched rapidly to encode the image. The rate of change of the field (dB/dt) induces electric fields in the body that can stimulate peripheral nerves (tingling or twitching), and the Lorentz forces on the coils produce the loud acoustic noise of MRI. Gradient fields can also induce voltages in implanted leads.",
          ],
        },
        {
          heading: "Putting the four fields together",
          body: [
            "Every MR safety assessment asks four questions: What will B0 and its gradient do (force, torque, device function)? What will RF do (heating, device function)? What will the gradients do (stimulation, induced voltages, vibration, noise)? And what conditions does the labelling place on each?",
          ],
          bullets: [
            "B0 / SFG — present 24/7: projectiles, torque, device magnet interference.",
            "B1 (RF) — during imaging: tissue and implant heating, burns, device malfunction.",
            "Gradients — during imaging: PNS, induced voltages, acoustic noise, vibration.",
          ],
        },
      ],
      mistakes: [
        "Assuming low whole-body SAR guarantees an implant will not heat.",
        "Forgetting that gradient switching can affect implanted leads.",
      ],
      questionIds: ["m1-q7", "m1-q8"],
      references: ["panych-2018", "iec-60601-2-33"],
    },
  ],
};

export const m02: Module = {
  id: "m2",
  number: 2,
  title: "MRI Safety Zones and Access Control",
  tagline: "Design the department so the unsafe thing cannot happen",
  description:
    "The ACR four-zone framework, MR personnel levels, access control, signage, patient flow, visitors and emergency responders — plus how UK terminology maps onto it.",
  topic: "Zones & access",
  depth: "core",
  labIds: ["zones"],
  furtherReading: ["acr-manual-2024", "mhra-mri", "tjc-sea-38"],
  lessons: [
    {
      id: "four-zones",
      title: "The four-zone model and MR personnel levels",
      minutes: 16,
      illustration: "zones",
      summary: "Zone I to Zone IV, who may be where, and under whose supervision.",
      objectives: [
        "Define Zones I–IV and give examples of each.",
        "Distinguish Level 1 MR personnel, Level 2 MR personnel and non-MR personnel.",
        "Relate UK MHRA terminology to the ACR zone model.",
      ],
      sections: [
        {
          heading: "The zones",
          body: [
            "The ACR Manual on MR Safety organises an MR facility into four zones of progressively restricted access. Exact definitions and requirements come from the current edition of the Manual and your facility's approved safety programme.",
          ],
          bullets: [
            "Zone I — all areas freely accessible to the general public, outside the MR environment (e.g. main entrance, public corridors).",
            "Zone II — the interface between the public Zone I and the strictly controlled Zones III and IV. Patients are greeted and screened here and are under the supervision of MR personnel (e.g. reception, screening and changing areas).",
            "Zone III — physically restricted from the general public, where unscreened people or ferromagnetic objects could cause harm through interaction with the static field or by passing into Zone IV. Access only for MR personnel and screened people under their direct supervision (e.g. control room).",
            "Zone IV — the MR scanner room itself. Accessible only to screened individuals under the direct supervision of Level 2 MR personnel, and clearly marked as potentially hazardous.",
          ],
        },
        {
          heading: "MR personnel levels",
          body: [
            "Non-MR personnel have not completed site MR safety training. Level 1 MR personnel have completed minimal safety education to work safely in Zone III. Level 2 MR personnel have more extensive training in MR hazards, including RF and gradient effects, and are responsible for screening and for supervising others in Zone IV.",
          ],
        },
        {
          heading: "UK terminology",
          body: [
            "MHRA guidance historically describes an MR Controlled Access Area (with an MR Environment inside it defined by the 0.5 mT contour) and designates roles such as the MR Responsible Person, MR Safety Expert and MR Authorised Personnel. The 2026 fifth edition revised parts of this framework; confirm the current definitions on gov.uk. The principle is the same: graded, physically enforced restriction with trained gatekeepers.",
          ],
        },
      ],
      mistakes: [
        "Treating Zone III as 'just the control room' without physical access restriction.",
        "Assuming a Level 1 person may supervise a visitor into Zone IV.",
        "Copying zone definitions from an old poster instead of the current guidance.",
      ],
      questionIds: ["m2-q1", "m2-q2", "m2-q3"],
      references: ["acr-manual-2024", "mhra-mri"],
    },
    {
      id: "access-control",
      title: "Access control, signage, patient flow and emergency responders",
      minutes: 18,
      illustration: "zones",
      summary: "Locks, lines of sight, signs, and how to stop the arrest team at the right door.",
      objectives: [
        "Specify physical controls for Zone III and Zone IV entry.",
        "Describe appropriate signage and its limitations.",
        "Plan patient, visitor, contractor and emergency-responder movement.",
        "Describe the role of ferromagnetic detection systems as an adjunct.",
      ],
      sections: [
        {
          heading: "Physical controls first",
          body: [
            "Safety depends on engineering controls more than on signs. Zone III should be physically restricted — key-card, keypad or locked doors — with access controlled by MR personnel. The Zone IV door should be visible from the control area so staff can see who approaches it, and kept closed when not in active use.",
          ],
          bullets: [
            "Locked or access-controlled doors at the Zone III boundary.",
            "Direct line of sight from the operator position to the Zone IV door.",
            "Zone IV door closed (and where possible locked) out of hours.",
            "A visible physical barrier or alarm at the Zone IV threshold when the door must stand open.",
          ],
        },
        {
          heading: "Signage",
          body: [
            "Signs must warn that the magnet is always on and state the restrictions for implants and ferromagnetic objects. Use standardised safety symbols and keep them current. Signs inform; they do not stop someone who cannot read, is distracted or is in a hurry — which is why they supplement rather than replace locks and trained gatekeepers.",
          ],
        },
        {
          heading: "Ferromagnetic detection systems (FMDS)",
          body: [
            "Ferromagnetic-only detection systems at the Zone IV entrance can alert staff to ferromagnetic material on a person or object. They are a useful adjunct, recommended in current US guidance, but they do not replace screening, do not detect non-ferromagnetic conductive items that can cause burns, and do not tell you whether an implant is MR Conditional.",
          ],
        },
        {
          heading: "Emergency responders",
          body: [
            "Cardiac arrest teams, firefighters, police and security staff arrive in a hurry with ferromagnetic equipment. Your policy must ensure they are stopped at Zone III, that the patient is brought out to them, and that local fire services have been briefed in advance. This is one of the highest-risk interactions in any MR department.",
          ],
          callout: {
            tone: "danger",
            title: "Stop them at the door",
            text: "Designate who meets responders at the Zone III entrance during an emergency. Rehearse it in drills.",
          },
        },
      ],
      checklist: {
        title: "Zone III/IV access audit",
        items: [
          "Zone III entry physically restricted and functional",
          "Zone IV door visible from the operator position",
          "Zone IV door closed/locked out of hours; key control documented",
          "Signage present, legible and consistent with current standard symbols",
          "Out-of-hours access list current (estates, cleaning, security)",
          "Emergency-responder meeting point and role defined",
          "FMDS (if fitted) tested per manufacturer instructions",
        ],
      },
      mistakes: [
        "Relying on signage alone.",
        "Propping the Zone IV door open for workflow convenience.",
        "Assuming security or fire staff have been trained because 'they've been here before'.",
      ],
      questionIds: ["m2-q4", "m2-q5", "m2-q6"],
      references: ["acr-manual-2024", "mhra-mri", "tjc-sea-38", "greenberg-2020"],
    },
  ],
};

export const m03: Module = {
  id: "m3",
  number: 3,
  title: "Ferromagnetic Projectile Hazards",
  tagline: "From translational force to the oxygen cylinder at the door",
  description:
    "The physics of the missile effect, screening of people and equipment, commonly overlooked objects and the systems that stop them reaching Zone IV.",
  topic: "Projectiles",
  depth: "core",
  labIds: ["projectile"],
  furtherReading: ["acr-manual-2024", "tjc-sea-38", "delfino-2019"],
  lessons: [
    {
      id: "projectile-physics",
      title: "The projectile effect",
      minutes: 14,
      illustration: "projectile",
      summary: "Why a familiar object becomes a missile in the space of a single step.",
      objectives: [
        "Explain the missile effect in terms of spatial field gradient.",
        "Describe why mass and shape change the outcome.",
        "Explain why a person cannot reliably hold on to an object being pulled.",
      ],
      sections: [
        {
          heading: "Acceleration into the bore",
          body: [
            "As a ferromagnetic object moves toward the magnet, the force increases sharply. The object accelerates toward the bore and can strike anyone in its path or on the table, or pin a person against the magnet. Large objects such as cylinders, trolleys and floor polishers can cause fatal injury and may need a magnet quench to free a trapped person.",
          ],
        },
        {
          heading: "Why 'it's only small' is not reassuring",
          body: [
            "Small items — hair grips, pens, scissors, clamps — become high-speed projectiles. They can strike the eye or face, enter the bore and become wedged, or damage the scanner. The severity depends on the object, the scanner and the location, but no ferromagnetic object should be considered harmless in Zone IV.",
          ],
        },
      ],
      mistakes: [
        "Thinking a firm grip will prevent an object being pulled.",
        "Thinking the risk only exists inside the bore.",
      ],
      questionIds: ["m3-q1", "m3-q2"],
      references: ["panych-2018", "acr-manual-2024"],
    },
    {
      id: "equipment-screening",
      title: "Screening people and equipment; MR Safe, MR Conditional, MR Unsafe",
      minutes: 22,
      illustration: "labels",
      summary: "How an object earns entry to Zone IV — and why appearance never does.",
      objectives: [
        "Apply ASTM F2503 terminology to equipment.",
        "Describe an equipment labelling and inventory process.",
        "List commonly overlooked ferromagnetic objects.",
        "Describe the role and limits of handheld magnets and FMDS.",
      ],
      sections: [
        {
          heading: "Terminology",
          body: [
            "ASTM F2503 defines three categories. MR Safe: an item that poses no known hazards in any MR environment (typically non-conducting, non-metallic, non-magnetic). MR Conditional: an item demonstrated to pose no known hazards in a specified MR environment under specified conditions. MR Unsafe: an item that poses unacceptable risks in all MR environments.",
            "Older terms such as 'MR compatible' and 'MRI safe' are obsolete and ambiguous. An item labelled with them must be verified against current labelling before it enters Zone IV.",
          ],
          callout: {
            tone: "warning",
            title: "MR Conditional is not a free pass",
            text: "An MR Conditional trolley may be fine at 1.5 T up to a stated field position, but not beyond a marked line or not at 3 T. Conditions must be known and met every time.",
          },
        },
        {
          heading: "Equipment control",
          body: [
            "Maintain an inventory of every item that enters Zone IV, physically labelled with its MR status and conditions. Keep MR Unsafe equipment physically separate. Bring new equipment through a formal acceptance step with the MR Safety Officer.",
          ],
          bullets: [
            "Label every item with the correct MR status icon and any conditions.",
            "Keep MR Unsafe items out of Zone III where practical, or clearly segregated.",
            "Re-check after repair: a replaced part can change the classification.",
            "A strong handheld magnet test can identify ferromagnetic attraction, but a negative test does not establish MR Safe or MR Conditional status.",
          ],
        },
        {
          heading: "Commonly overlooked objects",
          body: [
            "Incident reports repeatedly involve the same items: oxygen cylinders and regulators, standard wheelchairs and trolleys, IV poles and pumps, monitoring equipment, cleaning equipment, tools brought by contractors, scissors and clamps in pockets, laryngoscopes and resuscitation equipment, sandbags filled with iron shot, and personal items — keys, phones, badges, hair grips and hearing aids.",
          ],
        },
      ],
      checklist: {
        title: "Before any equipment enters Zone IV",
        items: [
          "Item is on the Zone IV inventory, or has been assessed by the MRSO",
          "Physical label shows MR Safe or MR Conditional — never assumed",
          "Conditions (field strength, maximum field/position, other limits) are known and will be met",
          "Accessories (regulator, mounting, batteries) are covered by the same labelling",
          "Escorted by Level 2 MR personnel",
        ],
      },
      mistakes: [
        "Classifying an item by its appearance, colour or 'feels light'.",
        "Assuming an aluminium cylinder is MR Conditional — its valve and regulator may be ferromagnetic.",
        "Accepting 'MR compatible' on an old sticker.",
      ],
      questionIds: ["m3-q3", "m3-q4", "m3-q5", "m3-q6"],
      references: ["astm-f2503", "fda-labeling-guidance", "acr-manual-2024"],
    },
    {
      id: "projectile-prevention",
      title: "Preventing projectile incidents: systems, not heroics",
      minutes: 14,
      illustration: "zones",
      summary: "Layered controls and what to do when something has already entered the field.",
      objectives: [
        "Apply a layered-defence approach to projectile prevention.",
        "Describe the immediate response to a projectile incident.",
        "Identify when a person pinned by an object may warrant an emergency magnet stop.",
      ],
      sections: [
        {
          heading: "Layered defences",
          body: [
            "No single control is sufficient. Combine physical access control, trained gatekeepers, a single route into Zone IV, equipment labelling, FMDS where available, change into facility gowns, and a culture in which anyone can stop an entry.",
          ],
        },
        {
          heading: "When an object has already been pulled in",
          body: [
            "First consider people: is anyone injured or trapped? Stop the scan and remove the patient from the bore if this can be done safely. Do not let others enter with more ferromagnetic equipment. Do not attempt to pull large objects off the magnet — the force is extreme and the object may move unpredictably.",
            "If a person is pinned and their life or limb is threatened, removing the field by an emergency magnet stop (quench) may be necessary. This decision follows your local procedure and the manufacturer's instructions. For an object stuck to the magnet with no one trapped, contact the vendor — removal is a planned engineering task.",
          ],
          callout: {
            tone: "danger",
            title: "Local procedure governs",
            text: "This course does not replace your site's emergency procedure or the scanner manufacturer's instructions for magnet emergency stop.",
          },
        },
      ],
      mistakes: [
        "Trying to remove a large object by hand.",
        "Quenching for an object stuck to the magnet when nobody is trapped and there is no other indication.",
      ],
      questionIds: ["m3-q7", "m3-q8"],
      references: ["acr-manual-2024", "manufacturer-ifu", "local-policy"],
    },
  ],
};

export const m04: Module = {
  id: "m4",
  number: 4,
  title: "MRI Implant and Medical Device Safety",
  tagline: "Identify the exact device. Then read the conditions.",
  description:
    "A structured approach to implants and devices: exact identification, MR Conditional labelling, active versus passive devices, foreign bodies and pregnancy.",
  topic: "Implants",
  depth: "core",
  labIds: ["implant"],
  furtherReading: ["fda-labeling-guidance", "iso-ts-10974", "hrs-2017", "mrisafety-com", "manufacturer-ifu"],
  lessons: [
    {
      id: "device-identification",
      title: "Identifying the device and reading MR Conditional labelling",
      minutes: 22,
      illustration: "labels",
      summary: "The single most important step: exactly what is it, and what do its conditions say?",
      objectives: [
        "List the information sources used to identify an implant.",
        "Interpret each typical element of an MR Conditional label.",
        "Distinguish an MR Conditional device from an unidentified or unverified device.",
      ],
      sections: [
        {
          heading: "Identification first",
          body: [
            "Risk assessment begins with the exact manufacturer, model and, for active systems, every component (generator, leads, adaptors, abandoned leads). Sources include implant cards, operation notes, implant registers, the implanting centre, the patient's specialist team, and imaging such as radiographs to confirm presence and configuration.",
            "A generic description — 'a pacemaker', 'a clip from the 1990s', 'a titanium plate' — is not an identification. Until the device is identified and its labelling verified, it is an unidentified device and must be escalated under the local policy.",
          ],
        },
        {
          heading: "Elements of MR Conditional labelling",
          body: ["Labelling varies, but commonly specifies:"],
          bullets: [
            "Static field strength — e.g. 1.5 T only, or 1.5 T and 3 T; and sometimes magnet type (cylindrical bore).",
            "Maximum spatial field gradient (T/m or G/cm).",
            "RF transmit coil type — e.g. body coil allowed, or transmit/receive head coil only.",
            "RF limits — whole-body or head SAR, or B1+rms, and operating mode (Normal Operating Mode).",
            "Gradient limits — maximum slew rate or dB/dt per axis.",
            "Scan duration limits and cooling time between sequences.",
            "Landmark or exclusion zones for positioning.",
            "Device programming, patient monitoring and post-scan checks.",
            "Expected temperature rise and image artefact extent.",
          ],
          callout: {
            tone: "info",
            title: "Use the current label for that exact model",
            text: "Conditions are updated over time. Use the manufacturer's current labelling for the exact model, from the manufacturer's website or MR-specific resources, and confirm it is current. Secondary databases are a starting point only.",
          },
        },
        {
          heading: "Common traps",
          body: [
            "Never assume a device is safe because it is old, because the patient was scanned before, because similar devices are commonly scanned, or because it is said to be titanium. Previous scans may have been at a different field strength, with a different coil or protocol, or simply been lucky.",
          ],
        },
      ],
      checklist: {
        title: "Implant verification",
        items: [
          "Exact manufacturer and model confirmed from a primary source",
          "All components identified (including leads and abandoned hardware)",
          "Current MR labelling obtained for that model",
          "Each condition compared with scanner, coil and protocol",
          "Programming/monitoring arrangements in place where required",
          "Decision and evidence documented; escalation recorded where needed",
        ],
      },
      mistakes: [
        "Using a secondary website as the authority instead of current manufacturer labelling.",
        "Ignoring abandoned leads.",
        "Assuming 'was scanned last year' means 'safe today'.",
      ],
      questionIds: ["m4-q1", "m4-q2", "m4-q3", "m4-q4"],
      references: ["fda-labeling-guidance", "astm-f2503", "manufacturer-ifu", "mrisafety-com"],
    },
    {
      id: "active-implants",
      title: "Active implants: CIEDs, neurostimulators, cochlear implants and pumps",
      minutes: 24,
      illustration: "rf-loop",
      summary: "Devices with batteries, electronics and leads — where conditions are most complex.",
      objectives: [
        "Describe the hazards specific to active implantable devices.",
        "Outline a pathway for scanning a patient with an MR Conditional pacemaker or ICD system.",
        "Recognise when a 'non-conditional' device scan becomes a physician-level, documented risk–benefit decision.",
      ],
      sections: [
        {
          heading: "Hazards of active devices",
          body: [
            "Active devices can be affected by all three fields: B0 can activate magnet-sensitive switches or alter function; RF can heat lead tips and induce currents; gradients can induce voltages that cause unintended stimulation or sensing. Device damage, reset, inappropriate pacing or therapy, and tissue heating at electrodes are all possible.",
          ],
        },
        {
          heading: "Cardiac implantable electronic devices (CIEDs)",
          body: [
            "Many modern pacemaker and ICD systems are MR Conditional as a system — a specific generator with specific leads. A typical pathway: confirm every component; obtain the system's conditions; arrange device programming into the MR mode by appropriately trained staff; monitor the patient with MR Conditional equipment throughout; keep resuscitation capability available outside Zone IV; restore and check the device afterwards.",
            "Expert consensus (e.g. the 2017 HRS statement) describes circumstances in which devices without MR Conditional labelling may be scanned at experienced centres under strict protocols. That is an individual, physician-led risk–benefit decision under institutional policy — not a routine pathway.",
          ],
        },
        {
          heading: "Neurostimulators",
          body: [
            "Deep brain, spinal cord, vagus nerve and sacral stimulators often carry highly specific conditions: specific coils, B1+rms limits, device modes, impedance checks and positioning restrictions. Some systems are only conditional in certain configurations. The manufacturer's MRI guidelines for that system are essential.",
          ],
        },
        {
          heading: "Cochlear implants and infusion pumps",
          body: [
            "Cochlear implants contain an internal magnet; depending on the model, conditions may require magnet removal, specific head bandaging, field-strength limits or specific orientation. Pain, magnet dislodgement or demagnetisation are reported risks. Implanted infusion pumps may temporarily stop during MRI; conditions may require checking the pump afterwards. External pumps and monitors must be MR Conditional for the setting or kept out of Zone IV.",
          ],
        },
      ],
      mistakes: [
        "Treating a generator as MR Conditional without confirming the leads.",
        "Scanning without the device programmed as the conditions require.",
        "Using a standard monitoring system in Zone IV.",
      ],
      questionIds: ["m4-q5", "m4-q6", "m4-q7"],
      references: ["hrs-2017", "iso-ts-10974", "manufacturer-ifu", "acr-manual-2024"],
    },
    {
      id: "passive-and-foreign-bodies",
      title: "Passive implants, foreign bodies and pregnancy",
      minutes: 22,
      illustration: "screening",
      summary: "Clips, stents, valves, orthopaedic hardware, orbital metal, shrapnel — and screening in pregnancy.",
      objectives: [
        "Apply identification principles to aneurysm clips and other passive implants.",
        "Describe a screening approach to suspected orbital metallic foreign bodies.",
        "Outline the safety considerations for scanning in pregnancy.",
      ],
      sections: [
        {
          heading: "Aneurysm clips",
          body: [
            "Ferromagnetic aneurysm clips have caused fatal injury from torque. An intracranial clip must be identified and its labelling verified before scanning. Undocumented clips require escalation; age alone does not tell you whether a clip is safe or unsafe.",
          ],
        },
        {
          heading: "Orthopaedic hardware, stents and valves",
          body: [
            "Most contemporary orthopaedic, vascular and valve implants are MR Conditional, but conditions differ, and external fixation frames, large hardware and certain older devices may have heating or force concerns. Identification and labelling still govern, and RF heating of large or looped hardware must be considered.",
          ],
        },
        {
          heading: "Orbital and other foreign bodies",
          body: [
            "A history of metalworking, grinding or penetrating eye injury raises concern for intra-orbital ferromagnetic fragments, which can move and cause blindness. Local policy typically requires screening — often by radiograph or review of prior CT — before MRI when the history is positive. A previous uneventful MRI does not exclude a fragment. Bullets and shrapnel vary widely in composition; location relative to vital structures and the risk–benefit assessment are critical.",
          ],
        },
        {
          heading: "Pregnancy",
          body: [
            "Pregnancy screening should follow your facility's policy. Current US guidance supports MRI at any stage of pregnancy when the information is needed and cannot be obtained otherwise, with the decision documented by the responsible radiologist; gadolinium-based contrast is generally avoided unless essential. Scanning is typically kept within Normal Operating Mode. Policies differ by jurisdiction — confirm locally.",
          ],
        },
      ],
      mistakes: [
        "Assuming 'all modern clips are titanium'.",
        "Accepting 'it came out years ago' without evidence for an orbital foreign body.",
        "Delaying a clinically essential MRI in pregnancy solely because of pregnancy, without a documented risk–benefit discussion.",
      ],
      questionIds: ["m4-q8", "m4-q9", "m4-q10"],
      references: ["acr-manual-2024", "kanal-2013", "manufacturer-ifu", "mhra-mri"],
    },
  ],
};
