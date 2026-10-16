"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import { allLessons } from "@/content";
import { progress, useProgress } from "@/lib/progress";
import { Button, EmptyState, LinkButton } from "@/components/ui";

export function BookmarkList() {
  const p = useProgress();
  const items = p.bookmarks.map((k) => allLessons.find((l) => l.key === k)).filter((x): x is (typeof allLessons)[number] => !!x);
  if (items.length === 0)
    return (
      <EmptyState title="No bookmarks yet" action={<LinkButton href="/curriculum/">Browse the curriculum</LinkButton>}>
        Use the Bookmark button on any lesson to save it here.
      </EmptyState>
    );
  return (
    <ul className="space-y-3">
      {items.map(({ module, lesson, key }) => (
        <li key={key} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-navy-900/70 p-4">
          <Bookmark className="h-5 w-5 shrink-0 fill-cyan-300 text-cyan-300" aria-hidden />
          <Link href={`/curriculum/${module.id}/${lesson.id}/`} className="flex-1 hover:text-cyan-200">
            <span className="block text-xs text-slate-400">Module {module.number}: {module.title}</span>
            <span className="font-medium text-white">{lesson.title}</span>
          </Link>
          <Button variant="ghost" onClick={() => progress.toggleBookmark(key)} aria-label={`Remove bookmark: ${lesson.title}`}>
            Remove
          </Button>
        </li>
      ))}
    </ul>
  );
}
