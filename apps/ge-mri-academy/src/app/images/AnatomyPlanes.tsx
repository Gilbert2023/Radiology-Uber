/** Labelled schematic illustrations of the three orthogonal planes (educational illustrations, not anatomy-accurate). */
const Lbl = ({ x, y, t, tx, ty }: { x: number; y: number; t: string; tx: number; ty: number }) => (
  <g>
    <line x1={x} y1={y} x2={tx} y2={ty} stroke="#24375a" strokeWidth={0.8} />
    <circle cx={x} cy={y} r={1.8} fill="#0f6f68" />
    <text x={tx + (tx > x ? 3 : -3)} y={ty + 3} fontSize={9} textAnchor={tx > x ? "start" : "end"} fill="#13233f">{t}</text>
  </g>
);

export function AnatomyPlanes() {
  return (
    <section>
      <h2 className="mb-1 font-serif text-xl font-semibold">Axial, coronal and sagittal planes</h2>
      <p className="mb-4 text-sm text-ink-600">Schematic brain illustrations to anchor plane terminology and planning lines. Not to scale; educational illustrations.</p>
      <div className="grid gap-4 md:grid-cols-3">
        <figure className="panel p-3">
          <svg viewBox="0 0 200 200" role="img" aria-label="Axial plane schematic">
            <ellipse cx="100" cy="100" rx="70" ry="85" fill="#eeeae1" stroke="#13233f" />
            <ellipse cx="100" cy="100" rx="58" ry="72" fill="#fbfaf7" stroke="#8291aa" />
            <path d="M90 70 q-8 30 0 60 M110 70 q8 30 0 60" stroke="#13233f" fill="#d2ebe8" />
            <line x1="100" y1="28" x2="100" y2="172" stroke="#8291aa" strokeDasharray="2 2" />
            <Lbl x={100} y={30} t="Frontal (anterior)" tx={150} ty={18} />
            <Lbl x={89} y={100} t="Lateral ventricle" tx={30} ty={100} />
            <Lbl x={100} y={150} t="Falx / midline" tx={150} ty={185} />
            <Lbl x={155} y={100} t="Cortex" tx={185} ty={120} />
          </svg>
          <figcaption className="text-xs text-ink-600"><strong>Axial</strong> — slice-select along S/I. Typically planned parallel to AC–PC on the sagittal localiser.</figcaption>
        </figure>
        <figure className="panel p-3">
          <svg viewBox="0 0 200 200" role="img" aria-label="Coronal plane schematic">
            <path d="M30 110 q0 -80 70 -80 q70 0 70 80 q0 40 -30 55 l-80 0 q-30 -15 -30 -55z" fill="#eeeae1" stroke="#13233f" />
            <path d="M42 110 q0 -66 58 -66 q58 0 58 66 q0 30 -24 44 l-68 0 q-24 -14 -24 -44z" fill="#fbfaf7" stroke="#8291aa" />
            <path d="M88 80 l-10 25 l12 0z M112 80 l10 25 l-12 0z" fill="#d2ebe8" stroke="#13233f" />
            <ellipse cx="70" cy="135" rx="10" ry="6" fill="#d2ebe8" stroke="#13233f" />
            <ellipse cx="130" cy="135" rx="10" ry="6" fill="#d2ebe8" stroke="#13233f" />
            <Lbl x={70} y={135} t="Hippocampus / temporal horn" tx={20} ty={185} />
            <Lbl x={90} y={95} t="Lateral ventricles" tx={160} ty={22} />
            <Lbl x={100} y={160} t="Brainstem" tx={160} ty={185} />
          </svg>
          <figcaption className="text-xs text-ink-600"><strong>Coronal</strong> — slice-select along A/P. For epilepsy, angle perpendicular to the hippocampal long axis.</figcaption>
        </figure>
        <figure className="panel p-3">
          <svg viewBox="0 0 200 200" role="img" aria-label="Sagittal plane schematic">
            <path d="M40 120 q-5 -85 75 -90 q60 0 60 70 q0 30 -25 40 l-20 35 l-25 0 l5 -30 q-60 10 -70 -25z" fill="#eeeae1" stroke="#13233f" />
            <path d="M70 92 q30 -18 70 0 q-35 8 -70 0z" fill="#d2ebe8" stroke="#13233f" />
            <ellipse cx="145" cy="135" rx="20" ry="13" fill="#fbfaf7" stroke="#8291aa" />
            <line x1="62" y1="104" x2="150" y2="96" stroke="#b45309" strokeDasharray="3 2" />
            <Lbl x={100} y={86} t="Corpus callosum" tx={60} ty={20} />
            <Lbl x={145} y={135} t="Cerebellum" tx={185} ty={170} />
            <Lbl x={62} y={104} t="AC–PC planning line" tx={18} ty={150} />
          </svg>
          <figcaption className="text-xs text-ink-600"><strong>Sagittal</strong> — slice-select along R/L. The midline sagittal is the planning reference for axial and coronal brain slices.</figcaption>
        </figure>
      </div>
    </section>
  );
}
