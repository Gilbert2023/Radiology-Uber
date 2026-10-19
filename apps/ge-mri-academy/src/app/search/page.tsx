import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { SearchResults } from "./SearchResults";

export const metadata: Metadata = { title: "Search" };

export default function Page() {
  return (
    <>
      <PageHeader kicker="Search" title="Search the academy" />
      <Suspense fallback={<p className="text-sm text-ink-500">Loading…</p>}><SearchResults /></Suspense>
    </>
  );
}
