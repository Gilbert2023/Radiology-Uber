"use client";

import { useRef, useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { progress } from "@/lib/progress";
import { labById } from "@/content/labs";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ScoreBanner } from "./LabShell";

export interface Choice {
  text: string;
  quality: "best" | "acceptable" | "unsafe";
  feedback: string;
  /** Node to go to after this choice; defaults to the scenario's natural next node. */
  next?: string;
}

export interface ScenarioNode {
  id: string;
  title: string;
  context: string;
  /** Optional facts revealed at this step (e.g. records found). */
  facts?: string[];
  prompt: string;
  choices: Choice[];
  next?: string;
  /** Visual cue for the step. */
  tone?: "normal" | "alert";
}

export interface Scenario {
  start: string;
  nodes: Record<string, ScenarioNode>;
  debrief: string[];
}

const qualityStyle = {
  best: { icon: CheckCircle2, cls: "border-safe-500/50 bg-safe-500/10", label: "Best action", color: "text-safe-400" },
  acceptable: { icon: AlertTriangle, cls: "border-caution-400/50 bg-caution-400/10", label: "Acceptable but not optimal", color: "text-caution-400" },
  unsafe: { icon: XCircle, cls: "border-hazard-500/50 bg-hazard-500/10", label: "Unsafe", color: "text-hazard-400" },
};

export function BranchingScenario({ labId, scenario }: { labId: string; scenario: Scenario }) {
  const [nodeId, setNodeId] = useState<string | null>(scenario.start);
  const [chosen, setChosen] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [log, setLog] = useState<{ node: string; choice: number }[]>([]);
  const [run, setRun] = useState(0);
  const headRef = useRef<HTMLHeadingElement>(null);

  const prevNode = useRef(nodeId);
  useEffect(() => {
    if (prevNode.current !== nodeId) headRef.current?.focus();
    prevNode.current = nodeId;
  }, [nodeId]);

  const node = nodeId ? scenario.nodes[nodeId] : null;
  const score = log.filter((l) => scenario.nodes[l.node].choices[l.choice].quality === "best").length;

  const advance = () => {
    if (!node || chosen === null) return;
    const c = node.choices[chosen];
    const nextLog = [...log, { node: node.id, choice: chosen }];
    setLog(nextLog);
    const nxt = c.next ?? node.next ?? null;
    setChosen(null);
    setConfirmed(false);
    setNodeId(nxt);
    if (!nxt) {
      const s = nextLog.filter((l) => scenario.nodes[l.node].choices[l.choice].quality === "best").length;
      progress.recordLab(labId, s, nextLog.length, labById[labId].title);
    }
  };

  const restart = () => {
    setNodeId(scenario.start);
    setChosen(null);
    setConfirmed(false);
    setLog([]);
    setRun((r) => r + 1);
  };

  if (!node) {
    return (
      <div className="space-y-6" key={run}>
        <ScoreBanner score={score} total={log.length}>
          Best actions chosen at {score} of {log.length} decision points.
        </ScoreBanner>
        <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-5">
          <h2 className="font-semibold text-white">Your decisions</h2>
          <ol className="mt-3 space-y-3">
            {log.map((l, i) => {
              const n = scenario.nodes[l.node];
              const c = n.choices[l.choice];
              const best = n.choices.find((x) => x.quality === "best");
              const Q = qualityStyle[c.quality];
              return (
                <li key={i} className="rounded-xl bg-white/5 p-3 text-sm">
                  <p className="font-medium text-white">
                    {i + 1}. {n.title}
                  </p>
                  <p className={cn("mt-1", Q.color)}>
                    You chose: {c.text} — {Q.label}
                  </p>
                  {c.quality !== "best" && best && <p className="mt-1 text-safe-400">Best: {best.text}</p>}
                </li>
              );
            })}
          </ol>
        </div>
        <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-5">
          <h2 className="font-semibold text-white">Debrief</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
            {scenario.debrief.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
        <Button onClick={restart}>Run scenario again</Button>
      </div>
    );
  }

  const picked = confirmed && chosen !== null ? node.choices[chosen] : null;

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900/80">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-sm text-slate-400">
        <span>Decision point {log.length + 1}</span>
        <span>{score} best so far</span>
      </div>
      <div className="space-y-4 p-5 sm:p-6">
        <h2 ref={headRef} tabIndex={-1} className={cn("text-lg font-semibold focus:outline-none", node.tone === "alert" ? "text-hazard-400" : "text-white")}>
          {node.title}
        </h2>
        <p className="text-sm leading-relaxed text-slate-300">{node.context}</p>
        {node.facts && (
          <ul className="space-y-1 rounded-xl bg-white/5 p-4 text-sm text-slate-200">
            {node.facts.map((f) => (
              <li key={f}>• {f}</li>
            ))}
          </ul>
        )}
        <p className="font-medium text-white">{node.prompt}</p>
        <fieldset>
          <legend className="sr-only">{node.prompt}</legend>
          <ul className="space-y-2">
            {node.choices.map((c, i) => {
              const reveal = confirmed;
              const Q = qualityStyle[c.quality];
              return (
                <li key={i}>
                  <label
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-xl border p-3.5 text-sm focus-within:ring-2 focus-within:ring-cyan-300",
                      !reveal && "border-white/10 text-slate-200 hover:bg-white/5",
                      reveal && i === chosen && Q.cls,
                      reveal && i !== chosen && c.quality === "best" && "border-safe-500/30",
                      reveal && i !== chosen && c.quality !== "best" && "border-white/5 text-slate-500",
                      reveal && "cursor-default",
                    )}
                  >
                    <input type="radio" name={`node-${node.id}`} className="mt-0.5 h-4 w-4 accent-cyan-400" checked={chosen === i} disabled={reveal} onChange={() => setChosen(i)} />
                    <span className="flex-1 text-slate-100">{c.text}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
        {picked && (
          <div className={cn("rounded-xl border p-4 text-sm", qualityStyle[picked.quality].cls)} role="status">
            <p className={cn("font-semibold", qualityStyle[picked.quality].color)}>{qualityStyle[picked.quality].label}</p>
            <p className="mt-1 text-slate-200">{picked.feedback}</p>
          </div>
        )}
        <div className="flex justify-end">
          {!confirmed ? (
            <Button onClick={() => setConfirmed(true)} disabled={chosen === null}>
              Confirm decision
            </Button>
          ) : (
            <Button onClick={advance}>{(picked?.next ?? node.next) ? "Continue" : "Finish scenario"}</Button>
          )}
        </div>
      </div>
    </div>
  );
}
