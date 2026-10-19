# GE MRI Protocol Mastery — From Console Parameters to Clinical Decisions

An educational web application for GE 1.5 T MRI: console parameters, sequence physics, clinical protocols, troubleshooting, cases, physics and assessments.

> **Educational use only.** Supplements — never replaces — GE HealthCare manufacturer instructions, institutional protocols, radiologist direction, MRI safety procedures and professional judgement. Simulator outputs are educational approximations, not scanner predictions. Not affiliated with GE HealthCare.

## Requirements and commands

- Node.js 20+ (tested with Node 22), npm 10+

```bash
cd apps/ge-mri-academy
npm install
npm run dev        # http://localhost:3001
npm test           # simulator physics checks + content cross-reference validation
npm run typecheck
npm run build      # static export to ./out
npm start          # serve ./out
```

No environment variables or backend are required: the site is a static export and can be hosted on any static host.

## Adding the GE console screenshots

The two reference screenshots were not present in the repository when this build was made. Save them as:

```
public/console/screenshot-1.png   # sequence-selection screen
public/console/screenshot-2.png   # axial FRFSE T2 prescription screen
```

(`.jpg`, `.jpeg` and `.webp` also work.) Rebuild; the Console Walkthrough detects and displays them automatically. Do not add images containing patient identifiers.

## What is implemented

| Module | Route | Status |
| --- | --- | --- |
| Dashboard (continue learning, recent lessons, progress, saved protocols, bookmarks, cases, practice exam, recommended next lesson, export/reset) | `/` | Functional |
| Console Walkthrough (screenshot slots + interactive annotated learning diagrams) | `/console/` | Functional; screenshots must be added (see above) |
| GE Console Parameter Academy — 48 parameters, 12-part teaching format, verification badges, search/filter | `/parameters/`, `/parameters/[id]/` | Functional |
| Beyond the Screenshot — 26 advanced/hidden parameters with confidence classification | `/advanced/` | Functional |
| Interactive Console Simulator — 8 sequence families, live time/SNR/resolution/contrast/artefact feedback, synthetic k-space phantom, A/B compare, presets, save/load, reset to teaching example | `/simulator/` | Functional (educational model) |
| Sequence Library — 25 sequences with schematic pulse diagrams | `/sequences/` | Functional |
| Clinical Protocol Library — 62 conditions across 7 regions, 17-section pages, search/filter/save/print | `/protocols/` | Functional. 24 “full” pages (brain, spine, MSK, abdomen focus); the rest are “core” pages that use region-level preparation/QC/pitfalls |
| Protocol Decision Assistant | `/decision/` | Functional (rule-based learning aid) |
| Troubleshooting Centre — 23 scenarios on the 8-step framework | `/troubleshooting/` | Functional |
| Image Interpretation & Sequence Comparison — 9 comparisons with slider, labelled plane illustrations | `/images/` | Functional with synthetic phantom only — licensed clinical images not yet included |
| Clinical Case Simulator — 9 cases, 3 difficulty levels | `/cases/` | Functional |
| Physics Learning Centre — 22 topics, 6 interactive widgets (relaxation, IR null, Larmor, bandwidth/chemical shift, SNR, k-space) | `/physics/` | Functional |
| Assessments — 51 questions, practice/timed mock, randomised, review of incorrect answers, saved history | `/assessments/` | Functional |
| MRI Safety & governance | `/safety/` | Functional |
| References, update process, image credits, last-reviewed date | `/references/` | Functional |
| Global search and bookmarks | `/search/` | Functional |

### Known limitations / next stages

- **Persistence is browser-local** (`localStorage`). Progress does not sync between devices and is lost if site data is cleared. Export to JSON is available on the dashboard. The progress document (`src/lib/progress.ts`) is versioned and serialisable for a future backend (e.g. a `progress` table keyed by user id, as in `apps/mrso-academy`).
- **No licensed clinical MRI images yet.** All images are a synthetic digital phantom or labelled SVG illustrations, clearly marked. Add licensed, de-identified images to `public/images/` with source and licence recorded.
- **GE-specific details** (menu locations, option names, NPW/NEX behaviour, RF Drive Mode, Excitation Mode, etc.) are labelled *“verify on the installed software version”* unless visible on the supplied screenshots. They have not been checked against a GE manual.
- **Clinical peer review** of protocol and safety content by a qualified MRI radiographer, radiologist and MR Safety Expert is required before formal teaching use.
- “Core” protocol pages (pelvis, vascular/cardiac, breast/oncology and some neuro/MSK/abdomen conditions) should be expanded to condition-specific mistakes, mimics and QC.

## Project structure

```
src/
  app/                 Next.js App Router pages (one folder per module)
  components/          Shell/navigation, UI primitives, PhantomCanvas, PulseDiagram
  content/             Typed content (database-ready records)
    types.ts           Data model: Parameter, Sequence, Protocol, Case, Question, Reference…
    parameters-*.ts    Parameter dictionary, grouped
    advanced.ts        Hidden/advanced parameters
    sequences.ts       Sequence library
    protocols/         Protocol blocks, region builders and conditions
    troubleshooting.ts, cases.ts, questions.ts, physics.ts, safety.ts
    references.ts      Bibliography, LAST_REVIEWED, CONTENT_VERSION
  lib/
    sim.ts             Educational parameter model (scan time, SNR, contrast, artefacts)
    phantom.ts, fft.ts Synthetic phantom rendered through k-space
    decision.ts        Decision-assistant rules
    progress.ts        localStorage progress store
    search.ts          Client-side search index
scripts/
  test-sim.ts          Physics direction-of-change tests
  validate-content.ts  Cross-reference and id validation
```

## Simulator model (transparency)

All formulas are simplified textbook relationships (McRobbie et al.; Bernstein et al.) and labelled in the UI:

- Scan time (2D FSE) ≈ TR × phase lines × NEX × acquisitions ÷ (ETL × R); phase lines = phase matrix × phase FOV.
- Relative SNR ∝ voxel volume × √(phase lines × NEX × frequency samples ÷ total bandwidth) ÷ (g√R), with an illustrative g-factor.
- Bandwidth/pixel = 2 × (±kHz) × 1000 ÷ frequency matrix; fat–water shift ≈ 224 Hz at 1.5 T.
- Signal: spin echo PD(1−e^(−TR/T1))e^(−TE/T2); inversion recovery |1−2e^(−TI/T1)+e^(−TR/T1)|; spoiled GRE steady state; approximate 1.5 T relaxation values.
- “Relative RF demand” is a teaching index of pulse energy per second — **not** SAR or B1+rms. The simulator never calculates SAR, B1+rms or RF safety.

## Updating content

Edit records in `src/content/`, cite reference ids from `references.ts`, bump `LAST_REVIEWED`/`CONTENT_VERSION`, and run `npm test`.
