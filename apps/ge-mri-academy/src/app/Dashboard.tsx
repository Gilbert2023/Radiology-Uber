"use client";

import Link from "next/link";
import { useState } from "react";
import { PARAMETERS, PARAM_BY_ID } from "@/content/parameters";
import { SEQUENCES, SEQ_BY_ID } from "@/content/sequences";
import { PROTOCOLS, PROTOCOL_BY_ID } from "@/content/protocols";
import { CASES } from "@/content/cases";
import { QUESTIONS } from "@/content/questions";
import { progress, storageAvailable, useProgress } from "@/lib/progress";
import { Callout, Chip, ProgressBar } from "@/components/ui";

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="panel panel-pad">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-serif text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-ink-500">{children}</p>;

export function Dashboard() {
  const s = useProgress();
  const [confirmReset, setConfirmReset] = useState(false);

  const paramsDone = PARAMETERS.filter((p) => s.completed[`parameter:${p.id}`]).length;
  const seqVisited = SEQUENCES.filter((x) => s.visited[`sequence:${x.id}`]).length;
  const protVisited = PROTOCOLS.filter((x) => s.visited[`protocol:${x.id}`]).length;
  const casesDone = CASES.filter((c) => s.caseResults[c.id]).length;
  const answered = Object.keys(s.questionHistory).length;
  const correct = Object.values(s.questionHistory).filter((h) => h.correct).length;

  const last = s.activity[0];
  const recentLessons = s.activity.filter((a) => a.kind === "parameter" || a.kind === "physics").slice(0, 5);
  const recentSeq = s.activity.filter((a) => a.kind === "sequence").slice(0, 5);
  const bookmarkedParams = s.bookmarks.filter((b) => b.startsWith("parameter:")).map((b) => PARAM_BY_ID[b.slice(10)]).filter(Boolean);
  const otherBookmarks = s.bookmarks.filter((b) => !b.startsWith("parameter:"));
  const next = PARAMETERS.find((p) => !s.completed[`parameter:${p.id}`]);
  const nextCase = CASES.find((c) => !s.caseResults[c.id]);

  const exportData = () => {
    const blob = new Blob([progress.exportJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ge-mri-academy-progress.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <div className="mb-8 grid gap-6 border-b border-rule pb-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="kicker mb-2">GE 1.5T MRI Protocol Mastery &amp; Clinical Simulation Academy</div>
          <h1 className="font-serif text-[2.2rem] font-semibold leading-tight sm:text-[2.6rem]">GE MRI Protocol Mastery</h1>
          <p className="mt-1 font-serif text-xl text-ink-600">From Console Parameters to Clinical Decisions</p>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-600">
            Learn what every console parameter does physically, how it changes the image, and how a radiographer reasons through real examinations — from the axial FRFSE T2 prescription screen to stroke, spine, MSK and abdominal protocols.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {last ? <Link href={last.href} className="btn-primary">Continue: {last.label}</Link> : <Link href="/console/" className="btn-primary">Start with the Console Walkthrough</Link>}
            <Link href="/simulator/" className="btn-secondary">Open the simulator</Link>
            <Link href="/protocols/" className="btn-secondary">Protocol library</Link>
          </div>
        </div>
        <Panel title="Learning progress">
          <div className="space-y-3">
            <ProgressBar label={`Parameters studied (${paramsDone}/${PARAMETERS.length})`} value={paramsDone / PARAMETERS.length} />
            <ProgressBar label={`Sequences explored (${seqVisited}/${SEQUENCES.length})`} value={seqVisited / SEQUENCES.length} />
            <ProgressBar label={`Protocols reviewed (${protVisited}/${PROTOCOLS.length})`} value={protVisited / PROTOCOLS.length} />
            <ProgressBar label={`Cases completed (${casesDone}/${CASES.length})`} value={casesDone / CASES.length} />
            <ProgressBar label={`Questions answered (${answered}/${QUESTIONS.length}) · ${answered ? Math.round((correct / answered) * 100) : 0}% correct`} value={answered / QUESTIONS.length} />
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Panel title="Recommended next lesson">
          {next ? (
            <>
              <p className="text-sm text-ink-600">Next in the curriculum order ({next.group}):</p>
              <Link href={`/parameters/${next.id}/`} className="mt-2 block text-[15px] font-semibold">{next.label} →</Link>
              <p className="mt-1 text-sm text-ink-600">{next.definition}</p>
            </>
          ) : (
            <Empty>All parameters marked as studied. Try a timed mock examination.</Empty>
          )}
        </Panel>
        <Panel title="Recent lessons">
          {recentLessons.length ? (
            <ul className="space-y-1.5 text-sm">{recentLessons.map((a) => <li key={a.href}><Link href={a.href}>{a.label}</Link></li>)}</ul>
          ) : <Empty>No lessons opened yet.</Empty>}
        </Panel>
        <Panel title="Recently studied sequences">
          {recentSeq.length ? (
            <ul className="space-y-1.5 text-sm">{recentSeq.map((a) => <li key={a.href}><Link href={a.href}>{a.label}</Link></li>)}</ul>
          ) : <Empty>Open the <Link href="/sequences/">Sequence Library</Link> to begin.</Empty>}
        </Panel>
        <Panel title="Bookmarked parameters">
          {bookmarkedParams.length ? (
            <ul className="space-y-1.5 text-sm">{bookmarkedParams.map((p) => <li key={p.id}><Link href={`/parameters/${p.id}/`}>{p.label}</Link></li>)}</ul>
          ) : <Empty>Use “Bookmark” on any parameter lesson.</Empty>}
          {otherBookmarks.length > 0 && <p className="mt-3 text-xs text-ink-500">+ {otherBookmarks.length} other bookmarked item(s) — see <Link href="/search/?bookmarks=1">all bookmarks</Link>.</p>}
        </Panel>
        <Panel title="Saved protocols">
          {s.savedProtocols.length ? (
            <ul className="space-y-1.5 text-sm">{s.savedProtocols.map((id) => PROTOCOL_BY_ID[id] && <li key={id}><Link href={`/protocols/${id}/`}>{PROTOCOL_BY_ID[id].title}</Link> <Chip>{PROTOCOL_BY_ID[id].region}</Chip></li>)}</ul>
          ) : <Empty>Save protocols from the <Link href="/protocols/">Protocol Library</Link>.</Empty>}
        </Panel>
        <Panel title="Clinical case challenges">
          <ul className="space-y-1.5 text-sm">
            {CASES.slice(0, 5).map((c) => (
              <li key={c.id} className="flex items-baseline justify-between gap-2">
                <Link href={`/cases/${c.id}/`}>{c.title}</Link>
                {s.caseResults[c.id] ? <span className="font-mono text-xs text-signal-green">{s.caseResults[c.id].score}/{s.caseResults[c.id].total}</span> : <Chip>{c.difficulty}</Chip>}
              </li>
            ))}
          </ul>
          {nextCase && <Link href={`/cases/${nextCase.id}/`} className="btn-secondary mt-3">Next case: {nextCase.title}</Link>}
        </Panel>
        <Panel title="Practice examination">
          <p className="text-sm text-ink-600">{QUESTIONS.length} clinical-reasoning questions across physics, parameters, sequences, protocols, artefacts and safety.</p>
          {s.exams[0] && <p className="mt-2 text-sm">Last attempt: <span className="font-mono">{s.exams[0].correct}/{s.exams[0].total}</span> ({s.exams[0].mode}, {new Date(s.exams[0].date).toLocaleDateString("en-GB")})</p>}
          <Link href="/assessments/" className="btn-primary mt-3">Go to assessments</Link>
        </Panel>
        <Panel title="Saved simulator configurations">
          {s.savedConfigs.length ? (
            <ul className="space-y-1.5 text-sm">{s.savedConfigs.slice(0, 5).map((c) => <li key={c.id}><Link href={`/simulator/?config=${c.id}`}>{c.name}</Link></li>)}</ul>
          ) : <Empty>Save a configuration from the <Link href="/simulator/">simulator</Link>.</Empty>}
        </Panel>
        <Panel title="Your data">
          <p className="text-sm text-ink-600">Progress, bookmarks and saved items are stored only in this browser (localStorage). They do not sync between devices and are erased if site data is cleared.</p>
          {!storageAvailable() && <div className="mt-2"><Callout tone="warn">Browser storage is unavailable (e.g. private mode). Progress will not persist.</Callout></div>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={exportData}>Export progress (JSON)</button>
            {confirmReset ? (
              <>
                <button className="btn-secondary border-signal-red text-signal-red" onClick={() => { progress.reset(); setConfirmReset(false); }}>Confirm reset</button>
                <button className="btn-ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
              </>
            ) : <button className="btn-ghost" onClick={() => setConfirmReset(true)}>Reset progress</button>}
          </div>
        </Panel>
      </div>

      <div className="mt-8">
        <Callout tone="safety" title="Clinical governance">
          A learning platform, not a clinical prescription tool. Every protocol and parameter must be verified against local policy, radiologist instructions, current GE HealthCare guidance for your software release, and patient-specific MRI safety screening. See <Link href="/safety/">MRI Safety</Link>.
        </Callout>
      </div>
    </div>
  );
}
