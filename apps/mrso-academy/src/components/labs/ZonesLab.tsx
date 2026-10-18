"use client";

import { useState } from "react";
import { rooms, ZoneMap, zoneStyle, type Zone } from "@/components/art/ZoneMap";
import { progress } from "@/lib/progress";
import { Button } from "@/components/ui";
import { ScoreBanner } from "./LabShell";

const doors = [
  {
    id: "d1",
    name: "Corridor → MR reception (Zone I → II)",
    options: ["Open to the public during opening hours, with MR staff supervising reception", "Locked; MR personnel only", "No door needed"],
    correct: 0,
    why: "Zone II is where patients are greeted and screened under supervision of MR personnel; it is not locked to patients.",
  },
  {
    id: "d2",
    name: "Reception → control room (Zone II → III)",
    options: ["Unlocked so patients can find the scanner", "Physically restricted (badge/keypad), opened by MR personnel", "A warning sign only"],
    correct: 1,
    why: "Zone III must be physically restricted from the general public, with access controlled by MR personnel.",
  },
  {
    id: "d3",
    name: "Control room → scanner room (Zone III → IV)",
    options: [
      "Propped open during lists for workflow",
      "Kept closed when not in use, in direct view of the operator, entry under Level 2 supervision after screening",
      "Locked permanently, key held by estates",
    ],
    correct: 1,
    why: "Zone IV entry is under direct supervision of Level 2 MR personnel; the door should be visible and kept closed when not in active use.",
  },
];

export function ZonesLab() {
  const [assigned, setAssigned] = useState<Partial<Record<string, Zone>>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [doorAns, setDoorAns] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState(false);

  const roomScore = rooms.filter((r) => assigned[r.id] === r.zone).length;
  const doorScore = doors.filter((d) => doorAns[d.id] === d.correct).length;
  const complete = rooms.every((r) => assigned[r.id]) && doors.every((d) => doorAns[d.id] !== undefined);

  const check = () => {
    setChecked(true);
    progress.recordLab("zones", roomScore + doorScore, rooms.length + doors.length, "MRI Safety Zone Identification");
  };
  const reset = () => {
    setAssigned({});
    setDoorAns({});
    setChecked(false);
    setSelected(null);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-5">
        <h2 className="font-semibold text-white">Part 1 — Assign each area to a zone</h2>
        <p className="mt-1 text-sm text-slate-400">Select an area on the plan (or use the list), then choose its zone.</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <ZoneMap assigned={assigned} selected={selected} onSelect={(id) => !checked && setSelected(id)} showAnswers={false} />
          <ul className="space-y-3">
            {rooms.map((r) => {
              const ok = checked && assigned[r.id] === r.zone;
              return (
                <li key={r.id} className={`rounded-xl border p-3 ${selected === r.id ? "border-cyan-400" : "border-white/10"}`}>
                  <label className="block text-sm font-medium text-white" htmlFor={`z-${r.id}`}>
                    {r.name}
                  </label>
                  <select
                    id={`z-${r.id}`}
                    disabled={checked}
                    value={assigned[r.id] ?? ""}
                    onFocus={() => setSelected(r.id)}
                    onChange={(e) => setAssigned((a) => ({ ...a, [r.id]: Number(e.target.value) as Zone }))}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-navy-950 px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  >
                    <option value="" disabled>
                      Choose zone…
                    </option>
                    {([1, 2, 3, 4] as Zone[]).map((z) => (
                      <option key={z} value={z}>
                        {zoneStyle[z].label}
                      </option>
                    ))}
                  </select>
                  {checked && (
                    <p className={`mt-1 text-xs ${ok ? "text-safe-400" : "text-hazard-400"}`}>
                      {ok ? "✓ Correct" : `✗ ${zoneStyle[r.zone].label}`} — {r.why}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        {selected && !checked && (
          <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label={`Assign zone to ${rooms.find((r) => r.id === selected)?.name}`}>
            <span className="text-sm text-slate-300">Assign {rooms.find((r) => r.id === selected)?.name}:</span>
            {([1, 2, 3, 4] as Zone[]).map((z) => (
              <Button key={z} variant="secondary" className="px-3 py-1.5" onClick={() => setAssigned((a) => ({ ...a, [selected]: z }))}>
                {zoneStyle[z].label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-5">
        <h2 className="font-semibold text-white">Part 2 — Choose the access control for each door</h2>
        <div className="mt-4 space-y-5">
          {doors.map((d) => (
            <fieldset key={d.id}>
              <legend className="text-sm font-medium text-white">{d.name}</legend>
              <div className="mt-2 space-y-2">
                {d.options.map((o, i) => (
                  <label key={i} className="flex cursor-pointer gap-2 rounded-lg border border-white/10 p-2.5 text-sm text-slate-200 focus-within:ring-2 focus-within:ring-cyan-300 hover:bg-white/5">
                    <input type="radio" name={d.id} disabled={checked} checked={doorAns[d.id] === i} onChange={() => setDoorAns((a) => ({ ...a, [d.id]: i }))} className="mt-0.5 accent-cyan-400" />
                    {o}
                  </label>
                ))}
              </div>
              {checked && (
                <p className={`mt-1 text-xs ${doorAns[d.id] === d.correct ? "text-safe-400" : "text-hazard-400"}`}>
                  {doorAns[d.id] === d.correct ? "✓ Correct" : `✗ Best: ${d.options[d.correct]}`} — {d.why}
                </p>
              )}
            </fieldset>
          ))}
        </div>
      </div>

      {checked ? (
        <>
          <ScoreBanner score={roomScore + doorScore} total={rooms.length + doors.length}>
            Zone definitions and operational policies must follow current guidance and your facility&apos;s approved safety programme.
          </ScoreBanner>
          <Button onClick={reset}>Try again</Button>
        </>
      ) : (
        <div>
          <Button onClick={check} disabled={!complete}>
            Check answers
          </Button>
          {!complete && <p className="mt-2 text-xs text-slate-400">Assign every area and answer every door question to check.</p>}
        </div>
      )}
    </div>
  );
}
