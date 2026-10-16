/**
 * Safety signage drawn as SVG so it is crisp, accessible and licence-free.
 * Shapes and colours follow the conventions of ASTM F2503 (MR labelling) and
 * ISO 7010 (warning triangle / prohibition circle). These are educational
 * renderings — use officially sourced signage in a real department.
 */

export type SignKind =
  | "mr-safe"
  | "mr-conditional"
  | "mr-unsafe"
  | "magnetic-field"
  | "no-pacemaker"
  | "no-metal"
  | "cryogen"
  | "oxygen"
  | "projectile";

export const signMeta: Record<SignKind, { label: string; description: string }> = {
  "mr-safe": { label: "MR Safe", description: "Green square: poses no known hazards in any MR environment." },
  "mr-conditional": { label: "MR Conditional", description: "Yellow triangle: safe only under the specified conditions." },
  "mr-unsafe": { label: "MR Unsafe", description: "Red prohibition circle: unacceptable risk in all MR environments." },
  "magnetic-field": { label: "Strong magnetic field", description: "Warning: magnetic field — the magnet is always on." },
  "no-pacemaker": { label: "No active implants", description: "Prohibition: people with pacemakers or active implants must not enter without assessment." },
  "no-metal": { label: "No metal objects", description: "Prohibition: no ferromagnetic objects beyond this point." },
  cryogen: { label: "Cryogen hazard", description: "Warning: low temperature / cryogenic liquid." },
  oxygen: { label: "Oxygen depletion", description: "Warning: possible oxygen-deficient atmosphere after helium release." },
  projectile: { label: "Projectile hazard", description: "Warning: ferromagnetic objects can become projectiles." },
};

function Triangle({ children }: { children: React.ReactNode }) {
  return (
    <>
      <path d="M50 6 L95 88 Q96 92 92 92 L8 92 Q4 92 5 88 Z" fill="#facc15" stroke="#111" strokeWidth="5" strokeLinejoin="round" />
      {children}
    </>
  );
}

function Prohibition({ children }: { children: React.ReactNode }) {
  return (
    <>
      <circle cx="50" cy="50" r="43" fill="#fff" stroke="#dc2626" strokeWidth="9" />
      {children}
      <line x1="20" y1="20" x2="80" y2="80" stroke="#dc2626" strokeWidth="9" />
    </>
  );
}

export function SafetySign({ kind, size = 64, className }: { kind: SignKind; size?: number; className?: string }) {
  const meta = signMeta[kind];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-label={`${meta.label} sign. ${meta.description}`}>
      {kind === "mr-safe" && (
        <>
          <rect x="6" y="6" width="88" height="88" rx="6" fill="#16a34a" />
          <text x="50" y="64" textAnchor="middle" fontSize="40" fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif">MR</text>
        </>
      )}
      {kind === "mr-conditional" && (
        <Triangle>
          <text x="50" y="78" textAnchor="middle" fontSize="30" fontWeight="800" fill="#111" fontFamily="Arial, sans-serif">MR</text>
        </Triangle>
      )}
      {kind === "mr-unsafe" && (
        <>
          <circle cx="50" cy="50" r="43" fill="#fff" stroke="#dc2626" strokeWidth="9" />
          <text x="50" y="62" textAnchor="middle" fontSize="34" fontWeight="800" fill="#111" fontFamily="Arial, sans-serif">MR</text>
          <line x1="20" y1="20" x2="80" y2="80" stroke="#dc2626" strokeWidth="9" />
        </>
      )}
      {kind === "magnetic-field" && (
        <Triangle>
          {/* horseshoe magnet with field lines */}
          <path d="M36 78 V58 a14 14 0 0 1 28 0 V78" fill="none" stroke="#111" strokeWidth="7" />
          <rect x="31" y="74" width="11" height="7" fill="#111" />
          <rect x="58" y="74" width="11" height="7" fill="#111" />
          <path d="M28 52 a24 24 0 0 1 44 0" fill="none" stroke="#111" strokeWidth="2.5" />
          <path d="M22 50 a30 30 0 0 1 56 0" fill="none" stroke="#111" strokeWidth="2.5" />
        </Triangle>
      )}
      {kind === "projectile" && (
        <Triangle>
          <path d="M28 72 L58 50" stroke="#111" strokeWidth="5" />
          <path d="M58 50 l-3 9 l9 -4 z" fill="#111" />
          <rect x="62" y="40" width="12" height="32" rx="3" fill="none" stroke="#111" strokeWidth="4" />
          <rect x="24" y="68" width="10" height="10" fill="#111" transform="rotate(-35 29 73)" />
        </Triangle>
      )}
      {kind === "cryogen" && (
        <Triangle>
          <g stroke="#111" strokeWidth="4" strokeLinecap="round">
            <line x1="50" y1="44" x2="50" y2="84" />
            <line x1="33" y1="54" x2="67" y2="74" />
            <line x1="33" y1="74" x2="67" y2="54" />
            <path d="M44 48 L50 54 L56 48 M44 80 L50 74 L56 80" fill="none" />
          </g>
        </Triangle>
      )}
      {kind === "oxygen" && (
        <Triangle>
          <text x="50" y="80" textAnchor="middle" fontSize="26" fontWeight="800" fill="#111" fontFamily="Arial, sans-serif">O₂↓</text>
        </Triangle>
      )}
      {kind === "no-pacemaker" && (
        <Prohibition>
          <path d="M50 74 C30 60 26 48 32 40 C38 32 47 35 50 42 C53 35 62 32 68 40 C74 48 70 60 50 74 Z" fill="#111" />
          <rect x="58" y="24" width="14" height="10" rx="2" fill="#111" />
          <path d="M60 34 Q56 42 52 46" stroke="#111" strokeWidth="2.5" fill="none" />
        </Prohibition>
      )}
      {kind === "no-metal" && (
        <Prohibition>
          {/* key */}
          <circle cx="38" cy="44" r="9" fill="none" stroke="#111" strokeWidth="5" />
          <path d="M45 50 L66 70 M58 63 l5 -5 M63 68 l5 -5" stroke="#111" strokeWidth="5" />
        </Prohibition>
      )}
    </svg>
  );
}
