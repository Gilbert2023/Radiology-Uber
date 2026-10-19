import type { Question } from "./types";

let n = 0;
const q = (topic: Question["topic"], type: Question["type"], difficulty: Question["difficulty"], stem: string, options: string[], answer: number, explanation: string): Question => ({ id: `q${++n}`, topic, type, difficulty, stem, options, answer, explanation });

export const QUESTIONS: Question[] = [
  // Physics
  q("Physics", "MCQ", 1, "What is the approximate Larmor frequency of hydrogen at 1.5 T?", ["42.6 MHz", "63.9 MHz", "127.7 MHz", "15 MHz"], 1, "f = γ̄B0 = 42.58 MHz/T × 1.5 T ≈ 63.9 MHz."),
  q("Physics", "MCQ", 1, "Which parameter primarily controls T1 weighting in a spin echo sequence?", ["TE", "TR", "NEX", "Bandwidth"], 1, "TR controls longitudinal recovery; short TR produces T1 weighting."),
  q("Physics", "MCQ", 2, "Doubling NEX changes SNR by approximately:", ["×2", "×1.41", "×0.71", "No change"], 1, "SNR ∝ √NEX."),
  q("Physics", "MCQ", 2, "Halving the receiver bandwidth (all else equal) changes SNR by approximately:", ["×0.71", "×1.41", "×2", "×0.5"], 1, "SNR ∝ 1/√BW → halving BW gives √2 ≈ 1.41."),
  q("Physics", "MCQ", 2, "At 1.5 T the fat–water frequency difference is approximately:", ["110 Hz", "220 Hz", "440 Hz", "3.5 Hz"], 1, "3.5 ppm × 63.9 MHz ≈ 224 Hz."),
  q("Physics", "MCQ", 2, "The centre of k-space mainly determines:", ["Edge detail", "Image contrast and overall signal", "Slice thickness", "Chemical shift"], 1, "Low spatial frequencies (centre) carry contrast/signal; periphery carries detail."),
  q("Physics", "MCQ", 3, "For TR ≫ T1, the inversion time that nulls a tissue is approximately:", ["T1", "0.69 × T1", "2 × T1", "T1/2"], 1, "Mz = M0(1 − 2e^(−TI/T1)) = 0 → TI = T1 ln 2 ≈ 0.69 T1."),
  q("Physics", "MCQ", 2, "Gradient echo images are weighted by T2* rather than T2 because:", ["There is no 180° refocusing pulse", "TR is short", "Flip angle is low", "Bandwidth is wide"], 0, "Without a 180° pulse, static field inhomogeneity dephasing is not reversed."),
  q("Physics", "MCQ", 3, "Parallel imaging with factor R and g-factor g reduces SNR by:", ["R", "g√R", "√g", "R/g"], 1, "SNR_accel = SNR_full/(g√R)."),
  q("Physics", "MCQ", 2, "SAR scales approximately with:", ["B0", "B0² and flip angle²", "TE", "Bandwidth"], 1, "SAR ∝ B0² × (flip angle)² × duty cycle (for a given pulse)."),
  // Parameters
  q("Parameters", "Parameter", 1, "FOV 24 cm, frequency matrix 320. Frequency pixel size?", ["0.5 mm", "0.75 mm", "1.0 mm", "1.33 mm"], 1, "240 mm / 320 = 0.75 mm."),
  q("Parameters", "Parameter", 2, "GE displays bandwidth as ±31.25 kHz with 256 frequency samples. Bandwidth per pixel?", ["122 Hz", "244 Hz", "62.5 Hz", "31 Hz"], 1, "62 500 Hz / 256 ≈ 244 Hz/pixel."),
  q("Parameters", "Parameter", 2, "Using the previous answer, the fat–water shift at 1.5 T is approximately:", ["0.25 pixel", "0.9 pixel", "2 pixels", "4 pixels"], 1, "~220 Hz / 244 Hz ≈ 0.9 pixel."),
  q("Parameters", "Parameter", 2, "Changing Phase FOV from 1.0 to 0.75 at constant pixel size:", ["Increases time 25%", "Reduces time ~25% and SNR to ~87%", "Changes contrast", "Has no effect"], 1, "Fewer phase lines: time ×0.75, SNR ×√0.75 ≈ 0.87."),
  q("Parameters", "Parameter", 2, "Increasing ETL from 8 to 16 in FSE (all else equal) will most likely:", ["Double scan time", "Halve scan time and increase blurring", "Improve sharpness", "Reduce SAR"], 1, "Time ∝ 1/ETL; longer trains blur and raise SAR."),
  q("Parameters", "Parameter", 1, "Slice thickness reduced from 5 mm to 3 mm. SNR becomes approximately:", ["60%", "77%", "120%", "Unchanged"], 0, "SNR ∝ thickness: 3/5 = 0.6."),
  q("Parameters", "Parameter", 2, "Why might Auto TR alter T1-weighted contrast?", ["It changes TE", "It lengthens TR when slices are added", "It disables fat sat", "It changes FOV"], 1, "Auto TR increases TR to fit more slices, reducing T1 weighting."),
  q("Parameters", "Parameter", 2, "What is the main purpose of No Phase Wrap?", ["Reduce chemical shift", "Prevent aliasing in the phase direction", "Reduce SAR", "Improve fat sat"], 1, "Oversamples phase direction to prevent wrap."),
  q("Parameters", "Parameter", 3, "Narrowing bandwidth in FSE for SNR may unexpectedly:", ["Reduce echo spacing", "Increase echo spacing and blurring", "Reduce chemical shift", "Reduce minimum TE"], 1, "Longer readout → longer echo spacing → more blur, longer min TE."),
  q("Parameters", "Parameter", 2, "Fast Recovery in FRFSE primarily:", ["Shortens TE", "Returns residual transverse magnetisation to the longitudinal axis, brightening fluid at shorter TR", "Suppresses fat", "Corrects motion"], 1, "Flip-back pulse accelerates recovery of long-T2 tissues."),
  q("Parameters", "Parameter", 2, "Flow compensation:", ["Reduces SAR", "Nulls first gradient moment, reducing flow ghosting", "Shortens TE", "Increases slices"], 1, "Gradient moment nulling; costs TE/slices."),
  q("Parameters", "Parameter", 1, "ZIP512 reconstruction:", ["Doubles acquired resolution", "Interpolates display matrix without adding acquired resolution", "Halves scan time", "Reduces SNR by half"], 1, "Zero-filling interpolation."),
  // Sequences
  q("Sequences", "Sequence selection", 1, "Best sequence to null CSF while keeping T2 weighting:", ["STIR", "FLAIR", "SPGR", "TOF"], 1, "Long TI nulls CSF."),
  q("Sequences", "Sequence selection", 2, "Post-contrast fat suppression should NOT use:", ["CHESS", "Dixon", "STIR", "Water excitation"], 2, "STIR nulls any short-T1 tissue including enhancing tissue."),
  q("Sequences", "Sequence selection", 2, "Most motion-robust T2 option in an uncooperative patient:", ["2D SE T2", "SSFSE or PROPELLER", "3D FSE", "Dual echo"], 1, "Single-shot freezes motion; PROPELLER corrects in-plane motion."),
  q("Sequences", "MCQ", 2, "Bright on DWI and bright on ADC suggests:", ["Restricted diffusion", "T2 shine-through", "Haemorrhage", "Fat"], 1, "True restriction is low on ADC."),
  q("Sequences", "MCQ", 2, "TOF MRA appears bright in subacute haematoma because:", ["Flow", "Short T1 of methaemoglobin", "Susceptibility", "Diffusion"], 1, "T1 shine-through of short-T1 material."),
  q("Sequences", "MCQ", 2, "Opposed-phase TE at 1.5 T is approximately:", ["1.1 ms", "2.3 ms", "4.6 ms", "9.2 ms"], 1, "Half the fat–water cycle (~4.5 ms) at 1.5 T."),
  q("Sequences", "MCQ", 3, "In PC MRA, signal aliasing occurs when:", ["Velocity < VENC", "Velocity > VENC", "TR too long", "Bandwidth too wide"], 1, "Phase wraps beyond ±π."),
  q("Sequences", "MCQ", 2, "Balanced SSFP contrast depends on:", ["T1 only", "T2/T1 ratio", "PD only", "Diffusion"], 1, "bSSFP signal ∝ √(T2/T1) approximately."),
  q("Sequences", "MCQ", 2, "GE's 3D FSE with variable refocusing flip angles is marketed as:", ["BRAVO", "CUBE", "LAVA", "FIESTA"], 1, "CUBE (licence-dependent)."),
  // Protocols
  q("Protocols", "Scenario", 1, "Acute stroke: first diagnostic sequence after localiser?", ["Sag T1", "DWI/ADC", "3D T1 post-contrast", "MRV"], 1, "Highest yield and fastest."),
  q("Protocols", "Scenario", 2, "Epilepsy: coronal T2 should be planned:", ["Parallel to AC–PC", "Perpendicular to hippocampal long axis", "Parallel to the table", "Along the optic nerve"], 1, "Optimal hippocampal assessment."),
  q("Protocols", "Scenario", 2, "Liver dynamic arterial phase timing is best determined by:", ["Fixed 25 s delay", "Bolus tracking or test bolus", "Patient weight", "Coil type"], 1, "Individual circulation times vary."),
  q("Protocols", "Scenario", 2, "Rectal cancer local staging relies primarily on:", ["Post-contrast T1", "High-resolution T2 perpendicular to tumour", "STIR", "MRCP"], 1, "ESGAR guidance."),
  q("Protocols", "Scenario", 2, "Prostate PI-RADS: dominant sequence for peripheral zone?", ["T2", "DWI", "DCE", "T1"], 1, "DWI dominant in PZ; T2 dominant in TZ."),
  q("Protocols", "Scenario", 2, "Suspected MSCC: initial imaging strategy?", ["Lumbar axials only", "Whole-spine sagittal T1/T2, then targeted axials", "Brain first", "Contrast-only"], 1, "Covers all levels."),
  q("Protocols", "Scenario", 3, "Patient cannot receive gadolinium for suspected CVST. Best MRV alternative?", ["2D TOF or PC MRV plus SWI/T2*", "No imaging", "CE-MRV anyway", "DWI only"], 0, "Non-contrast MRV supported by susceptibility imaging."),
  q("Protocols", "Scenario", 2, "SIJ inflammation (active sacroiliitis) is best shown on:", ["T1", "STIR", "GRE", "DWI only"], 1, "Bone marrow oedema on STIR/T2 FS."),
  // Artefacts / troubleshooting
  q("Artefacts", "Troubleshooting", 1, "Ghosts of the eyes across the brain occur in the:", ["Frequency direction", "Phase direction", "Slice direction", "Random directions"], 1, "Motion ghosts propagate in phase direction."),
  q("Artefacts", "Troubleshooting", 2, "Thin line in cervical cord on sagittal T2 that disappears when phase matrix increases:", ["Syrinx", "Truncation artefact", "Chemical shift", "Susceptibility"], 1, "Gibbs ringing reduces with more phase lines."),
  q("Artefacts", "Troubleshooting", 2, "Patchy fat suppression at the neck base. Best robust alternative without contrast?", ["CHESS with more NEX", "STIR or Dixon", "Narrower bandwidth", "Higher ETL"], 1, "STIR is B0-robust; Dixon also robust."),
  q("Artefacts", "Troubleshooting", 2, "To reduce susceptibility around a spinal fixation:", ["Use GRE", "Use FSE with wider bandwidth", "Narrow bandwidth", "Long TE GRE"], 1, "FSE + wide BW reduce susceptibility artefact."),
  q("Artefacts", "Troubleshooting", 2, "Arm wraps over the liver. Which fix is NOT appropriate?", ["No Phase Wrap", "Increase phase FOV", "Arms above head", "Reduce phase FOV"], 3, "Reducing phase FOV worsens wrap."),
  q("Artefacts", "Troubleshooting", 3, "A lesion persists after swapping phase and frequency directions. This suggests:", ["Artefact", "True structure/pathology (needs radiologist review)", "Coil failure", "Flow"], 1, "Artefacts move with encoding direction; pathology does not."),
  // Safety
  q("Safety", "Scenario", 1, "A sequence is blocked by a SAR limit. Correct action?", ["Override the limit", "Reduce RF demand (longer TR, fewer slices, lower refocus angle)", "Ignore and re-run", "Switch off monitoring"], 1, "Never bypass safety controls."),
  q("Safety", "Scenario", 1, "Patient reports an implant but has no documentation. You should:", ["Scan at low SAR", "Not scan until the implant and its conditions are verified per local policy", "Scan feet-first", "Ask the patient to sign a waiver"], 1, "Verification is mandatory."),
  q("Safety", "Scenario", 2, "To reduce RF burn risk with ECG leads:", ["Coil the leads", "Route straight, avoid loops and skin-to-skin contact; use MR-conditional leads", "Use any leads", "Tape leads across the chest in loops"], 1, "Loops and conductive contact increase heating risk."),
  q("Safety", "MCQ", 2, "B1+rms is increasingly used in implant labelling because:", ["It is easier to say", "It does not depend on patient-mass SAR models", "It measures B0", "It replaces screening"], 1, "B1+rms is a direct transmit-field metric."),
  q("Safety", "MCQ", 1, "Hearing protection is required for:", ["Only long scans", "All patients", "Only children", "Only 3 T"], 1, "Acoustic noise can exceed safe levels; protect everyone."),
  q("Safety", "MCQ", 2, "In a quench with patient in the scanner, the priority is:", ["Restart the magnet", "Evacuate the patient and staff from the room following local emergency procedures", "Call service before moving patient", "Take images"], 1, "People first; follow local procedure."),
];
