/** Validates cross-references and ids across all content files. */
import { PARAMETERS, PARAM_BY_ID } from "../src/content/parameters";
import { SEQUENCES, SEQ_BY_ID } from "../src/content/sequences";
import { PROTOCOLS, PROTOCOL_BY_ID } from "../src/content/protocols";
import { TROUBLESHOOTING } from "../src/content/troubleshooting";
import { CASES } from "../src/content/cases";
import { QUESTIONS } from "../src/content/questions";
import { PHYSICS } from "../src/content/physics";
import { ADVANCED } from "../src/content/advanced";
import { SAFETY } from "../src/content/safety";
import { REF_BY_ID } from "../src/content/references";

const errors: string[] = [];
const uniq = (name: string, ids: string[]) => { const seen = new Set<string>(); ids.forEach((i) => { if (seen.has(i)) errors.push(`${name}: duplicate id ${i}`); seen.add(i); }); };
const ref = (where: string, id: string) => { if (!REF_BY_ID[id]) errors.push(`${where}: unknown reference '${id}'`); };
const param = (where: string, id: string) => { if (!PARAM_BY_ID[id]) errors.push(`${where}: unknown parameter '${id}'`); };

uniq("parameters", PARAMETERS.map((p) => p.id));
uniq("sequences", SEQUENCES.map((s) => s.id));
uniq("protocols", PROTOCOLS.map((p) => p.id));
uniq("troubleshooting", TROUBLESHOOTING.map((t) => t.id));
uniq("cases", CASES.map((c) => c.id));
uniq("questions", QUESTIONS.map((q) => q.id));

for (const p of PARAMETERS) {
  p.interactions.forEach((i) => param(`parameter ${p.id}`, i));
  p.refs.forEach((r) => ref(`parameter ${p.id}`, r.id));
  for (const f of ["definition", "physics", "increase", "decrease", "appearance", "clinical", "example", "interactionNotes", "systemNotes"] as const) if (!p[f]) errors.push(`parameter ${p.id}: empty ${f}`);
  if (!p.mistakes.length) errors.push(`parameter ${p.id}: no mistakes`);
}
for (const s of SEQUENCES) {
  s.criticalParams.forEach((i) => param(`sequence ${s.id}`, i));
  s.alternatives.forEach((a) => { if (!SEQ_BY_ID[a]) errors.push(`sequence ${s.id}: unknown alternative ${a}`); });
  s.refs.forEach((r) => ref(`sequence ${s.id}`, r.id));
}
for (const p of PROTOCOLS) {
  p.refs.forEach((r) => ref(`protocol ${p.id}`, r.id));
  if (!p.sequences.some((s) => !s.optional)) errors.push(`protocol ${p.id}: no core sequences`);
  p.sequences.forEach((s) => { if (s.optional && !s.when) errors.push(`protocol ${p.id}: optional '${s.name}' lacks 'when'`); });
}
TROUBLESHOOTING.forEach((t) => t.params.forEach((i) => param(`troubleshooting ${t.id}`, i)));
CASES.forEach((c) => {
  if (c.protocolId && !PROTOCOL_BY_ID[c.protocolId]) errors.push(`case ${c.id}: unknown protocol ${c.protocolId}`);
  c.steps.forEach((s, i) => { if (!s.options.some((o) => o.correct)) errors.push(`case ${c.id} step ${i}: no correct option`); });
});
QUESTIONS.forEach((q) => { if (q.answer < 0 || q.answer >= q.options.length) errors.push(`question ${q.id}: answer out of range`); });
PHYSICS.forEach((t) => t.console.forEach((i) => param(`physics ${t.id}`, i)));
ADVANCED.forEach((a) => a.refs.forEach((r) => ref(`advanced ${a.id}`, r.id)));
SAFETY.forEach((s) => s.refs.forEach((r) => ref(`safety ${s.id}`, r)));

if (errors.length) { errors.forEach((e) => console.error("✗", e)); process.exit(1); }
console.log(`Content OK: ${PARAMETERS.length} parameters, ${ADVANCED.length} advanced, ${SEQUENCES.length} sequences, ${PROTOCOLS.length} protocols, ${TROUBLESHOOTING.length} troubleshooting, ${CASES.length} cases, ${QUESTIONS.length} questions, ${PHYSICS.length} physics topics.`);
