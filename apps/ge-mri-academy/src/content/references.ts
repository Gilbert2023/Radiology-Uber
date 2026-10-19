import type { Reference } from "./types";

/**
 * Reference list. Only real, published sources are listed. Where a guideline is
 * revised periodically, learners are directed to check the current revision.
 * GE HealthCare documentation is listed as the authority for any product-specific
 * detail; it has NOT been reproduced here and must be consulted directly.
 */
export const REFERENCES: Reference[] = [
  // Textbooks
  { id: "mcrobbie", kind: "Textbook", citation: "McRobbie DW, Moore EA, Graves MJ, Prince MR. MRI from Picture to Proton. 3rd ed. Cambridge: Cambridge University Press; 2017." },
  { id: "westbrook", kind: "Textbook", citation: "Westbrook C, Talbot J. MRI in Practice. 5th ed. Chichester: Wiley-Blackwell; 2018." },
  { id: "bernstein", kind: "Textbook", citation: "Bernstein MA, King KF, Zhou XJ. Handbook of MRI Pulse Sequences. Burlington, MA: Elsevier Academic Press; 2004." },
  { id: "elster", kind: "Web resource", citation: "Elster AD. Questions and Answers in MRI. mriquestions.com (educational website; accessed for concept review — check pages for their own update dates).", url: "https://mriquestions.com" },
  // Manufacturer
  { id: "ge-manual", kind: "Manufacturer", citation: "GE HealthCare. SIGNA™ system Operator Manual and Learning & Reference documentation for the installed software release (e.g. SIGNA Creator / Explorer). Available to customers via GE HealthCare documentation channels.", note: "Authoritative source for every GE-specific label, menu location, option and limit. Not reproduced or verified line-by-line in this platform." },
  // Physics papers
  { id: "hennig1986", kind: "Journal", citation: "Hennig J, Nauerth A, Friedburg H. RARE imaging: a fast imaging method for clinical MR. Magn Reson Med. 1986;3(6):823-833." },
  { id: "pipe1999", kind: "Journal", citation: "Pipe JG. Motion correction with PROPELLER MRI: application to head motion and free-breathing cardiac imaging. Magn Reson Med. 1999;42(5):963-969." },
  { id: "pruessmann1999", kind: "Journal", citation: "Pruessmann KP, Weiger M, Scheidegger MB, Boesiger P. SENSE: sensitivity encoding for fast MRI. Magn Reson Med. 1999;42(5):952-962." },
  { id: "griswold2002", kind: "Journal", citation: "Griswold MA, Jakob PM, Heidemann RM, et al. Generalized autocalibrating partially parallel acquisitions (GRAPPA). Magn Reson Med. 2002;47(6):1202-1210." },
  { id: "brau2008", kind: "Journal", citation: "Brau AC, Beatty PJ, Skare S, Bammer R. Comparison of reconstruction accuracy and efficiency among autocalibrating data-driven parallel imaging methods. Magn Reson Med. 2008;59(2):382-395.", note: "Describes the autocalibrating reconstruction approach associated with GE ARC." },
  { id: "busse2006", kind: "Journal", citation: "Busse RF, Hariharan H, Vu A, Brittain JH. Fast spin echo sequences with very long echo trains: design of variable refocusing flip angle schedules and generation of clinical T2 contrast. Magn Reson Med. 2006;55(5):1030-1037." },
  { id: "dixon1984", kind: "Journal", citation: "Dixon WT. Simple proton spectroscopic imaging. Radiology. 1984;153(1):189-194." },
  { id: "reeder2005", kind: "Journal", citation: "Reeder SB, Pineda AR, Wen Z, et al. Iterative decomposition of water and fat with echo asymmetry and least-squares estimation (IDEAL). Magn Reson Med. 2005;54(3):636-644." },
  { id: "haacke2004", kind: "Journal", citation: "Haacke EM, Xu Y, Cheng YC, Reichenbach JR. Susceptibility weighted imaging (SWI). Magn Reson Med. 2004;52(3):612-618." },
  { id: "stejskal1965", kind: "Journal", citation: "Stejskal EO, Tanner JE. Spin diffusion measurements: spin echoes in the presence of a time-dependent field gradient. J Chem Phys. 1965;42(1):288-292." },
  { id: "koh2007", kind: "Journal", citation: "Koh DM, Collins DJ. Diffusion-weighted MRI in the body: applications and challenges in oncology. AJR Am J Roentgenol. 2007;188(6):1622-1635." },
  { id: "bottomley1984", kind: "Journal", citation: "Bottomley PA, Foster TH, Argersinger RE, Pfeifer LM. A review of normal tissue hydrogen NMR relaxation times and relaxation mechanisms from 1-100 MHz. Med Phys. 1984;11(4):425-448.", note: "Background for the approximate relaxation times used in the synthetic phantom." },
  // Safety
  { id: "acr-safety", kind: "Guideline", citation: "American College of Radiology Committee on MR Safety. ACR Manual on MR Safety. Reston, VA: ACR; 2020 (check for the current version).", url: "https://www.acr.org/Clinical-Resources/Radiology-Safety/MR-Safety" },
  { id: "kanal2013", kind: "Guideline", citation: "Kanal E, Barkovich AJ, Bell C, et al. ACR guidance document on MR safe practices: 2013. J Magn Reson Imaging. 2013;37(3):501-530." },
  { id: "mhra", kind: "Guideline", citation: "Medicines and Healthcare products Regulatory Agency (MHRA). Safety Guidelines for Magnetic Resonance Imaging Equipment in Clinical Use. London: MHRA (current revision).", url: "https://www.gov.uk/government/publications/safety-guidelines-for-magnetic-resonance-imaging-equipment-in-clinical-use" },
  { id: "iec60601", kind: "Standard", citation: "International Electrotechnical Commission. IEC 60601-2-33: Medical electrical equipment — Part 2-33: Particular requirements for the basic safety and essential performance of magnetic resonance equipment for medical diagnosis (current edition)." },
  { id: "astm-f2503", kind: "Standard", citation: "ASTM International. ASTM F2503: Standard Practice for Marking Medical Devices and Other Items for Safety in the Magnetic Resonance Environment (current edition)." },
  { id: "acr-contrast", kind: "Guideline", citation: "ACR Committee on Drugs and Contrast Media. ACR Manual on Contrast Media. Reston, VA: ACR (current edition).", url: "https://www.acr.org/Clinical-Resources/Contrast-Manual" },
  { id: "weinreb2021", kind: "Guideline", citation: "Weinreb JC, Rodby RA, Yee J, et al. Use of intravenous gadolinium-based contrast media in patients with kidney disease: consensus statements from the American College of Radiology and the National Kidney Foundation. Radiology. 2021;298(1):28-35." },
  { id: "esur-contrast", kind: "Guideline", citation: "European Society of Urogenital Radiology (ESUR). ESUR Guidelines on Contrast Agents (current version).", url: "https://www.esur.org/esur-guidelines-on-contrast-agents/" },
  // Neuro
  { id: "powers2019", kind: "Guideline", citation: "Powers WJ, Rabinstein AA, Ackerson T, et al. Guidelines for the early management of patients with acute ischemic stroke: 2019 update. Stroke. 2019;50(12):e344-e418." },
  { id: "ellingson2015", kind: "Journal", citation: "Ellingson BM, Bendszus M, Boxerman J, et al. Consensus recommendations for a standardized Brain Tumor Imaging Protocol in clinical trials. Neuro Oncol. 2015;17(9):1188-1198." },
  { id: "kaufmann2020", kind: "Journal", citation: "Kaufmann TJ, Smits M, Boxerman J, et al. Consensus recommendations for a standardized brain tumor imaging protocol for clinical trials in brain metastases. Neuro Oncol. 2020;22(6):757-772." },
  { id: "wattjes2021", kind: "Guideline", citation: "Wattjes MP, Ciccarelli O, Reich DS, et al. 2021 MAGNIMS–CMSC–NAIMS consensus recommendations on the use of MRI in patients with multiple sclerosis. Lancet Neurol. 2021;20(8):653-670." },
  { id: "thompson2018", kind: "Guideline", citation: "Thompson AJ, Banwell BL, Barkhof F, et al. Diagnosis of multiple sclerosis: 2017 revisions of the McDonald criteria. Lancet Neurol. 2018;17(2):162-173." },
  { id: "bernasconi2019", kind: "Guideline", citation: "Bernasconi A, Cendes F, Theodore WH, et al. Recommendations for the use of structural magnetic resonance imaging in the care of patients with epilepsy: a consensus report from the ILAE Neuroimaging Task Force. Epilepsia. 2019;60(6):1054-1068." },
  { id: "saposnik2011", kind: "Guideline", citation: "Saposnik G, Barinagarrementeria F, Brown RD Jr, et al. Diagnosis and management of cerebral venous thrombosis: a statement for healthcare professionals from the AHA/ASA. Stroke. 2011;42(4):1158-1192." },
  { id: "acr-pp", kind: "Guideline", citation: "American College of Radiology. ACR–ASNR–SPR / ACR–SSR practice parameters for the performance of MRI of the brain, spine and musculoskeletal system (current revisions).", url: "https://www.acr.org/Clinical-Resources/Practice-Parameters-and-Technical-Standards" },
  // Body / pelvis
  { id: "pirads21", kind: "Guideline", citation: "Turkbey B, Rosenkrantz AB, Haider MA, et al. Prostate Imaging Reporting and Data System Version 2.1: 2019 update of PI-RADS v2. Eur Urol. 2019;76(3):340-351." },
  { id: "lirads", kind: "Guideline", citation: "American College of Radiology. Liver Imaging Reporting and Data System (LI-RADS) v2018 — CT/MRI technical recommendations (check for current version).", url: "https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/LI-RADS" },
  { id: "griffin2012", kind: "Journal", citation: "Griffin N, Charles-Edwards G, Grant LA. Magnetic resonance cholangiopancreatography: the ABC of MRCP. Insights Imaging. 2012;3(1):11-21." },
  { id: "beetstan2018", kind: "Guideline", citation: "Beets-Tan RGH, Lambregts DMJ, Maas M, et al. Magnetic resonance imaging for clinical management of rectal cancer: updated recommendations from the 2016 ESGAR consensus meeting. Eur Radiol. 2018;28(4):1465-1475." },
  { id: "bazot2017", kind: "Guideline", citation: "Bazot M, Bharwani N, Huchon C, et al. European society of urogenital radiology (ESUR) guidelines: MR imaging of pelvic endometriosis. Eur Radiol. 2017;27(7):2765-2775." },
  { id: "manganaro2021", kind: "Guideline", citation: "Manganaro L, Lakhman Y, Bharwani N, et al. Staging, recurrence and follow-up of uterine cervical cancer using MRI: updated guidelines of the European Society of Urogenital Radiology after revised FIGO staging 2018. Eur Radiol. 2021;31(10):7802-7816." },
  { id: "nougaret2019", kind: "Guideline", citation: "Nougaret S, Horta M, Sala E, et al. Endometrial cancer MRI staging: updated guidelines of the European Society of Urogenital Radiology. Eur Radiol. 2019;29(2):792-805." },
  { id: "sadowski2022", kind: "Journal", citation: "Sadowski EA, Thomassin-Naggara I, Rockall A, et al. O-RADS MRI risk stratification system: guide for assessing adnexal lesions from the ACR O-RADS committee. Radiology. 2022;303(1):35-47." },
  { id: "elsayed2017", kind: "Guideline", citation: "El Sayed RF, Alt CD, Maccioni F, et al. Magnetic resonance imaging of pelvic floor dysfunction — joint recommendations of the ESUR and ESGAR Pelvic Floor Working Group. Eur Radiol. 2017;27(5):2067-2085." },
  // Cardiac, breast, MSK
  { id: "kramer2020", kind: "Guideline", citation: "Kramer CM, Barkhausen J, Bucciarelli-Ducci C, et al. Standardized cardiovascular magnetic resonance imaging (CMR) protocols: 2020 update. J Cardiovasc Magn Reson. 2020;22(1):17." },
  { id: "mann2008", kind: "Guideline", citation: "Mann RM, Kuhl CK, Kinkel K, Boetes C. Breast MRI: guidelines from the European Society of Breast Imaging. Eur Radiol. 2008;18(7):1307-1318." },
  { id: "lambert2016", kind: "Guideline", citation: "Lambert RG, Bakker PA, van der Heijde D, et al. Defining active sacroiliitis on MRI for classification of axial spondyloarthritis: update by the ASAS MRI working group. Ann Rheum Dis. 2016;75(11):1958-1963." },
];

export const REF_BY_ID: Record<string, Reference> = Object.fromEntries(REFERENCES.map((r) => [r.id, r]));

/** Date the educational content was last reviewed by the content team. */
export const LAST_REVIEWED = "2026-10-19";
export const CONTENT_VERSION = "0.1.0";
