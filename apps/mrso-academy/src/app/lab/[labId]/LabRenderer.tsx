"use client";

import { LabShell } from "@/components/labs/LabShell";
import { BranchingScenario } from "@/components/labs/BranchingScenario";
import { ZonesLab } from "@/components/labs/ZonesLab";
import { ProjectileLab } from "@/components/labs/ProjectileLab";
import { ImplantLab } from "@/components/labs/ImplantLab";
import { RfBurnLab } from "@/components/labs/RfBurnLab";
import { RfSarLab } from "@/components/labs/RfSarLab";
import { IncidentLab } from "@/components/labs/IncidentLab";
import { emergencyScenario, quenchScenario, screeningScenario } from "@/content/scenarios";

const registry: Record<string, () => React.ReactNode> = {
  zones: () => <ZonesLab />,
  screening: () => <BranchingScenario labId="screening" scenario={screeningScenario} />,
  implant: () => <ImplantLab />,
  projectile: () => <ProjectileLab />,
  emergency: () => <BranchingScenario labId="emergency" scenario={emergencyScenario} />,
  incident: () => <IncidentLab />,
  "rf-burn": () => <RfBurnLab />,
  "rf-sar": () => <RfSarLab />,
  quench: () => <BranchingScenario labId="quench" scenario={quenchScenario} />,
};

export function LabRenderer({ id }: { id: string }) {
  const render = registry[id];
  return <LabShell id={id}>{render ? render() : <p className="text-slate-400">This lab is not available.</p>}</LabShell>;
}
