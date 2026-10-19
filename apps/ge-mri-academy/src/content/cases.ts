import type { ClinicalCase } from "./types";

const o = (text: string, correct: boolean, feedback: string) => ({ text, correct, feedback });

export const CASES: ClinicalCase[] = [
  {
    id: "acute-stroke", title: "Acute neurological deficit", difficulty: "Beginner", region: "Neuro", protocolId: "stroke",
    presentation: "A 68-year-old presents with sudden right-sided weakness and expressive dysphasia, onset 3 hours ago. CT has excluded haemorrhage.",
    request: "Urgent MRI brain — ?acute infarct, ?stroke mimic.",
    safety: "Patient dysphasic; next of kin reports a 'heart operation' 10 years ago. Screening must not be skipped despite urgency.",
    steps: [
      { prompt: "What is your first priority before entering the scan room?", options: [o("Complete MRI safety screening, using collateral history and records for the cardiac history", true, "Correct. Urgency never removes the need to screen. A sternotomy with wires is commonly MR Conditional/safe but valves, pacemakers or leads must be identified."), o("Scan immediately — CT is already done", false, "Unsafe. CT does not exclude MR-relevant implants."), o("Ask the patient to confirm no implants", false, "The patient is dysphasic — self-report alone is unreliable.")] },
      { prompt: "Which sequence should be acquired first after the localiser?", info: "Records confirm sternotomy wires only (no devices). Patient is restless.", options: [o("Axial DWI with ADC", true, "DWI is fastest and highest-yield for acute ischaemia — acquire it first in case the patient cannot continue."), o("Sagittal T1", false, "Low yield for the clinical question."), o("3D TOF MRA", false, "Useful later if requested, but DWI answers the primary question.")] },
      { prompt: "The DWI shows a bright area; what must you check?", options: [o("ADC map: low ADC confirms restricted diffusion", true, "Correct — bright DWI with high ADC is T2 shine-through, not restriction."), o("Nothing — bright DWI = infarct", false, "T2 shine-through can mimic restriction.")] },
      { prompt: "The patient moves during FLAIR. Best response?", options: [o("Repeat with PROPELLER FLAIR if available, after reassuring the patient", true, "PROPELLER corrects in-plane motion and reduces ghosting."), o("Increase NEX to 4", false, "This doubles time and increases motion opportunity."), o("Abandon the study", false, "Core information may still be obtainable.")] },
      { prompt: "Should vascular imaging be added?", options: [o("If requested by the stroke team or protocol, and CTA has not already answered it", true, "Vascular imaging depends on pathway; communicate with the team."), o("Always, regardless of CTA", false, "Duplicating CTA wastes time in a time-critical pathway.")] },
    ],
    challenge: { description: "Mild motion ghosting on axial FLAIR; DWI distortion near the temporal poles.", image: "motion" },
    expert: "In acute stroke the protocol is ordered by diagnostic yield: DWI/ADC → T2*/SWI → FLAIR → T2 → MRA if needed. Speed matters, but safety screening is non-negotiable. Interpretation (e.g. DWI–FLAIR mismatch) remains the radiologist's responsibility.",
    qa: ["DWI/ADC both present and diagnostic", "Haemorrhage-sensitive sequence acquired", "Whole brain coverage", "Urgent findings communicated per pathway"],
  },
  {
    id: "ms", title: "Suspected multiple sclerosis", difficulty: "Intermediate", region: "Neuro", protocolId: "ms",
    presentation: "A 29-year-old with an episode of optic neuritis and sensory symptoms.", request: "MRI brain ± cord — ?demyelination.", safety: "No implants. Normal renal function. Not pregnant.",
    steps: [
      { prompt: "Which sequence best demonstrates juxtacortical and periventricular lesions with reformats?", options: [o("3D FLAIR", true, "Thin contiguous sections and reformats are recommended in consensus guidance."), o("2D T1 SE", false, "Not the primary lesion detection sequence.")] },
      { prompt: "Infratentorial lesions are best evaluated on…", options: [o("T2/PD-weighted imaging in addition to FLAIR", true, "FLAIR is less sensitive in the posterior fossa."), o("FLAIR alone", false, "FLAIR can miss infratentorial lesions and has CSF-flow artefacts.")] },
      { prompt: "Is gadolinium indicated?", options: [o("At diagnosis it can show dissemination in time; follow local and consensus guidance", true, "Correct — the decision is made with the radiologist per guidance."), o("Never", false, "Too absolute."), o("Always at every follow-up", false, "Consensus guidance reduces routine contrast use in monitoring.")] },
    ],
    challenge: { description: "Bright prepontine cistern signal on 2D FLAIR.", image: "FLAIR" },
    expert: "Choose sequences that detect lesions in each anatomical location relevant to dissemination-in-space criteria; avoid over-calling posterior fossa FLAIR artefact.",
    qa: ["3D FLAIR without motion", "Sagittal coverage of corpus callosum", "Consistent geometry for follow-up"],
  },
  {
    id: "knee", title: "Knee ligament injury", difficulty: "Beginner", region: "MSK", protocolId: "knee",
    presentation: "A 24-year-old footballer twisted the knee; immediate swelling; positive Lachman.", request: "MRI knee — ?ACL tear, ?meniscal injury.", safety: "No implants.",
    steps: [
      { prompt: "How should sagittal slices be planned for the ACL?", options: [o("Oblique, parallel to the medial border of the lateral femoral condyle on the axial", true, "This aligns with the ACL course."), o("True sagittal regardless of anatomy", false, "May cut the ACL obliquely.")] },
      { prompt: "Best fluid-sensitive sequence for bone bruise and meniscal tear?", options: [o("PD FS FSE with moderate ETL", true, "Short–intermediate TE preserves meniscal signal detail; FS shows oedema."), o("T2 FSE with ETL 24", false, "Long ETL blurs menisci.")] },
      { prompt: "Images are blurred in the PD FS. What do you change first?", options: [o("Check motion, then reduce ETL / shorten echo spacing", true, "Blur in FSE is commonly echo-train related."), o("Increase NEX", false, "Doesn't address blur.")] },
    ],
    challenge: { description: "Popliteal artery pulsation ghost crossing the menisci.", image: "motion" },
    expert: "Plan oblique to anatomy, keep ETL moderate for PD imaging, and swap phase direction if pulsation ghosts cross the menisci.",
    qa: ["ACL visualised in continuity or tear demonstrated", "Uniform fat suppression", "Menisci sharp"],
  },
  {
    id: "liver", title: "Liver lesion characterisation", difficulty: "Advanced", region: "Abdomen", protocolId: "liver",
    presentation: "A 52-year-old with an incidental 2 cm liver lesion on ultrasound.", request: "MRI liver with contrast — characterise.", safety: "eGFR acceptable per local policy; no previous contrast reaction; can hold breath ~15 s.",
    steps: [
      { prompt: "How should arterial phase timing be determined?", options: [o("Bolus tracking or test bolus", true, "Circulation times vary — fixed delays risk mistimed arterial phase."), o("Fixed 20 s after injection for everyone", false, "There is no universal delay.")] },
      { prompt: "Patient can only hold breath 12 s. Best adjustment?", options: [o("Increase ARC factor/partial Fourier and reduce slices/coverage minimally", true, "Shortens breath-hold while retaining coverage of the lesion."), o("Increase NEX", false, "Lengthens breath-hold.")] },
      { prompt: "Which sequence detects intracellular fat?", options: [o("In-phase/opposed-phase GRE", true, "Signal loss on opposed phase indicates microscopic fat."), o("STIR", false, "STIR nulls macroscopic fat by T1, not useful here.")] },
    ],
    challenge: { description: "Arterial phase captured too late (portal venous).", image: "T1C" },
    expert: "Liver MRI relies on reliable dynamic timing and breath-hold management. Tailor breath-hold length to the patient.",
    qa: ["All dynamic phases acquired and labelled", "Arterial phase timing appropriate", "DWI with ADC"],
  },
  {
    id: "cord-compression", title: "Suspected spinal cord compression", difficulty: "Intermediate", region: "Spine", protocolId: "cord-compression",
    presentation: "A 70-year-old with known prostate cancer, new back pain and leg weakness.", request: "Urgent whole-spine MRI — ?MSCC.", safety: "Pain limits lying flat for long.",
    steps: [
      { prompt: "Which approach first?", options: [o("Sagittal T1 and T2 of the whole spine, then targeted axials", true, "Whole-spine sagittal identifies all levels; axials quantify compression."), o("Axial lumbar only", false, "Misses thoracic/cervical disease.")] },
      { prompt: "How do you ensure correct levels?", options: [o("Overlapping stations with a counting reference (C2)", true, "Mis-counting is a serious error.")  , o("Count from the sacrum on the thoracic station alone", false, "Unreliable.")] },
    ],
    challenge: { description: "Patient in pain — motion on second station.", image: "motion" },
    expert: "Prioritise sagittal coverage; inform the radiologist/clinical team immediately when compression is seen per local MSCC pathway.",
    qa: ["Whole spine covered", "Levels countable", "Urgent result communicated"],
  },
  {
    id: "cvst", title: "Cerebral venous sinus thrombosis", difficulty: "Advanced", region: "Neuro", protocolId: "cvst",
    presentation: "A 32-year-old, 2 weeks postpartum, with worsening headache and a seizure.", request: "MRI brain + MRV — ?CVST.", safety: "Postpartum; breastfeeding (follow local contrast guidance).",
    steps: [
      { prompt: "Which sequence supports thrombus detection beyond TOF MRV?", options: [o("SWI/T2* (blooming thrombus) and T1", true, "Multiple techniques reduce ambiguity."), o("DWI alone", false, "Insufficient.")] },
      { prompt: "Left transverse sinus absent on TOF MRV. What next?", options: [o("Consider hypoplasia vs thrombus; obtain PC or CE-MRV per radiologist", true, "Hypoplasia is a common mimic."), o("Report as thrombosis", false, "Diagnosis is the radiologist's and needs supporting evidence.")] },
    ],
    challenge: { description: "Flow gap at transverse–sigmoid junction.", image: "GRE" },
    expert: "Combine parenchymal, susceptibility and flow-independent venous imaging; escalate urgently.",
    qa: ["Venous sinuses covered", "Alternative MRV technique when ambiguous", "Urgent communication"],
  },
  {
    id: "mrcp", title: "MRCP for suspected biliary obstruction", difficulty: "Intermediate", region: "Abdomen", protocolId: "mrcp",
    presentation: "A 60-year-old with obstructive LFTs and dilated ducts on ultrasound.", request: "MRCP — ?CBD stone.", safety: "Cholecystectomy clips.",
    steps: [
      { prompt: "Preparation?", options: [o("Fasting per local policy", true, "Reduces bowel fluid/motion, distends gallbladder."), o("Drink 1 L water before", false, "Bright bowel fluid obscures ducts.")] },
      { prompt: "Surgical clips cause a signal void near the CHD. Interpretation?", options: [o("Susceptibility artefact can mimic a stricture/filling defect — review source images and SSFSE", true, "Compare with sequences less sensitive to susceptibility."), o("Definite stricture", false, "Could be artefact.")] },
    ],
    challenge: { description: "Respiratory-triggered 3D MRCP blurred due to irregular breathing.", image: "motion" },
    expert: "MRCP depends on preparation and respiratory compensation; always review source images, not just MIPs.",
    qa: ["MIP and source images", "Complete ductal coverage", "Motion-free 3D"],
  },
  {
    id: "prostate", title: "Prostate MRI", difficulty: "Advanced", region: "Pelvis", protocolId: "prostate",
    presentation: "A 64-year-old with raised PSA.", request: "mpMRI prostate (PI-RADS).", safety: "Bilateral hip replacements.",
    steps: [
      { prompt: "Hip prostheses distort DWI. Best options?", options: [o("Optimise shim, reduce echo spacing (ASSET), consider reduced-FOV DWI if available, swap phase direction", true, "Reduces EPI distortion; confirm implant conditions first."), o("Remove DWI", false, "DWI is the dominant PZ sequence.")] },
      { prompt: "Which sequence is dominant for transition-zone scoring?", options: [o("T2-weighted", true, "Per PI-RADS v2.1."), o("DCE", false, "DCE is adjunct for PZ only.")] },
    ],
    challenge: { description: "Rectal gas susceptibility on DWI.", image: "DWI" },
    expert: "Follow PI-RADS technical specifications; preparation (rectal gas) and EPI distortion management are key.",
    qa: ["Small FOV T2 in 3 planes", "High b-value DWI diagnostic", "Implant conditions verified and documented"],
  },
  {
    id: "rotator-cuff", title: "Shoulder rotator cuff injury", difficulty: "Beginner", region: "MSK", protocolId: "shoulder",
    presentation: "A 55-year-old with shoulder pain and weakness on abduction.", request: "MRI shoulder — ?cuff tear.", safety: "No implants.",
    steps: [
      { prompt: "Oblique coronal planning?", options: [o("Parallel to the supraspinatus tendon on axial", true, "Shows the tendon along its length."), o("Parallel to the table", false, "May miss tendon course.")] },
      { prompt: "Intermediate signal in supraspinatus on PD but normal on T2. Consider…", options: [o("Magic-angle effect", true, "Occurs on short-TE sequences when fibres are ~55° to B0."), o("Definite tendinopathy", false, "Correlate with long-TE images.")] },
    ],
    challenge: { description: "Fat suppression failure in the axilla.", image: "T2FS" },
    expert: "Accurate oblique planning and knowledge of magic-angle effect prevent false positives.",
    qa: ["Tendon visualised along length", "Uniform fat sat", "Coverage of AC joint"],
  },
];
