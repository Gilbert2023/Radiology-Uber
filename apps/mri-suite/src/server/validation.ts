import { z } from "zod";
import { DomainError } from "./errors";

export function parse<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const r = schema.safeParse(input);
  if (!r.success) {
    const issue = r.error.issues[0];
    const field = issue.path.join(".");
    throw new DomainError(field ? `${humanField(field)}: ${issue.message}` : issue.message, "VALIDATION");
  }
  return r.data;
}
function humanField(f: string) {
  return f.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

// Form helpers: FormData gives "" for empty fields and "on" for checkboxes.
export const optStr = z.preprocess((v) => (v === "" || v === null || v === undefined ? null : String(v).trim()), z.string().max(4000).nullable());
export const reqStr = (label = "This field", max = 2000) =>
  z.preprocess((v) => (v === null || v === undefined ? "" : String(v).trim()), z.string().min(1, `${label} is required`).max(max));
export const bool = z.preprocess((v) => v === true || v === "on" || v === "true" || v === "1" || v === "YES", z.boolean());
export const triBool = z.preprocess((v) => (v === "" || v === null || v === undefined ? null : v === true || v === "on" || v === "true" || v === "YES"), z.boolean().nullable());
export const optNum = z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(v)), z.number().finite().nullable());
export const optInt = z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(v)), z.number().int().nullable());
export const uuid = z.string().uuid("Invalid identifier");
export const optUuid = z.preprocess((v) => (v === "" || v === undefined ? null : v), z.string().uuid().nullable());
export const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");
export const optDate = z.preprocess((v) => (v === "" || v === undefined ? null : v), dateStr.nullable());
export const timeStr = z.string().regex(/^\d{2}:\d{2}$/, "Enter a valid time");

export function formToObject(fd: FormData): Record<string, any> {
  const o: Record<string, any> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("$ACTION")) continue;
    if (typeof v !== "string") continue;
    if (k.endsWith("[]")) {
      const key = k.slice(0, -2);
      (o[key] ??= []).push(v);
    } else o[k] = v;
  }
  return o;
}
