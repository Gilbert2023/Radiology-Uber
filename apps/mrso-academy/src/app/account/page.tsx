import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui";
import { AccountView } from "./AccountView";

export const metadata: Metadata = { title: "My account" };

export default function AccountPage() {
  return (
    <>
      <PageHeader eyebrow="Account" title="My account" />
      <Container className="py-10">
        <AccountView />
      </Container>
    </>
  );
}
