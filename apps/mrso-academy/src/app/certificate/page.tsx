import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { Certificate } from "./Certificate";

export const metadata: Metadata = { title: "Course Completion Record" };

export default function CertificatePage() {
  return (
    <Container className="py-10">
      <Certificate />
    </Container>
  );
}
