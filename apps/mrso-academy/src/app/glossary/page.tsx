import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui";
import { GlossaryList } from "./GlossaryList";

export const metadata: Metadata = { title: "Glossary" };

export default function GlossaryPage() {
  return (
    <>
      <PageHeader eyebrow="Glossary" title="MRI safety terminology">
        Concise definitions of the terms used throughout the course. Practise them with the flashcards.
      </PageHeader>
      <Container className="py-10">
        <GlossaryList />
      </Container>
    </>
  );
}
