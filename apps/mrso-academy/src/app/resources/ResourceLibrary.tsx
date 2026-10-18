"use client";

import { useMemo, useState } from "react";
import { Download, ExternalLink, FileSpreadsheet, FileText, Search } from "lucide-react";
import { references } from "@/content/references";
import type { ResourceCategory } from "@/content/types";
import { allLessons } from "@/content";
import { media } from "@/content/media";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { downloadText } from "@/lib/utils";

const CATEGORIES: ResourceCategory[] = [
  "Guidelines",
  "Implant screening",
  "Terminology & labelling",
  "Incident reporting",
  "Emergency procedures",
  "Quality assurance",
  "Policies & checklists",
  "Professional development",
];

const templates = [
  { file: "/templates/mri-safety-audit.csv", title: "MRI safety audit tool", desc: "Editable audit checklist (opens in Excel, Sheets, LibreOffice).", icon: FileSpreadsheet },
  { file: "/templates/mri-incident-report.md", title: "Incident / near-miss report", desc: "Editable structured report (Markdown; opens in Word or any text editor).", icon: FileText },
  { file: "/templates/mri-risk-register.csv", title: "MR safety risk register", desc: "Likelihood × consequence register with residual risk.", icon: FileSpreadsheet },
  { file: "/templates/mri-capa-plan.csv", title: "Corrective & preventive action plan", desc: "CAPA tracker with control level and effectiveness check.", icon: FileSpreadsheet },
];

const emergencyRefs = new Set(["acr-manual-2024", "mhra-mri", "manufacturer-ifu", "local-policy"]);

export function ResourceLibrary() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<ResourceCategory | "All">("All");
  const [verifyOnly, setVerifyOnly] = useState(false);

  const checklists = useMemo(() => allLessons.filter((l) => l.lesson.checklist), []);

  const filtered = references.filter((r) => {
    const inCat = cat === "All" || r.category === cat || (cat === "Emergency procedures" && emergencyRefs.has(r.id));
    const text = `${r.title} ${r.publisher} ${r.note ?? ""} ${r.jurisdiction}`.toLowerCase();
    return inCat && (!q || text.includes(q.toLowerCase())) && (!verifyOnly || r.verify);
  });

  return (
    <div className="space-y-10">
      <section aria-labelledby="lib">
        <h2 id="lib" className="text-xl font-semibold text-white">Searchable library</h2>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <label htmlFor="res-q" className="sr-only">Search resources</label>
            <input
              id="res-q"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, publisher, jurisdiction…"
              className="w-full rounded-xl border border-white/15 bg-navy-900 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={verifyOnly} onChange={(e) => setVerifyOnly(e.target.checked)} className="h-4 w-4 accent-cyan-400" />
            Only items needing verification
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {(["All", ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={cat === c}
              onClick={() => setCat(c)}
              className={`rounded-full border px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${cat === c ? "border-cyan-400 bg-cyan-400/15 text-cyan-200" : "border-white/15 text-slate-400 hover:text-white"}`}
            >
              {c}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-400" aria-live="polite">
          {filtered.length} resource{filtered.length === 1 ? "" : "s"}
        </p>
        {filtered.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No resources match">Clear the search or choose another category.</EmptyState>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {filtered.map((r) => (
              <li key={r.id} className="rounded-2xl border border-white/10 bg-navy-900/70 p-4">
                <div className="flex flex-wrap gap-2">
                  <Badge>{r.category}</Badge>
                  <Badge tone="cyan">{r.jurisdiction}</Badge>
                  {r.verify && <Badge tone="warn">Verify current edition</Badge>}
                </div>
                <p className="mt-2 font-semibold text-white">{r.title}</p>
                <p className="text-xs text-slate-400">{r.publisher}</p>
                <p className="mt-1 text-xs text-slate-300">Date / edition: {r.date}</p>
                {r.note && <p className="mt-2 text-sm text-slate-400">{r.note}</p>}
                {r.url && (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-cyan-300 hover:underline">
                    Go to source <ExternalLink className="h-3.5 w-3.5" aria-label="(opens in new tab)" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="tpl">
        <h2 id="tpl" className="text-xl font-semibold text-white">Downloadable, editable templates</h2>
        <p className="mt-1 text-sm text-slate-400">Starting points only — adapt to your organisation and approve through local governance.</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {templates.map((t) => (
            <li key={t.file}>
              <a href={t.file} download className="flex h-full flex-col rounded-2xl border border-white/10 bg-navy-900/70 p-4 hover:border-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                <t.icon className="h-6 w-6 text-cyan-300" aria-hidden />
                <span className="mt-2 font-semibold text-white">{t.title}</span>
                <span className="mt-1 flex-1 text-xs text-slate-400">{t.desc}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-xs text-cyan-300">
                  <Download className="h-3.5 w-3.5" aria-hidden /> Download
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="chk">
        <h2 id="chk" className="text-xl font-semibold text-white">Safety checklists</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {checklists.map(({ lesson, module, key }) => (
            <li key={key}>
              <Card className="flex h-full items-start justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-white">{lesson.checklist!.title}</p>
                  <p className="text-xs text-slate-400">
                    Module {module.number} · {lesson.checklist!.items.length} items
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="shrink-0 px-3 py-1.5 text-xs"
                  aria-label={`Download ${lesson.checklist!.title} checklist`}
                  onClick={() =>
                    downloadText(
                      `${lesson.checklist!.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-checklist.txt`,
                      `${lesson.checklist!.title.toUpperCase()}\nEducational checklist — adapt to and approve under local policy before use.\n\n${lesson.checklist!.items.map((i) => `[ ] ${i}`).join("\n")}\n`,
                    )
                  }
                >
                  <Download className="h-3.5 w-3.5" aria-hidden /> .txt
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="credits">
        <h2 id="credits" className="text-xl font-semibold text-white">Image credits</h2>
        <p className="mt-2 text-sm text-slate-300">
          All scanner scenes, floor plans, diagrams and safety signage on this site are original SVG illustrations created for this platform. Sign shapes and
          colours follow ASTM F2503 and ISO 7010 conventions for educational purposes; use officially sourced signage in clinical areas.
        </p>
        {Object.values(media).some(Boolean) && (
          <ul className="mt-3 list-disc pl-5 text-sm text-slate-300">
            {Object.values(media)
              .filter((m): m is NonNullable<typeof m> => !!m)
              .map((m) => (
                <li key={m.src}>
                  {m.alt} — {m.credit}, {m.license}
                  {m.sourceUrl && (
                    <>
                      {" "}
                      (<a className="text-cyan-300 hover:underline" href={m.sourceUrl}>source</a>)
                    </>
                  )}
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
