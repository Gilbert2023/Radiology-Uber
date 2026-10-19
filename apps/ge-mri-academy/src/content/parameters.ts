import type { Parameter, ParameterGroup } from "./types";
import { GEOMETRY_PARAMS } from "./parameters-geometry";
import { TIMING_PARAMS } from "./parameters-timing";
import { RESOLUTION_PARAMS } from "./parameters-resolution";
import { ECHO_PARAMS } from "./parameters-echo";
import { OPTION_PARAMS } from "./parameters-options";

export const PARAMETERS: Parameter[] = [
  ...GEOMETRY_PARAMS,
  ...TIMING_PARAMS,
  ...RESOLUTION_PARAMS,
  ...ECHO_PARAMS,
  ...OPTION_PARAMS,
];

export const PARAM_BY_ID: Record<string, Parameter> = Object.fromEntries(PARAMETERS.map((p) => [p.id, p]));

export const PARAM_GROUPS: ParameterGroup[] = [
  "Geometry",
  "Timing & contrast",
  "Resolution & SNR",
  "Echo train",
  "Suppression & preparation",
  "Acceleration",
  "Motion & synchronisation",
  "RF, shim & system",
  "Reconstruction",
];

export const VERIFICATION_LABEL = {
  console: "Confirmed on supplied console",
  standard: "Standard MRI concept",
  "ge-plausible": "Plausible GE implementation — verify",
  verify: "Requires confirmation in software manual",
} as const;
