import type { IllustrationKey } from "@/content/types";
import { SafetySign } from "./SafetySign";
import { ZoneMap } from "./ZoneMap";

const captions: Record<IllustrationKey, string> = {
  "fringe-field": "Schematic fringe-field contours around an actively shielded magnet (not to scale). Use the vendor siting plan for real contour positions.",
  zones: "Representative department zoning. Real zoning follows the facility's approved safety programme.",
  projectile: "Translational force rises steeply near the bore entrance where the spatial field gradient peaks; torque is greatest where B0 is highest.",
  labels: "ASTM F2503 labelling icons: MR Safe, MR Conditional and MR Unsafe.",
  "rf-loop": "RF can induce current in a conductive loop; heating concentrates where the loop has a small contact point.",
  gradient: "Rapid gradient switching (high dB/dt) induces electric fields that can stimulate nerves and causes acoustic noise.",
  cryostat: "Simplified cross-section of a superconducting magnet cryostat with quench pipe venting outside.",
  screening: "Two-stage screening: written questionnaire, then verbal review by Level 2 MR personnel, then final check at Zone IV.",
  governance: "Typical MR safety governance structure. Titles and responsibilities vary by jurisdiction.",
};

const T = ({ x, y, children, size = 14, fill = "#cbd5e1", anchor = "middle" }: { x: number; y: number; children: React.ReactNode; size?: number; fill?: string; anchor?: "start" | "middle" | "end" }) => (
  <text x={x} y={y} fontSize={size} fill={fill} textAnchor={anchor} fontFamily="inherit">
    {children}
  </text>
);

function Art({ k }: { k: IllustrationKey }) {
  switch (k) {
    case "fringe-field":
      return (
        <svg viewBox="0 0 600 300" className="w-full">
          {[260, 200, 145, 95].map((rx, i) => (
            <ellipse key={rx} cx="300" cy="150" rx={rx} ry={rx * 0.52} fill="none" stroke={["#60a5fa", "#4ade80", "#facc15", "#f87171"][i]} strokeWidth="2" strokeDasharray={i === 0 ? "6 6" : undefined} />
          ))}
          <rect x="250" y="110" width="100" height="80" rx="14" fill="#cbd5e1" />
          <circle cx="300" cy="150" r="24" fill="#0b1328" stroke="#22d3ee" strokeWidth="3" />
          <T x={300} y={18} fill="#60a5fa">0.5 mT (5 G)</T>
          <T x={300} y={55} fill="#4ade80">higher mT contours</T>
          <T x={300} y={86} fill="#facc15">steep gradient region</T>
          <T x={300} y={225} fill="#f87171">B0 (1.5 T / 3 T)</T>
        </svg>
      );
    case "zones":
      return <ZoneMap showAnswers />;
    case "projectile":
      return (
        <svg viewBox="0 0 600 300" className="w-full">
          <line x1="40" y1="250" x2="560" y2="250" stroke="#475569" />
          <line x1="40" y1="250" x2="40" y2="30" stroke="#475569" />
          <T x={300} y={285}>Distance from bore entrance → isocentre</T>
          <path d="M40 245 C200 244 300 230 360 120 C380 80 390 70 420 160 C450 230 500 240 560 242" fill="none" stroke="#f87171" strokeWidth="3" />
          <T x={395} y={60} fill="#f87171">Translational force (∝ SFG)</T>
          <path d="M40 248 C250 246 330 200 400 80 C430 40 480 40 560 40" fill="none" stroke="#22d3ee" strokeWidth="3" strokeDasharray="8 6" />
          <T x={520} y={30} fill="#22d3ee">B0 / torque</T>
          <rect x="70" y="190" width="22" height="50" rx="6" fill="#94a3b8" />
          <T x={81} y={182} size={12}>cylinder</T>
          <path d="M100 215 H180" stroke="#f87171" strokeWidth="3" markerEnd="url(#a)" />
          <defs>
            <marker id="a" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0 0 L8 4 L0 8 Z" fill="#f87171" />
            </marker>
          </defs>
        </svg>
      );
    case "labels":
      return (
        <div className="flex flex-wrap items-start justify-center gap-8 py-4">
          {(["mr-safe", "mr-conditional", "mr-unsafe"] as const).map((s) => (
            <div key={s} className="flex w-36 flex-col items-center text-center">
              <SafetySign kind={s} size={88} />
              <span className="mt-2 text-sm font-semibold text-white">{s === "mr-safe" ? "MR Safe" : s === "mr-conditional" ? "MR Conditional" : "MR Unsafe"}</span>
            </div>
          ))}
        </div>
      );
    case "rf-loop":
      return (
        <svg viewBox="0 0 600 300" className="w-full">
          <ellipse cx="300" cy="150" rx="250" ry="120" fill="none" stroke="#334155" strokeWidth="2" />
          <T x={300} y={22} size={12}>transmit coil / bore</T>
          {/* torso and arms */}
          <rect x="230" y="80" width="140" height="150" rx="40" fill="#1e293b" stroke="#94a3b8" />
          <path d="M230 110 C190 140 200 200 270 215" fill="none" stroke="#94a3b8" strokeWidth="14" strokeLinecap="round" />
          <path d="M370 110 C410 140 400 200 330 215" fill="none" stroke="#94a3b8" strokeWidth="14" strokeLinecap="round" />
          <circle cx="300" cy="215" r="12" fill="#ef4444" opacity="0.9" />
          <circle cx="300" cy="215" r="24" fill="#ef4444" opacity="0.25" />
          <path d="M215 160 A85 60 0 1 0 385 160" fill="none" stroke="#facc15" strokeWidth="2" strokeDasharray="6 5" />
          <T x={300} y={270} fill="#fca5a5">Hands touching → closed loop → hot spot</T>
        </svg>
      );
    case "gradient":
      return (
        <svg viewBox="0 0 600 220" className="w-full">
          <line x1="20" y1="110" x2="580" y2="110" stroke="#475569" />
          <path d="M20 110 H80 L100 40 H180 L200 110 H240 L260 180 H340 L360 110 H400 L420 40 H500 L520 110 H580" fill="none" stroke="#22d3ee" strokeWidth="3" />
          {[[90, 75], [190, 75], [250, 145], [350, 145], [410, 75], [510, 75]].map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r="7" fill="#f87171" />
          ))}
          <T x={300} y={210} fill="#fca5a5">Steep ramps = high dB/dt → induced E-field → PNS risk</T>
          <T x={140} y={30} fill="#67e8f9">gradient amplitude</T>
        </svg>
      );
    case "cryostat":
      return (
        <svg viewBox="0 0 600 300" className="w-full">
          <rect x="140" y="70" width="320" height="200" rx="30" fill="#334155" />
          <rect x="160" y="90" width="280" height="160" rx="24" fill="#1e3a5f" />
          <rect x="180" y="110" width="240" height="120" rx="18" fill="#0e7490" fillOpacity="0.5" />
          <rect x="200" y="130" width="200" height="80" rx="12" fill="none" stroke="#fbbf24" strokeWidth="6" />
          <circle cx="300" cy="170" r="28" fill="#0b1328" stroke="#94a3b8" />
          <rect x="285" y="10" width="30" height="62" fill="#64748b" />
          <path d="M300 10 V-5" stroke="#64748b" />
          <T x={330} y={30} anchor="start">quench pipe → outside</T>
          <rect x="380" y="40" width="40" height="32" fill="#475569" />
          <T x={430} y={60} anchor="start">coldhead</T>
          <T x={300} y={290}>vacuum vessel · thermal shield · liquid He (~4 K) · windings</T>
        </svg>
      );
    case "screening":
      return (
        <svg viewBox="0 0 600 180" className="w-full">
          {["Written questionnaire", "Verbal review (Level 2)", "Records & imaging cross-check", "Final check at Zone IV"].map((t, i) => (
            <g key={t}>
              <rect x={10 + i * 148} y="50" width="132" height="80" rx="14" fill="#0f1d38" stroke="#22d3ee" />
              <text x={76 + i * 148} y="86" textAnchor="middle" fontSize="13" fill="#e2e8f0">
                {t.split(" ").slice(0, 2).join(" ")}
              </text>
              <text x={76 + i * 148} y="106" textAnchor="middle" fontSize="13" fill="#e2e8f0">
                {t.split(" ").slice(2).join(" ")}
              </text>
              {i < 3 && <path d={`M${142 + i * 148} 90 h14`} stroke="#22d3ee" strokeWidth="3" />}
            </g>
          ))}
          <T x={300} y={165} fill="#facc15">Any unresolved discrepancy → stop and escalate</T>
        </svg>
      );
    case "governance":
      return (
        <svg viewBox="0 0 600 240" className="w-full">
          {[
            { x: 225, y: 10, t: "MR Medical Director" },
            { x: 60, y: 110, t: "MR Safety Officer" },
            { x: 390, y: 110, t: "MR Safety Expert" },
            { x: 225, y: 190, t: "MR Safety Committee" },
          ].map((b) => (
            <g key={b.t}>
              <rect x={b.x} y={b.y} width="150" height="44" rx="10" fill="#0f1d38" stroke="#22d3ee" />
              <T x={b.x + 75} y={b.y + 27} size={13} fill="#e2e8f0">{b.t}</T>
            </g>
          ))}
          <path d="M300 54 V80 H135 V110 M300 80 H465 V110 M135 154 V172 H300 V190 M465 154 V172 H300" fill="none" stroke="#475569" strokeWidth="2" />
        </svg>
      );
  }
}

export function LessonIllustration({ k }: { k: IllustrationKey }) {
  return (
    <figure className="rounded-2xl border border-white/10 bg-navy-950/60 p-4">
      <div role="img" aria-label={captions[k]}>
        <Art k={k} />
      </div>
      <figcaption className="mt-3 text-xs text-slate-400">Figure: {captions[k]}</figcaption>
    </figure>
  );
}
