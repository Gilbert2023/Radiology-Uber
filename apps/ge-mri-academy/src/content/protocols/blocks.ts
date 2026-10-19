import type { ProtocolSequence } from "../types";

/**
 * Reusable sequence blocks. Parameter ranges are typical educational ranges for
 * a 1.5 T system — NOT validated GE presets. Always start from the site's
 * approved protocol and the installed software's limits.
 */
const s = (name: string, plane: string, purpose: string, params?: string, extra: Partial<ProtocolSequence> = {}): ProtocolSequence => ({ name, plane, purpose, params, ...extra });

export const B = {
  loc: s("3-plane localiser", "Tri-plane", "Planning and confirmation of position/coil coverage.", "Fast GRE/SSFSE; use as planning reference only."),
  cal: s("Calibration (coil sensitivity)", "Volume", "Required for ASSET/intensity correction where used.", "Repeat if the patient or coil moves."),
  // Neuro
  sagT1: s("Sag T1 (SE/FSE or T1 FLAIR)", "Sagittal", "Midline anatomy, corpus callosum, pituitary, cerebellar tonsils.", "FOV 24 cm; 4–5 mm; matrix ~256–320 × 192–224."),
  axT2: s("Ax T2 FRFSE", "Axial", "General parenchymal survey; oedema; CSF spaces.", "FOV 22–24 cm; 5 mm/1–1.5 mm gap; 320–384 × 224–288; TR ≥ ~3000 ms; TE 80–110 ms; ETL 12–20."),
  axFlair: s("Ax T2 FLAIR", "Axial", "Lesions adjacent to CSF; white-matter disease; sulcal pathology.", "5 mm; TR ~8000–10000 ms; TI ~2000–2500 ms (check CSF nulling); TE 100–140 ms."),
  flair3d: s("3D FLAIR (CUBE FLAIR where licensed)", "Sagittal 3D", "Thin contiguous lesion detection; reformats.", "~1–1.2 mm isotropic; ARC as needed."),
  dwiBrain: s("Ax DWI (b 0 and b ~1000) + ADC", "Axial", "Restricted diffusion: acute ischaemia, abscess, hypercellular tumour.", "5 mm; ASSET 2; b-values per local protocol; check distortion at skull base."),
  swi: s("Ax SWAN / T2* GRE", "Axial", "Haemorrhage, microbleeds, calcification, venous thrombus.", "SWAN where licensed; otherwise 2D T2* GRE TE ~15–25 ms."),
  t2Cor: s("Cor T2 FSE", "Coronal", "Hippocampi, temporal lobes, midline shift.", "4–5 mm."),
  t1Ax: s("Ax T1 (SE or T1 FLAIR)", "Axial", "Pre-contrast baseline; fat, haemorrhage, melanin.", "5 mm, matched to post-contrast geometry."),
  t13dPost: s("3D T1 post-contrast (BRAVO/FSPGR or 3D FSE T1 where available)", "Sagittal 3D", "Enhancement with isotropic reformats.", "~1 mm isotropic; acquire at a consistent delay per local protocol.", { postContrast: true }),
  t1AxPost: s("Ax T1 post-contrast", "Axial", "Enhancement in standard plane.", "Matched to pre-contrast.", { postContrast: true }),
  // Spine
  sagT2sp: s("Sag T2 FSE", "Sagittal", "Cord, CSF, discs, canal.", "FOV 24–32 cm by region; 3–4 mm; flow comp; NPW if phase S/I."),
  sagT1sp: s("Sag T1 FSE", "Sagittal", "Marrow, fat, anatomy.", "3–4 mm; short ETL (2–4)."),
  sagStir: s("Sag STIR", "Sagittal", "Marrow oedema, infection, fracture, metastases.", "3–4 mm; TI ~150–170 ms."),
  axT2sp: s("Ax T2 FSE", "Axial", "Canal, foramina, discs, nerve roots.", "3–4 mm angled through discs or stacked; FOV 16–20 cm."),
  // MSK
  pdfs: (plane: string) => s(`${plane} PD FS FSE`, plane, "Fluid-sensitive, meniscus/cartilage/ligament/marrow oedema.", "FOV 14–16 cm; 3–4 mm; 320–384 × 224–256; TE 30–45 ms; ETL 6–10."),
  pd: (plane: string) => s(`${plane} PD FSE (no FS)`, plane, "Anatomic detail, meniscal morphology.", "TE 20–35 ms; ETL 6–10."),
  t1msk: (plane: string) => s(`${plane} T1 FSE/SE`, plane, "Marrow, fat planes, fracture lines.", "Short TE; ETL 2–4."),
  // Abdomen
  ssfseCor: s("Cor SSFSE (breath-hold or free-breathing)", "Coronal", "Survey; fluid-filled structures.", "6–8 mm; breath-hold."),
  ssfseAx: s("Ax SSFSE", "Axial", "Motion-robust T2.", "6–8 mm."),
  inout: s("Ax dual-echo (in/opposed-phase) GRE", "Axial", "Intracellular fat (steatosis, adrenal adenoma), iron.", "TEs ~2.3 ms (opposed) and ~4.6 ms (in-phase) at 1.5 T; breath-hold. Verify TE values."),
  t2fsAx: s("Ax T2 FSE FS (resp-triggered)", "Axial", "Lesion detection, characterisation (cyst, haemangioma).", "6–7 mm; resp-triggered or navigator."),
  dwiAbd: s("Ax DWI (e.g. b 50 / 400–800)", "Axial", "Lesion detection, cellularity.", "Resp-triggered or free-breathing multi-NEX; verify b-values against local protocol."),
  dyn: s("3D T1 FS GRE dynamic (pre, arterial, portal venous, delayed)", "Axial", "Enhancement characterisation.", "LAVA-type 3D; timing via bolus tracking/test bolus; breath-hold.", { postContrast: true }),
} as const;
