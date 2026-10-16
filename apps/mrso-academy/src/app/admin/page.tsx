import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui";
import { AdminDashboard } from "./AdminDashboard";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default function AdminPage() {
  return (
    <>
      <PageHeader eyebrow="Administration" title="Admin dashboard">
        Learners, progress, results and completion records across the academy.
      </PageHeader>
      <Container className="py-10">
        <AdminDashboard />
      </Container>
    </>
  );
}
