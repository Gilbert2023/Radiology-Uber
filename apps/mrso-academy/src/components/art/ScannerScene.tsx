/**
 * Original illustrated MRI suite (front view of a cylindrical-bore scanner).
 * Used as the default hero background when no licensed photograph has been
 * configured in src/content/media.ts.
 */
export function ScannerScene({ className, fieldLines = true }: { className?: string; fieldLines?: boolean }) {
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label="Illustration of a cylindrical-bore MRI scanner in a dimly lit scanner room, with cyan bore lighting and stylised magnetic field lines."
    >
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1830" />
          <stop offset="0.62" stopColor="#0f2142" />
          <stop offset="1" stopColor="#081226" />
        </linearGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#13284d" />
          <stop offset="1" stopColor="#050b18" />
        </linearGradient>
        <radialGradient id="housing" cx="0.45" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="0.55" stopColor="#cbd5e1" />
          <stop offset="1" stopColor="#64748b" />
        </radialGradient>
        <radialGradient id="bore" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#0b1328" />
          <stop offset="0.7" stopColor="#1a2a4a" />
          <stop offset="0.92" stopColor="#c7d2fe" stopOpacity="0.5" />
          <stop offset="1" stopColor="#e2e8f0" />
        </radialGradient>
        <radialGradient id="boreLight" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#67e8f9" stopOpacity="0.45" />
          <stop offset="1" stopColor="#67e8f9" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ceilingGlow" cx="0.5" cy="0" r="0.6">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.25" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="table" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2e8f0" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>
        <filter id="blur8"><feGaussianBlur stdDeviation="8" /></filter>
        <filter id="blur30"><feGaussianBlur stdDeviation="30" /></filter>
      </defs>

      {/* room */}
      <rect width="1600" height="900" fill="url(#wall)" />
      <rect y="0" width="1600" height="400" fill="url(#ceilingGlow)" />
      {/* RF cage panel seams */}
      <g stroke="#1e3a66" strokeOpacity="0.5">
        {Array.from({ length: 17 }).map((_, i) => (
          <line key={i} x1={i * 100} y1="0" x2={i * 100} y2="640" />
        ))}
        <line x1="0" y1="120" x2="1600" y2="120" />
      </g>
      {/* ceiling light panels */}
      {[300, 700, 1100].map((x) => (
        <g key={x}>
          <rect x={x} y="28" width="200" height="22" rx="4" fill="#bae6fd" opacity="0.55" />
          <rect x={x - 40} y="40" width="280" height="80" fill="#bae6fd" opacity="0.08" filter="url(#blur30)" />
        </g>
      ))}
      {/* floor */}
      <path d="M0 640 H1600 V900 H0 Z" fill="url(#floor)" />
      <g stroke="#1d3561" strokeOpacity="0.6">
        <line x1="800" y1="640" x2="-400" y2="900" />
        <line x1="800" y1="640" x2="200" y2="900" />
        <line x1="800" y1="640" x2="1400" y2="900" />
        <line x1="800" y1="640" x2="2000" y2="900" />
        <line x1="0" y1="700" x2="1600" y2="700" />
        <line x1="0" y1="790" x2="1600" y2="790" />
      </g>

      {/* field lines */}
      {fieldLines && (
        <g fill="none" stroke="#22d3ee" strokeWidth="1.6" strokeOpacity="0.35" strokeDasharray="6 10" className="animate-fieldline">
          {[1, 2, 3, 4, 5].map((k) => (
            <ellipse key={k} cx="1000" cy="420" rx={230 + k * 90} ry={180 + k * 55} />
          ))}
        </g>
      )}

      {/* scanner shadow */}
      <ellipse cx="1000" cy="690" rx="420" ry="40" fill="#000" opacity="0.55" filter="url(#blur8)" />

      {/* gantry housing */}
      <path d="M660 680 V300 Q660 140 820 130 H1180 Q1340 140 1340 300 V680 Z" fill="url(#housing)" />
      <path d="M660 680 V300 Q660 140 820 130 H1180 Q1340 140 1340 300 V680 Z" fill="none" stroke="#f1f5f9" strokeOpacity="0.6" strokeWidth="3" />
      {/* side accent strips */}
      <rect x="676" y="300" width="10" height="330" rx="5" fill="#22d3ee" opacity="0.8" />
      <rect x="1314" y="300" width="10" height="330" rx="5" fill="#22d3ee" opacity="0.8" />

      {/* bore */}
      <circle cx="1000" cy="410" r="250" fill="url(#boreLight)" filter="url(#blur30)" />
      <circle cx="1000" cy="410" r="205" fill="#e2e8f0" />
      <circle cx="1000" cy="410" r="196" fill="none" stroke="#22d3ee" strokeWidth="6" className="animate-pulseRing" />
      <circle cx="1000" cy="410" r="180" fill="url(#bore)" />
      <circle cx="1000" cy="410" r="120" fill="#0a1226" />
      <circle cx="1000" cy="410" r="70" fill="#060b18" />
      {/* bore interior light */}
      <ellipse cx="1000" cy="300" rx="90" ry="14" fill="#a5f3fc" opacity="0.35" filter="url(#blur8)" />

      {/* display panel */}
      <rect x="1150" y="170" width="120" height="44" rx="8" fill="#0b1328" stroke="#334155" />
      <text x="1210" y="198" textAnchor="middle" fontSize="18" fill="#67e8f9" fontFamily="ui-monospace, monospace">3.0 T</text>

      {/* patient table (perspective toward viewer) */}
      <path d="M905 540 H1095 L1210 860 H790 Z" fill="url(#table)" />
      <path d="M925 540 H1075 L1170 840 H830 Z" fill="#1e293b" opacity="0.35" />
      <path d="M790 860 H1210 V900 H790 Z" fill="#475569" />
      {/* table pedestal */}
      <path d="M860 900 L900 760 H1100 L1140 900 Z" fill="#334155" opacity="0.6" />

      {/* warning stripe on floor (Zone IV threshold) */}
      <g opacity="0.9">
        <rect x="0" y="870" width="1600" height="30" fill="#facc15" />
        {Array.from({ length: 40 }).map((_, i) => (
          <path key={i} d={`M${i * 48} 900 L${i * 48 + 24} 870 H${i * 48 + 44} L${i * 48 + 20} 900 Z`} fill="#111" />
        ))}
      </g>
    </svg>
  );
}
