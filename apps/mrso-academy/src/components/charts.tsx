/** Lightweight, dependency-free SVG/CSS charts with text alternatives. */

export function Ring({ value, label, size = 120 }: { value: number; label: string; size?: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`${label}: ${v}%`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="9" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="#22d3ee"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${(v / 100) * c} ${c}`}
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="56" textAnchor="middle" fontSize="20" fontWeight="700" fill="#fff">
        {v}%
      </text>
    </svg>
  );
}

export function BarList({ data, emptyText }: { data: { label: string; value: number; detail?: string }[]; emptyText: string }) {
  if (!data.length) return <p className="text-sm text-slate-400">{emptyText}</p>;
  return (
    <ul className="space-y-3">
      {data.map((d) => {
        const tone = d.value >= 80 ? "from-safe-500 to-safe-400" : d.value >= 60 ? "from-caution-500 to-caution-400" : "from-hazard-600 to-hazard-400";
        return (
          <li key={d.label}>
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">{d.label}</span>
              <span className="text-slate-400">
                {d.value}%{d.detail ? ` · ${d.detail}` : ""}
              </span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${d.label} ${d.value}%`}>
              <div className={`h-full rounded-full bg-gradient-to-r ${tone}`} style={{ width: `${d.value}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Simple line/column chart for score history. */
export function ScoreHistory({ points }: { points: { label: string; value: number }[] }) {
  if (points.length === 0) return <p className="text-sm text-slate-400">No exam attempts yet.</p>;
  const w = 300;
  const h = 120;
  const step = points.length > 1 ? w / (points.length - 1) : 0;
  const coords = points.map((p, i) => [points.length > 1 ? i * step : w / 2, h - (p.value / 100) * h] as const);
  return (
    <figure>
      <svg viewBox={`-10 -10 ${w + 20} ${h + 30}`} className="w-full" role="img" aria-label={`Exam score history: ${points.map((p) => `${p.label} ${p.value}%`).join(", ")}`}>
        <line x1="0" y1={h - 0.8 * h} x2={w} y2={h - 0.8 * h} stroke="#facc15" strokeDasharray="4 4" strokeOpacity="0.6" />
        <text x={w} y={h - 0.8 * h - 4} fontSize="9" fill="#facc15" textAnchor="end">80%</text>
        <line x1="0" y1={h} x2={w} y2={h} stroke="#334155" />
        {coords.length > 1 && <polyline points={coords.map((c) => c.join(",")).join(" ")} fill="none" stroke="#22d3ee" strokeWidth="2.5" />}
        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="4" fill="#22d3ee" />
        ))}
      </svg>
    </figure>
  );
}
