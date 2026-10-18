/**
 * Content integrity checks. Run: npm run validate-content
 * Guards the question bank as it grows toward 500+ items.
 */
import { modules, questions } from "../src/content";
import { cases } from "../src/content/cases";
import { labById } from "../src/content/labs";
import { referenceById } from "../src/content/references";

const errors: string[] = [];
const err = (m: string) => errors.push(m);

const ids = new Set<string>();
for (const q of questions) {
  if (ids.has(q.id)) err(`Duplicate question id ${q.id}`);
  ids.add(q.id);
  if (q.correct.length === 0) err(`${q.id}: no correct answer`);
  if (q.correct.some((c) => c < 0 || c >= q.options.length)) err(`${q.id}: correct index out of range`);
  if (q.type !== "multi" && q.correct.length !== 1) err(`${q.id}: ${q.type} must have exactly one correct option`);
  if (q.type === "truefalse" && q.options.length !== 2) err(`${q.id}: true/false must have two options`);
  if (q.type === "scenario" && !q.scenario) err(`${q.id}: scenario question missing vignette`);
  if (!q.explanation.trim()) err(`${q.id}: missing explanation`);
  if (!modules.some((m) => m.id === q.moduleId)) err(`${q.id}: unknown module ${q.moduleId}`);
  q.references?.forEach((r) => !referenceById[r] && err(`${q.id}: unknown reference ${r}`));
}

for (const m of modules) {
  m.furtherReading.forEach((r) => !referenceById[r] && err(`${m.id}: unknown reference ${r}`));
  m.labIds?.forEach((l) => !labById[l] && err(`${m.id}: unknown lab ${l}`));
  const lessonIds = new Set<string>();
  for (const l of m.lessons) {
    if (lessonIds.has(l.id)) err(`${m.id}: duplicate lesson id ${l.id}`);
    lessonIds.add(l.id);
    if (l.questionIds.length === 0) err(`${m.id}/${l.id}: no knowledge-check questions`);
    l.questionIds.forEach((q) => !ids.has(q) && err(`${m.id}/${l.id}: unknown question ${q}`));
    l.references.forEach((r) => !referenceById[r] && err(`${m.id}/${l.id}: unknown reference ${r}`));
  }
}

for (const c of cases) c.references.forEach((r) => !referenceById[r] && err(`case ${c.id}: unknown reference ${r}`));

const byType = questions.reduce<Record<string, number>>((a, q) => ((a[q.type] = (a[q.type] ?? 0) + 1), a), {});
console.log(`Questions: ${questions.length} ${JSON.stringify(byType)}`);
console.log(`Modules: ${modules.length}, lessons: ${modules.reduce((s, m) => s + m.lessons.length, 0)}, cases: ${cases.length}`);
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log("Content OK");
