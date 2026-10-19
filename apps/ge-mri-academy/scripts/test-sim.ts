/** Sanity checks for the educational model: directions of change must match MRI physics. */
import { simulate, TEACHING_EXAMPLE as T, withPreset, tissueSignal, TISSUES, FAT_WATER_HZ } from "../src/lib/sim";

let fails = 0;
const ok = (cond: boolean, msg: string) => { if (!cond) { fails++; console.error("FAIL:", msg); } else console.log("ok  ", msg); };
const base = simulate(T);

ok(Math.abs(simulate({ ...T, nex: 2 }).relSnr / base.relSnr - Math.SQRT2) < 1e-6, "NEX ×2 → SNR ×√2");
ok(Math.abs(simulate({ ...T, nex: 2 }).timeSec / base.timeSec - 2) < 1e-6, "NEX ×2 → time ×2");
ok(simulate({ ...T, bw: 62.5 }).relSnr < base.relSnr, "wider bandwidth → lower SNR");
ok(simulate({ ...T, bw: 62.5 }).chemShiftPx < base.chemShiftPx, "wider bandwidth → less chemical shift");
ok(simulate({ ...T, slices: 12, etl: 32 }).timeSec < simulate({ ...T, slices: 12 }).timeSec, "longer ETL → shorter time (slices fit in one TR)");
ok(simulate({ ...T, etl: 32 }).acqs > base.acqs, "longer ETL with 24 slices → extra acquisition (fewer slices per TR)");
ok(simulate({ ...T, etl: 32 }).blurIndex > base.blurIndex, "longer ETL → more blur");
ok(Math.abs(simulate({ ...T, thickness: 3 }).relSnr / base.relSnr - 0.6) < 1e-6, "5 → 3 mm → SNR ×0.6");
ok(simulate({ ...T, phase: 320 }).timeSec > base.timeSec, "more phase steps → longer time");
ok(simulate({ ...T, accel: 2 }).timeSec < base.timeSec && simulate({ ...T, accel: 2 }).relSnr < base.relSnr, "parallel imaging → faster, lower SNR");
const sig = (p: typeof T, k: string) => tissueSignal(p, TISSUES.find((t) => t.key === k)!);
ok(sig({ ...T, te: 150 }, "csf") / sig({ ...T, te: 150 }, "wm") > sig({ ...T, te: 60 }, "csf") / sig({ ...T, te: 60 }, "wm"), "longer TE → more T2 weighting (CSF/WM ratio up)");
const t1 = withPreset("t1se");
ok(sig(t1, "wm") > sig(t1, "gm") && sig(t1, "csf") < sig(t1, "wm"), "T1 SE: WM > GM > CSF");
const fl = withPreset("flair");
ok(sig(fl, "csf") < 0.1 * sig(fl, "lesion"), "FLAIR nulls CSF");
const st = withPreset("stir");
ok(sig(st, "fat") < 0.1 * sig(st, "csf"), "STIR nulls fat");
ok(Math.abs(FAT_WATER_HZ - 223.5) < 1, "fat–water shift ≈ 224 Hz at 1.5 T");
ok(Math.abs(base.bwPerPixel - 62500 / 320) < 1e-6, "BW/pixel = 2×BW/Nfreq");
const many = simulate({ ...withPreset("t1se"), slices: 40 });
ok(many.acqs > 1, "T1 SE with many slices → multiple acquisitions");
const dwi = withPreset("dwi");
ok(sig(dwi, "infarct") > sig(dwi, "wm"), "DWI: restricted tissue bright");

if (fails) { console.error(`${fails} failure(s)`); process.exit(1); }
console.log("All simulator checks passed.");
