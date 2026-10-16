import { cn } from "@/lib/utils";
import type React from "react";

export type Zone = 1 | 2 | 3 | 4;

export interface Room {
  id: string;
  name: string;
  zone: Zone;
  x: number;
  y: number;
  w: number;
  h: number;
  why: string;
}

/** A representative MR department layout. Real zoning follows the local approved safety programme. */
export const rooms: Room[] = [
  { id: "corridor", name: "Hospital corridor & main entrance", zone: 1, x: 0, y: 400, w: 800, h: 100, why: "Freely accessible to the general public and outside the MR environment." },
  { id: "reception", name: "MR reception & waiting", zone: 2, x: 0, y: 200, w: 220, h: 200, why: "Interface between public and controlled areas; patients are greeted and supervised by MR personnel." },
  { id: "changing", name: "Screening & changing rooms", zone: 2, x: 0, y: 0, w: 220, h: 200, why: "Screening and changing into gowns happen before entry to restricted areas." },
  { id: "prep", name: "Prep / induction bay (inside controlled area)", zone: 3, x: 220, y: 0, w: 220, h: 200, why: "Physically restricted; only MR personnel and screened people under their supervision." },
  { id: "control", name: "Control room", zone: 3, x: 220, y: 200, w: 220, h: 200, why: "Physically restricted area from which Zone IV is accessed and observed." },
  { id: "scanner", name: "Scanner room", zone: 4, x: 440, y: 0, w: 360, h: 400, why: "Contains the magnet; screened people only, under direct supervision of Level 2 MR personnel." },
];

export const zoneStyle: Record<Zone, { fill: string; stroke: string; label: string; text: string }> = {
  1: { fill: "#1e3a5f", stroke: "#60a5fa", label: "Zone I", text: "#bfdbfe" },
  2: { fill: "#14532d", stroke: "#4ade80", label: "Zone II", text: "#bbf7d0" },
  3: { fill: "#713f12", stroke: "#facc15", label: "Zone III", text: "#fef08a" },
  4: { fill: "#7f1d1d", stroke: "#f87171", label: "Zone IV", text: "#fecaca" },
};

function wrap(text: string, max: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max && cur) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

export function ZoneMap({
  assigned,
  selected,
  onSelect,
  showAnswers = false,
  className,
}: {
  assigned?: Partial<Record<string, Zone>>;
  selected?: string | null;
  onSelect?: (id: string) => void;
  showAnswers?: boolean;
  className?: string;
}) {
  return (
    <svg viewBox="-10 -10 820 520" className={cn("w-full", className)} role="group" aria-label="MR department floor plan">
      {rooms.map((r) => {
        const z = showAnswers ? r.zone : assigned?.[r.id];
        const st = z ? zoneStyle[z] : null;
        const isSel = selected === r.id;
        const interactive = !!onSelect;
        return (
          <g
            key={r.id}
            {...(interactive
              ? {
                  role: "button",
                  tabIndex: 0,
                  "aria-label": `${r.name}${z ? `, assigned ${zoneStyle[z].label}` : ", unassigned"}`,
                  "aria-pressed": isSel,
                  onClick: () => onSelect?.(r.id),
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect?.(r.id);
                    }
                  },
                  className: "cursor-pointer focus:outline-none [&:focus>rect]:stroke-cyan-300",
                }
              : {})}
          >
            <rect
              x={r.x + 3}
              y={r.y + 3}
              width={r.w - 6}
              height={r.h - 6}
              rx="10"
              fill={st ? st.fill : "#0f1d38"}
              fillOpacity={st ? 0.75 : 1}
              stroke={isSel ? "#67e8f9" : st ? st.stroke : "#334155"}
              strokeWidth={isSel ? 5 : 2}
            />
            {(() => {
              const lines = wrap(r.name.split(" (")[0], Math.floor(r.w / 9));
              const top = r.id === "scanner" ? r.y + 34 : r.y + r.h / 2 - (lines.length * 17) / 2;
              return (
                <>
                  <text x={r.x + r.w / 2} y={top} textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="600">
                    {lines.map((l, i) => (
                      <tspan key={i} x={r.x + r.w / 2} dy={i === 0 ? 0 : 17}>
                        {l}
                      </tspan>
                    ))}
                  </text>
                  <text x={r.x + r.w / 2} y={top + lines.length * 17 + 4} textAnchor="middle" fill={st ? st.text : "#64748b"} fontSize="13" fontWeight="700">
                    {st ? st.label : "Unassigned"}
                  </text>
                </>
              );
            })()}
          </g>
        );
      })}
      {/* magnet glyph */}
      <g pointerEvents="none" opacity="0.8">
        <rect x="560" y="130" width="120" height="150" rx="20" fill="none" stroke="#cbd5e1" strokeWidth="3" />
        <circle cx="620" cy="205" r="38" fill="none" stroke="#22d3ee" strokeWidth="3" />
        <rect x="605" y="280" width="30" height="90" rx="4" fill="none" stroke="#cbd5e1" strokeWidth="2" />
      </g>
      {/* doors */}
      <g pointerEvents="none" stroke="#e2e8f0" strokeWidth="6" strokeLinecap="round">
        <line x1="80" y1="400" x2="140" y2="400" />
        <line x1="220" y1="270" x2="220" y2="330" />
        <line x1="440" y1="270" x2="440" y2="330" />
        <line x1="290" y1="200" x2="370" y2="200" />
        <line x1="80" y1="200" x2="140" y2="200" />
      </g>
      {/* observation window */}
      <line x1="440" y1="215" x2="440" y2="255" stroke="#67e8f9" strokeWidth="8" pointerEvents="none" />
    </svg>
  );
}
