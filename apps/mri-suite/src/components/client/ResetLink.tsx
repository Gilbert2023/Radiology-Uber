"use client";
import { useActionState } from "react";
import type { ActionResult } from "@/server/action";
export function ResetLink({ action, id }: { action: (p: ActionResult | null, f: FormData) => Promise<ActionResult>; id: string }) {
  const [s, act, pending] = useActionState(action, null);
  return (
    <form action={act} className="inline">
      <input type="hidden" name="id" value={id} />
      <button className="btn-secondary btn-sm" disabled={pending}>Issue reset link</button>
      {s?.ok && s.data?.token && <div className="mt-2 max-w-xs break-all rounded bg-amber-50 p-2 text-[11px] text-amber-900">Copy now (shown once): <code>{typeof window !== "undefined" ? window.location.origin : ""}/reset-password/{s.data.token}</code></div>}
      {s && !s.ok && <div className="text-xs text-red-600">{s.error}</div>}
    </form>
  );
}
