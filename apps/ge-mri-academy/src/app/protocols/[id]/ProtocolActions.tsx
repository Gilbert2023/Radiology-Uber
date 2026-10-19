"use client";

import { Printer, Star } from "lucide-react";
import { progress, useProgress } from "@/lib/progress";

export function SaveProtocolButton({ id }: { id: string }) {
  const s = useProgress();
  const on = s.savedProtocols.includes(id);
  return (
    <button className="btn-secondary" aria-pressed={on} onClick={() => progress.toggleSavedProtocol(id)}>
      <Star size={15} className={on ? "fill-teal-600 text-teal-700" : ""} /> {on ? "Saved" : "Save protocol"}
    </button>
  );
}

export function PrintButton() {
  return <button className="btn-ghost" onClick={() => window.print()}><Printer size={15} /> Print</button>;
}
