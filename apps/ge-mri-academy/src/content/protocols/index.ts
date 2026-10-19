import type { Protocol, Region } from "../types";
import { NEURO } from "./neuro";
import { SPINE, MSK } from "./spine-msk";
import { ABDOMEN, PELVIS } from "./body";
import { VASCULAR, OTHER } from "./other";

export const PROTOCOLS: Protocol[] = [...NEURO, ...SPINE, ...MSK, ...ABDOMEN, ...PELVIS, ...VASCULAR, ...OTHER];
export const PROTOCOL_BY_ID: Record<string, Protocol> = Object.fromEntries(PROTOCOLS.map((p) => [p.id, p]));
export const REGIONS: Region[] = ["Neuro", "Spine", "MSK", "Abdomen", "Pelvis", "Vascular & Cardiac", "Breast, Oncology & Other"];
