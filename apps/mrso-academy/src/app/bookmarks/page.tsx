import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui";
import { BookmarkList } from "./BookmarkList";

export const metadata: Metadata = { title: "Bookmarks" };

export default function BookmarksPage() {
  return (
    <>
      <PageHeader eyebrow="Saved lessons" title="Bookmarks" />
      <Container className="py-10">
        <BookmarkList />
      </Container>
    </>
  );
}
