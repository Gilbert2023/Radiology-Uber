"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import type { ActionResult } from "@/server/action";

type Action = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

export function SubmitButton({ children, className = "btn-primary", pendingText = "Saving…", name, value, disabled }: {
  children: React.ReactNode; className?: string; pendingText?: string; name?: string; value?: string; disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled} name={name} value={value} aria-busy={pending}>
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{pendingText}</> : children}
    </button>
  );
}

/**
 * Form bound to a server action. Shows inline errors, a success toast, optional confirmation
 * prompt and optional redirect (when the action returns data.href).
 */
export function ActionForm({ action, children, className, confirm, resetOnSuccess, onSuccessHref, id }: {
  action: Action; children: React.ReactNode; className?: string; confirm?: string; resetOnSuccess?: boolean; onSuccessHref?: string; id?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      setToast(state.message ?? "Saved.");
      if (resetOnSuccess) ref.current?.reset();
      const href = state.data?.href ?? onSuccessHref;
      if (href) router.push(href);
      const closer = ref.current?.closest("dialog");
      if (closer) (closer as HTMLDialogElement).close();
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
    if (state.code === "AUTH") router.push("/login?expired=1");
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <form id={id} ref={ref} action={formAction} className={className}
        onSubmit={(e) => {
          if (confirm && !window.confirm(confirm)) { e.preventDefault(); return; }
          // Carry the clicked button's name/value (e.g. decision=CLEAR) into the submitted FormData.
          const sub = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          const form = e.currentTarget;
          form.querySelectorAll("input[data-submitter]").forEach((n) => n.remove());
          if (sub?.name) {
            const h = document.createElement("input");
            h.type = "hidden"; h.name = sub.name; h.value = sub.value; h.dataset.submitter = "1";
            form.appendChild(h);
          }
        }}>
        {state && !state.ok && state.error && (
          <div role="alert" className="mb-3 flex gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span>{state.error}</span>
          </div>
        )}
        {children}
      </form>
      {toast && (
        <div role="status" className="no-print fixed bottom-4 right-4 z-[70] flex max-w-sm items-start gap-2 rounded-lg border border-green-300 bg-white px-4 py-3 text-sm text-green-900 shadow-lift">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" aria-hidden /><span className="flex-1">{toast}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss"><X className="h-4 w-4 text-slate-400" /></button>
        </div>
      )}
    </>
  );
}

/** Accessible modal built on <dialog>; children may include server-rendered forms. */
export function Modal({ trigger, title, children, wide, triggerClass = "btn-primary", description }: {
  trigger: React.ReactNode; title: string; children: React.ReactNode; wide?: boolean; triggerClass?: string; description?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={triggerClass} onClick={() => ref.current?.showModal()}>{trigger}</button>
      <dialog ref={ref} className={clsx("w-[calc(100%-2rem)] rounded-xl p-0 shadow-2xl", wide ? "max-w-4xl" : "max-w-xl")}
        onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div>
            <h2 className="text-base font-semibold text-brand-950">{title}</h2>
            {description && <p className="text-xs text-slate-500">{description}</p>}
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={() => ref.current?.close()} aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
      </dialog>
    </>
  );
}

/** Toggle visibility of a block when a select/checkbox has a given value. */
export function ShowWhen({ field, values, children }: { field: string; values: string[]; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const update = () => {
      const el = form.elements.namedItem(field) as HTMLInputElement | RadioNodeList | null;
      let v = "";
      if (el instanceof RadioNodeList) v = el.value;
      else if (el && (el as HTMLInputElement).type === "checkbox") v = (el as HTMLInputElement).checked ? "on" : "";
      else if (el) v = (el as HTMLInputElement).value;
      setShow(values.includes(v));
    };
    update();
    form.addEventListener("change", update);
    return () => form.removeEventListener("change", update);
  }, [field, values]);
  return <div ref={ref} hidden={!show}>{children}</div>;
}
