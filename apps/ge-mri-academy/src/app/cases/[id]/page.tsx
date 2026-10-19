import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CASES } from "@/content/cases";
import { CaseRunner } from "./CaseRunner";

export function generateStaticParams() {
  return CASES.map((c) => ({ id: c.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: CASES.find((c) => c.id === id)?.title ?? "Case" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = CASES.find((x) => x.id === id);
  if (!c) notFound();
  return <CaseRunner id={c.id} />;
}
