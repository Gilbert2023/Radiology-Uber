"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CASES } from "@/content/cases";
import { PROTOCOL_BY_ID } from "@/content/protocols";
import { PageHeader, Chip, Callout } from "@/components/ui";
import { PhantomCanvas } from "@/components/PhantomCanvas";
import { presetParams } from "@/app/images/presets";
import { progress } from "@/lib/progress";

/** Deterministic option order (seeded by case id) so the correct answer is not always in the same position and SSR matches the client. */
function seededOrder(seed: string, n: number) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const j = (h >>> 0) % (i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

export function CaseRunner({ id }: { id: string }) {
  const raw = CASES.find((x) => x.id === id)!;
  const c = { ...raw, steps: raw.steps.map((s, si) => ({ ...s, options: seededOrder(`${raw.id}:${si}`, s.options.length).map((i) => s.options[i]) })) };
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<(number | null)[]>(() => c.steps.map(() => null));
  const done = step >= c.steps.length;
  const score = picks.filter((p, i) => p !== null && c.steps[i].options[p].correct).length;

  useEffect(() => progress.visit("case", c.id, c.title, `/cases/${c.id}/`), [c.id, c.title]);
  useEffect(() => { if (done) progress.recordCase(c.id, score, c.steps.length); }, [done, c.id, score, c.steps.length]);

  const preset = c.challenge.image ? presetParams(c.challenge.image) : null;

  return (
    <article>
      <PageHeader kicker={`Clinical case · ${c.region}`} title={c.title}><Chip>{c.difficulty}</Chip></PageHeader>
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-4">
          <div className="panel panel-pad text-sm text-ink-700">
            <div className="kicker mb-1">Presentation</div><p>{c.presentation}</p>
            <div className="kicker mb-1 mt-3">Clinical request</div><p>{c.request}</p>
          </div>
          <Callout tone="safety" title="Safety and contraindications">{c.safety}</Callout>

          {c.steps.slice(0, Math.min(step + 1, c.steps.length)).map((s, i) => {
            const picked = picks[i];
            return (
              <div key={i} className="panel panel-pad">
                <div className="kicker mb-1">Decision {i + 1} of {c.steps.length}</div>
                {s.info && <p className="mb-2 rounded bg-paper-200 px-3 py-2 text-sm text-ink-700"><strong>New information:</strong> {s.info}</p>}
                <p className="font-medium text-ink-900">{s.prompt}</p>
                <div className="mt-3 space-y-2" role="radiogroup" aria-label={s.prompt}>
                  {s.options.map((o, oi) => {
                    const chosen = picked === oi;
                    const show = picked !== null;
                    const cls = show ? (o.correct ? "border-signal-green bg-signal-greenBg" : chosen ? "border-signal-red bg-signal-redBg" : "border-rule bg-white opacity-70") : "border-rule bg-white hover:border-ink-400";
                    return (
                      <button key={oi} role="radio" aria-checked={chosen} disabled={show} onClick={() => setPicks(picks.map((p, pi) => (pi === i ? oi : p)))} className={`block w-full rounded border px-3 py-2 text-left text-sm ${cls}`}>
                        {o.text}
                        {show && (chosen || o.correct) && <span className="mt-1 block text-xs text-ink-700">{o.feedback}</span>}
                      </button>
                    );
                  })}
                </div>
                {picked !== null && i === step && <button className="btn-primary mt-3" onClick={() => setStep(step + 1)}>{i + 1 < c.steps.length ? "Continue" : "Finish case"}</button>}
              </div>
            );
          })}

          {done && (
            <>
              <div className="panel panel-pad">
                <div className="kicker mb-1">Technical challenge</div>
                <p className="text-sm text-ink-700">{c.challenge.description}</p>
              </div>
              <div className="panel panel-pad border-teal-600/40">
                <div className="kicker mb-1">Expert explanation</div>
                <p className="text-sm text-ink-700">{c.expert}</p>
              </div>
              <div className="panel panel-pad">
                <div className="kicker mb-1">Final quality assessment — before the patient leaves</div>
                <ul className="space-y-1 text-sm text-ink-700">{c.qa.map((q) => <li key={q}>☐ {q}</li>)}</ul>
                <p className="mt-3 text-sm">Score: <span className="font-mono">{score}/{c.steps.length}</span></p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-secondary" onClick={() => { setStep(0); setPicks(c.steps.map(() => null)); }}>Restart case</button>
                  {c.protocolId && PROTOCOL_BY_ID[c.protocolId] && <Link className="btn-secondary" href={`/protocols/${c.protocolId}/`}>Related protocol</Link>}
                  <Link className="btn-ghost" href="/cases/">All cases</Link>
                </div>
              </div>
            </>
          )}
        </div>
        <aside className="space-y-3">
          {preset && (
            <figure className="panel p-3">
              <PhantomCanvas params={preset.p} opts={preset.opts} label={preset.label} />
              <figcaption className="mt-2 text-[11px] text-ink-500">Simulated example ({preset.label}) — synthetic phantom, educational illustration, not patient data.</figcaption>
            </figure>
          )}
          <p className="text-xs text-ink-500">Decisions here are technical/protocol choices. Diagnostic interpretation and reporting remain the radiologist&apos;s responsibility.</p>
        </aside>
      </div>
    </article>
  );
}
