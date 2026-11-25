import type { Permission } from "@/lib/rbac";
import { ForbiddenError } from "./errors";

export interface Actor {
  userId: string;
  username: string;
  fullName: string;
  roleCode: string;
  roleName: string;
  staffId: string | null;
  hospitalId: string;
  permissions: Set<string>;
  ip?: string | null;
}

export function can(actor: Actor | null | undefined, perm: Permission): boolean {
  return !!actor && actor.permissions.has(perm);
}
export function assertCan(actor: Actor, ...perms: Permission[]): void {
  for (const p of perms) if (!actor.permissions.has(p)) throw new ForbiddenError(`Permission required: ${p}`);
}
export function assertAny(actor: Actor, ...perms: Permission[]): void {
  if (!perms.some((p) => actor.permissions.has(p))) throw new ForbiddenError(`One of these permissions is required: ${perms.join(", ")}`);
}
