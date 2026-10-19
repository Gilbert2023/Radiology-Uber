import { PARAMETERS } from "@/content/parameters";
import { SEQUENCES } from "@/content/sequences";
import { PROTOCOLS } from "@/content/protocols";
import { TROUBLESHOOTING } from "@/content/troubleshooting";
import { CASES } from "@/content/cases";
import { PHYSICS } from "@/content/physics";
import { ADVANCED } from "@/content/advanced";
import { SAFETY } from "@/content/safety";

export interface SearchDoc {
  key: string; // "kind:id" — matches bookmark keys
  kind: string;
  title: string;
  summary: string;
  href: string;
  text: string;
}

export const SEARCH_INDEX: SearchDoc[] = [
  ...PARAMETERS.map((p) => ({ key: `parameter:${p.id}`, kind: "Parameter", title: p.label, summary: p.definition, href: `/parameters/${p.id}/`, text: [p.label, ...(p.aka ?? []), p.definition, p.physics, p.clinical].join(" ") })),
  ...SEQUENCES.map((s) => ({ key: `sequence:${s.id}`, kind: "Sequence", title: s.name, summary: s.principle, href: `/sequences/${s.id}/`, text: [s.name, s.geNames, s.otherVendors ?? "", s.principle, ...s.applications].join(" ") })),
  ...PROTOCOLS.map((p) => ({ key: `protocol:${p.id}`, kind: `Protocol · ${p.region}`, title: p.title, summary: p.indication, href: `/protocols/${p.id}/`, text: [p.title, p.indication, p.anatomy, ...p.tags, ...p.sequences.map((s) => s.name)].join(" ") })),
  ...TROUBLESHOOTING.map((t) => ({ key: `troubleshooting:${t.id}`, kind: "Troubleshooting", title: t.title, summary: t.observe, href: `/troubleshooting/${t.id}/`, text: [t.title, t.observe, ...t.causes].join(" ") })),
  ...CASES.map((c) => ({ key: `case:${c.id}`, kind: "Case", title: c.title, summary: c.presentation, href: `/cases/${c.id}/`, text: [c.title, c.presentation, c.request].join(" ") })),
  ...PHYSICS.map((p) => ({ key: `physics:${p.id}`, kind: "Physics", title: p.title, summary: p.explain, href: `/physics/#${p.id}`, text: [p.title, p.explain, p.images].join(" ") })),
  ...ADVANCED.map((a) => ({ key: `advanced:${a.id}`, kind: "Advanced parameter", title: a.name, summary: a.summary, href: `/advanced/#${a.id}`, text: [a.name, a.summary, a.physics, a.practice].join(" ") })),
  ...SAFETY.map((s) => ({ key: `safety:${s.id}`, kind: "Safety", title: s.title, summary: s.points[0], href: `/safety/#${s.id}`, text: [s.title, ...s.points].join(" ") })),
];

export function search(q: string): SearchDoc[] {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return SEARCH_INDEX.map((d) => {
    const title = d.title.toLowerCase(), text = d.text.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (!text.includes(t) && !title.includes(t)) return { d, score: -1 };
      score += (title.includes(t) ? 5 : 0) + (title.startsWith(t) ? 3 : 0) + 1;
    }
    return { d, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).map((x) => x.d);
}
