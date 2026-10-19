/**
 * Schematic pulse-sequence timing diagrams (not to scale). Educational illustrations.
 */
type Kind = "se" | "fse" | "gre" | "ir" | "dwi" | "ssfp";

const ROWS = ["RF", "Gss", "Gpe", "Gro", "Signal"];
const W = 560, RH = 36, LX = 52;

function sinc(x0: number, y: number, w: number, h: number) {
  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = (i / 40) * 2 - 1;
    const v = t === 0 ? 1 : Math.sin(Math.PI * 3 * t) / (Math.PI * 3 * t);
    pts.push(`${x0 + ((t + 1) / 2) * w},${y - v * h}`);
  }
  return <polyline points={pts.join(" ")} fill="none" stroke="currentColor" strokeWidth={1.4} />;
}

function trap(x: number, y: number, w: number, h: number, key?: string) {
  const r = Math.min(4, w / 4);
  return <path key={key} d={`M${x},${y} L${x + r},${y - h} L${x + w - r},${y - h} L${x + w},${y}`} fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeWidth={1.2} />;
}

function phaseTable(x: number, y: number, w: number) {
  return (
    <g>
      {[-1, -0.6, -0.2, 0.2, 0.6, 1].map((s) => <path key={s} d={`M${x},${y} L${x + 3},${y - s * 12} L${x + w - 3},${y - s * 12} L${x + w},${y}`} fill="none" stroke="currentColor" strokeWidth={0.8} strokeOpacity={0.7} />)}
    </g>
  );
}

function echo(x: number, y: number, h: number, w = 26) {
  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = (i / 40) * 2 - 1;
    pts.push(`${x - w / 2 + ((t + 1) / 2) * w},${y - Math.exp(-t * t * 6) * Math.cos(t * 14) * h}`);
  }
  return <polyline points={pts.join(" ")} fill="none" stroke="#0f6f68" strokeWidth={1.4} />;
}

function label(x: number, y: number, t: string) {
  return <text x={x} y={y} fontSize={10} textAnchor="middle" fill="#5b6b88">{t}</text>;
}

export function PulseDiagram({ kind }: { kind: Kind }) {
  const y = (r: number) => 16 + r * RH + RH * 0.7;
  const els: React.ReactNode[] = [];
  const x0 = LX + 20;

  if (kind === "se" || kind === "dwi") {
    els.push(<g key="rf90">{sinc(x0, y(0), 30, 16)}{label(x0 + 15, y(0) - 20, "90°")}</g>);
    els.push(<g key="rf180">{sinc(x0 + 150, y(0), 30, 20)}{label(x0 + 165, y(0) - 24, "180°")}</g>);
    els.push(trap(x0, y(1), 30, 10, "ss1"), trap(x0 + 150, y(1), 30, 10, "ss2"));
    els.push(<g key="pe">{phaseTable(x0 + 50, y(2), 30)}</g>);
    els.push(trap(x0 + 60, y(3), 30, 8, "pre"), trap(x0 + 280, y(3), 60, 8, "ro"));
    if (kind === "dwi") {
      els.push(<g key="diff" className="text-signal-amber">{trap(x0 + 95, y(1), 40, 14, "d1")}{trap(x0 + 195, y(1), 40, 14, "d2")}</g>);
      els.push(<g key="dl">{label(x0 + 165, y(1) + 12, "diffusion gradients (Stejskal–Tanner)")}</g>);
    }
    els.push(<g key="ec">{echo(x0 + 310, y(4), 12)}{label(x0 + 310, y(4) + 14, "echo at TE")}</g>);
    els.push(<g key="te"><line x1={x0 + 15} x2={x0 + 310} y1={y(4) + 22} y2={y(4) + 22} stroke="#8291aa" strokeDasharray="3 3" />{label(x0 + 160, y(4) + 32, "TE")}</g>);
  }
  if (kind === "fse") {
    els.push(<g key="rf90">{sinc(x0, y(0), 24, 14)}{label(x0 + 12, y(0) - 18, "90°")}</g>);
    for (let i = 0; i < 4; i++) {
      const xr = x0 + 60 + i * 110;
      els.push(<g key={`r${i}`}>{sinc(xr, y(0), 24, 18)}{i === 1 && label(xr + 12, y(0) - 22, "180° refocusing train")}</g>);
      els.push(trap(xr, y(1), 24, 9, `s${i}`));
      els.push(<g key={`p${i}`}>{phaseTable(xr + 30, y(2), 14)}</g>);
      els.push(trap(xr + 46, y(3), 44, 8, `ro${i}`));
      els.push(<g key={`e${i}`}>{echo(xr + 68, y(4), 12 * Math.exp(-i * 0.35))}</g>);
    }
    els.push(trap(x0, y(1), 24, 9, "s0"));
    els.push(<g key="esp"><line x1={x0 + 128} x2={x0 + 238} y1={y(4) + 18} y2={y(4) + 18} stroke="#8291aa" strokeDasharray="3 3" />{label(x0 + 183, y(4) + 30, "echo spacing; each echo = one k-space line")}</g>);
  }
  if (kind === "gre" || kind === "ssfp") {
    for (let i = 0; i < 3; i++) {
      const xr = x0 + i * 160;
      els.push(<g key={`a${i}`}>{sinc(xr, y(0), 26, 12)}{label(xr + 13, y(0) - 16, "α")}</g>);
      els.push(trap(xr, y(1), 26, 9, `ss${i}`));
      els.push(<g key={`pe${i}`}>{phaseTable(xr + 34, y(2), 18)}</g>);
      els.push(<path key={`ro${i}`} d={`M${xr + 34},${y(3)} l3,10 l16,0 l3,-10 l3,-10 l44,0 l3,10`} fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeWidth={1.2} />);
      els.push(<g key={`e${i}`}>{echo(xr + 85, y(4), 11)}</g>);
      if (kind === "ssfp") els.push(<g key={`rw${i}`}>{phaseTable(xr + 116, y(2), 14)}</g>);
    }
    els.push(<g key="l">{label(x0 + 270, y(4) + 16, kind === "ssfp" ? "balanced gradients on all axes; TR very short" : "gradient-reversal echo (T2*); spoiled each TR")}</g>);
  }
  if (kind === "ir") {
    els.push(<g key="inv">{sinc(x0, y(0), 26, 20)}{label(x0 + 13, y(0) - 24, "180° inversion")}</g>);
    els.push(<g key="ti"><line x1={x0 + 13} x2={x0 + 180} y1={y(0) + 8} y2={y(0) + 8} stroke="#8291aa" strokeDasharray="3 3" />{label(x0 + 96, y(0) + 20, "TI")}</g>);
    els.push(<g key="rf90">{sinc(x0 + 170, y(0), 22, 14)}{label(x0 + 181, y(0) - 18, "90°")}</g>);
    els.push(<g key="rf180">{sinc(x0 + 280, y(0), 22, 18)}{label(x0 + 291, y(0) - 22, "180°")}</g>);
    els.push(trap(x0, y(1), 26, 9, "s0"), trap(x0 + 170, y(1), 22, 9, "s1"), trap(x0 + 280, y(1), 22, 9, "s2"));
    els.push(<g key="pe">{phaseTable(x0 + 210, y(2), 26)}</g>);
    els.push(trap(x0 + 360, y(3), 60, 8, "ro"));
    els.push(<g key="ec">{echo(x0 + 390, y(4), 12)}</g>);
  }

  return (
    <figure className="panel overflow-x-auto p-3">
      <svg viewBox={`0 0 ${W} ${16 + ROWS.length * RH + 34}`} className="min-w-[480px] text-ink-800" role="img" aria-label={`Schematic pulse sequence diagram (${kind}), not to scale`}>
        {ROWS.map((r, i) => (
          <g key={r}>
            <text x={4} y={y(i) + 3} fontSize={11} fontWeight={600} fill="#24375a">{r}</text>
            <line x1={LX} x2={W - 8} y1={y(i)} y2={y(i)} stroke="#d8d2c4" />
          </g>
        ))}
        {els}
      </svg>
      <figcaption className="text-[11px] text-ink-500">Schematic, not to scale. Gss slice select · Gpe phase encode · Gro readout (frequency encode). Educational illustration.</figcaption>
    </figure>
  );
}
