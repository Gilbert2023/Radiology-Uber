import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { labById, labs } from "@/content/labs";
import { Container, PageHeader } from "@/components/ui";
import { LabRenderer } from "./LabRenderer";

export function generateStaticParams() {
  return labs.map((l) => ({ labId: l.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ labId: string }> }): Promise<Metadata> {
  const { labId } = await params;
  return { title: labById[labId]?.title ?? "Lab" };
}

export default async function LabDetail({ params }: { params: Promise<{ labId: string }> }) {
  const { labId } = await params;
  const lab = labById[labId];
  if (!lab) notFound();
  return (
    <>
      <PageHeader eyebrow="Interactive lab" title={lab.title}>
        <p>{lab.summary}</p>
        <Link href="/lab/" className="mt-3 inline-block text-sm text-cyan-300 hover:underline">
          ← All labs
        </Link>
      </PageHeader>
      <Container className="py-10">
        <LabRenderer id={labId} />
      </Container>
    </>
  );
}
