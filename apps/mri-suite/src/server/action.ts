import "server-only";
import { revalidatePath } from "next/cache";
import { getActor, type SessionActor } from "./auth";
import { DomainError } from "./errors";

export type ActionResult = { ok: boolean; message?: string; error?: string; data?: any; code?: string };

/** Wrap a server action: authenticate, run, map business errors to user messages, revalidate. */
export async function runAction(fn: (actor: SessionActor) => Promise<string | { message: string; data?: any } | void>, revalidate: string | string[] = "/"): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: "Your session has expired. Please sign in again.", code: "AUTH" };
  if (actor.mustChangePassword) return { ok: false, error: "You must change your password before continuing.", code: "AUTH" };
  try {
    const r = await fn(actor);
    for (const p of Array.isArray(revalidate) ? revalidate : [revalidate]) revalidatePath(p, "layout");
    if (typeof r === "string") return { ok: true, message: r };
    if (r && typeof r === "object") return { ok: true, message: r.message, data: r.data };
    return { ok: true, message: "Saved." };
  } catch (e: any) {
    if (e instanceof DomainError) return { ok: false, error: e.message, code: e.code };
    if (e?.digest?.startsWith?.("NEXT_REDIRECT")) throw e;
    console.error("[action error]", e);
    return { ok: false, error: "An unexpected error occurred. The issue has been logged – please try again or contact the administrator." };
  }
}
