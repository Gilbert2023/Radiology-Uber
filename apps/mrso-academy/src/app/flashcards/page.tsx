import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui";
import { Flashcards } from "./Flashcards";

export const metadata: Metadata = { title: "Flashcards" };

export default function FlashcardsPage() {
  return (
    <>
      <PageHeader eyebrow="Flashcards" title="Terminology flashcards">
        Flip each card, then mark it as known or still learning. Use the keyboard: Space to flip, ← → to move.
      </PageHeader>
      <Container className="py-10">
        <Flashcards />
      </Container>
    </>
  );
}
