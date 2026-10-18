# Advanced MRI Safety Officer Academy

A learning platform for advanced MRI safety. It covers MRI safety principles, risk management, clinical practice and emergency preparedness. It is written for MR radiographers and technologists, radiologists, MR physicists, biomedical engineers, radiology nurses and MR department managers.

The app is built with Next.js 15 (App Router), TypeScript, Tailwind CSS and lucide-react. It is exported as a static site, so it needs no server and no credentials.

> **Putting it online with learner accounts and an admin dashboard?** Follow [DEPLOY.md](./DEPLOY.md). It is a step-by-step guide for non-developers.

## Getting started

```bash
cd apps/mrso-academy
npm install
npm run dev               # http://localhost:3000
npm run build             # static export to ./out
npx serve out             # or any static host (Netlify, S3, GitHub Pages, nginx)
npm run typecheck
npm run validate-content  # checks the question bank, lesson and reference integrity
```

Requires Node 18.18 or later (tested on Node 22).

## What's implemented

| Area | Details |
|---|---|
| Home | Hero with an illustrated MRI scanner and a field-line animation. Also: headline and CTAs, safety-signage strip, overview, learning objectives, all 14 modules, live dashboard preview, featured cases, assessment preview, references and a footer disclaimer. |
| Curriculum | 14 modules and 33 lessons. A full-text search runs across all lessons, and modules expand to show their lessons. Each lesson has objectives, teaching sections, callouts, an illustration, a clinical example, a checklist (downloadable), common mistakes, a knowledge check with explanations, and dated references. Lessons also have bookmarks, mark-complete and previous/next navigation. |
| Dashboard | Overall completion ring, lessons, knowledge-check average, labs, learning time, module completed/pending status and recommended next lesson. It also shows weak topics, topic analytics, exam score history, recent activity, lab results, completion-record status, and JSON export/reset. |
| Learning lab (9) | Zone identification on an interactive map, branching patient screening, implant risk assessment (fictional devices), projectile triage, emergency decision-making, incident investigation (timeline, barriers, CAPA), RF burn positioning hotspots, a SAR vs B1+rms conceptual explorer, and a quench/cryogen scenario. |
| Examination centre | MCQ, select-all, true/false and scenario questions. Timed or untimed modes, randomised questions and options, filters by topic and type, a question navigator, flag-for-review, score report, topic analytics, recommended revision and review of incorrect answers. There is also a 30-question, 60-minute capstone with an 80% pass mark. |
| Case studies | 10 cases, revealed step by step: background, concerns, information needed, risk classification, decision process, actions, actions to avoid, documentation, debrief, assumptions and escalation. |
| Resources | Searchable and filterable bibliography with edition dates and "verify" flags. Editable templates: audit (CSV), incident report (MD), risk register (CSV) and CAPA plan (CSV). Every lesson checklist is downloadable. Image credits are listed. |
| Accounts & admin (optional, via Supabase) | Free email/password sign-up and sign-in, password reset, cloud-saved progress across devices (guest work merges on sign-up), account page. The `/admin` dashboard has KPIs, sign-up trends, a learner search/filter/sort table, a per-learner detail view, content analytics (weak topics, most-missed questions, module completion), CSV export, and revoke/disable/promote/reset actions. Security is enforced in the database with row-level security (`supabase/schema.sql`). |
| Other | Glossary with search, flashcards (keyboard support, known/learning tracking), bookmarks, a completion record that can be printed or saved as PDF (gated on all lessons plus capstone ≥ 80%), an about/limitations page and a 404 page. |

Accessibility: skip link, semantic landmarks, keyboard-operable interactive SVGs, labelled form controls, `aria-live` status messages, visible focus rings, reduced-motion support, and responsive layouts from 375 px up.

## Architecture

```
src/content/        typed learning content (no UI code)
  modules/          14 modules → lessons
  questions/        question bank files (bank-a/b/c.ts)
  references.ts     bibliography; edition dates and verify flags
  cases.ts, glossary.ts, labs.ts, scenarios.ts, media.ts
src/lib/progress.ts progress store (localStorage, useSyncExternalStore)
src/lib/stats.ts    derived dashboard statistics
src/components/     UI kit, charts, quiz engine, labs, SVG art
src/app/            routes
scripts/validate-content.ts
```

### Expanding the question bank (to 500 or more)

Add a new file under `src/content/questions/` that exports `Question[]`, then spread it into `questions` in `src/content/index.ts`. Every item carries `topic`, `moduleId`, `type` and `difficulty`, so the exam filters, the capstone's stratified draw and the analytics all pick up new items automatically. Run `npm run validate-content` afterwards: it rejects duplicate IDs, bad answer indexes and unknown references. The bank holds 94 items today.

### Adding licensed photography

The site ships with **original SVG illustrations only**. Licensed MRI photos could not be retrieved from the build environment, and unlicensed images were not used. To add photos, put the files in `public/images/` and fill in `src/content/media.ts` with the source, licence and credit. The hero switches to the photo automatically (behind a dark overlay), and the attribution appears on the page and under Resources → Image credits.

## Educational accuracy

- Content was written against sources available in **October 2026**. Every lesson cites its sources, and there is a consolidated bibliography under Resources.
- The editions or status of some sources could not be confirmed online. These include the ACR Manual 2024 deep link, the MHRA 5th edition (2026), the 2023 FDA labelling-guidance revision, ASTM F2503-26 and IEC 60601-2-33 Ed. 4. They are flagged **"Verify against latest edition"**.
- Lab devices and numeric values are **fictional or illustrative**, and the pages label them that way. No real device conditions are invented.
- Emergency content treats evacuation, emergency power off and quench as distinct actions. It never presents a quench as the default response, and it always defers to local procedure and manufacturer instructions.
- The site makes **no accreditation or certification claims**. The course completion record is explicitly distinguished from externally recognised MRSO credentials.
- **Before production use, a qualified MR Safety Expert and an MR Medical Director should review the clinical content.**

## Accounts (Supabase)

- If `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set at build time, accounts, sync and `/admin` turn on. If they are not set, the site runs in local demo mode exactly as before. See `.env.example` and [DEPLOY.md](./DEPLOY.md).
- `supabase/schema.sql` creates `profiles` and `progress`, adds a sign-up trigger and an `is_admin()` helper, and sets row-level security:
  - learners can read and write only their own rows;
  - learners cannot change their own role, disabled flag or certificate status (a trigger guard enforces this);
  - disabled accounts cannot write progress;
  - admins can read everything, update profiles and delete progress.
- The anon key is public by design. The service_role key is never used by the app.

## Limitations, and production integrations not yet configured

- Quizzes are scored client-side and the progress document is written by the learner's browser, so a determined user can falsify their own results. Invigilated or verifiable credentials would need server-side marking and signed records.
- Guests (not signed in) keep progress in localStorage only.
- No LMS (SCORM/xAPI/LTI) export and no cohorts/groups yet.
- Deleting accounts is done in the Supabase dashboard (it needs the service role).
- There is no CMS. Content is typed TypeScript data, which is easy to migrate.
- No real photography (see above).
- `npm audit` reports advisories in build-time dev tooling (Tailwind 3's chokidar chain) and in `sharp`/`postcss`, which are bundled transitively by Next. The static export never runs `sharp` (images are unoptimised) and serves no server code.
