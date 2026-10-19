"use client";

import { useState } from "react";
import { TROUBLESHOOTING } from "@/content/troubleshooting";
import { Card, Chip } from "@/components/ui";

export function TroubleIndex() {
  const [cat, setCat] = useState("all");
  const cats = Array.from(new Set(TROUBLESHOOTING.map((t) => t.category)));
  const list = TROUBLESHOOTING.filter((t) => cat === "all" || t.category === cat);
  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        {["all", ...cats].map((c) => <button key={c} className={cat === c ? "btn-primary" : "btn-secondary"} aria-pressed={cat === c} onClick={() => setCat(c)}>{c === "all" ? "All" : c}</button>)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((t) => <Card key={t.id} href={`/troubleshooting/${t.id}/`} title={t.title} meta={<Chip tone={t.category === "Safety" ? "red" : "neutral"}>{t.category}</Chip>}>{t.observe}</Card>)}
      </div>
    </>
  );
}
