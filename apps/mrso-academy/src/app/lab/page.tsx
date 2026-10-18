import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui";
import { LabIndex } from "./LabIndex";

export const metadata: Metadata = { title: "Interactive Learning Laboratory" };

export default function LabPage() {
  return (
    <>
      <PageHeader eyebrow="Interactive learning laboratory" title="Practise decisions safely">
        Simulations for zones, screening, implants, projectiles, emergencies, incident investigation, RF heating and quench. Each is educational and
        simplified — it never replaces local procedures or manufacturer instructions.
      </PageHeader>
      <Container className="py-10">
        <LabIndex />
      </Container>
    </>
  );
}
