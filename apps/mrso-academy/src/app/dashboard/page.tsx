import type { Metadata } from "next";
import { PageHeader, Container } from "@/components/ui";
import { Dashboard } from "./Dashboard";

export const metadata: Metadata = { title: "Course Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader eyebrow="Course dashboard" title="Your learning progress" />
      <Container className="py-10">
        <Dashboard />
      </Container>
    </>
  );
}
