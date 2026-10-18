"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Shuffle } from "lucide-react";
import { glossary } from "@/content/glossary";
import { progress, useProgress } from "@/lib/progress";
import { Button, ProgressBar } from "@/components/ui";
import { pct, shuffle } from "@/lib/utils";

export function Flashcards() {
  const p = useProgress();
  const [deck, setDeck] = useState(() => glossary.map((g) => g.term));
  const [onlyLearning, setOnlyLearning] = useState(false);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const cards = onlyLearning ? deck.filter((t) => p.flashcards[t] !== "known") : deck;
  const term = cards[Math.min(i, cards.length - 1)];
  const card = glossary.find((g) => g.term === term);
  const known = glossary.filter((g) => p.flashcards[g.term] === "known").length;

  const go = (d: number) => {
    setFlipped(false);
    setI((x) => (cards.length ? (x + d + cards.length) % cards.length : 0));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON") return;
      if (e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const mark = (status: "known" | "learning") => {
    if (!card) return;
    progress.setFlashcard(card.term, status);
    go(1);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-300">
          Known {known}/{glossary.length}
        </p>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={onlyLearning} onChange={(e) => { setOnlyLearning(e.target.checked); setI(0); setFlipped(false); }} className="accent-cyan-400" />
            Only cards still learning
          </label>
          <Button variant="secondary" className="px-3 py-1.5" onClick={() => { setDeck(shuffle(deck)); setI(0); setFlipped(false); }}>
            <Shuffle className="h-4 w-4" aria-hidden /> Shuffle
          </Button>
        </div>
      </div>
      <ProgressBar value={pct(known, glossary.length)} label="Flashcards known" className="mt-3" />

      {!card ? (
        <p className="mt-10 rounded-2xl border border-safe-500/40 bg-safe-500/10 p-8 text-center text-white">All cards marked as known. Untick the filter to review the whole deck.</p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            aria-label={flipped ? `Definition of ${card.term}: ${card.definition}. Activate to show term.` : `Term: ${card.term}. Activate to show definition.`}
            className="mt-6 flex min-h-[260px] w-full flex-col items-center justify-center rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-navy-800 to-navy-900 p-8 text-center shadow-2xl shadow-cyan-500/10 transition hover:border-cyan-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <span className="text-xs uppercase tracking-widest text-slate-400">{flipped ? "Definition" : "Term"}</span>
            <span className={flipped ? "mt-4 text-lg text-slate-100" : "mt-4 text-3xl font-bold text-white"}>{flipped ? card.definition : card.term}</span>
            <span className="mt-6 text-xs text-slate-500">
              Card {Math.min(i, cards.length - 1) + 1} of {cards.length} · {p.flashcards[card.term] === "known" ? "Known" : p.flashcards[card.term] === "learning" ? "Learning" : "New"}
            </span>
          </button>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Button variant="secondary" onClick={() => go(-1)}>
              <ChevronLeft className="h-4 w-4" aria-hidden /> Previous
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => mark("learning")}>Still learning</Button>
              <Button onClick={() => mark("known")}>I know this</Button>
            </div>
            <Button variant="secondary" onClick={() => go(1)}>
              Next <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
