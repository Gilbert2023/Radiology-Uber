"use client";
import { ActionForm, SubmitButton } from "@/components/client/forms";
import { resetPasswordAction } from "../../actions";
export function ResetForm({ token }: { token: string }) {
  return (
    <ActionForm action={resetPasswordAction} className="mt-4 space-y-3">
      <input type="hidden" name="token" value={token} />
      <div><label className="label">New password</label><input name="password" type="password" className="input" required autoComplete="new-password" /></div>
      <div><label className="label">Confirm password</label><input name="confirm" type="password" className="input" required autoComplete="new-password" /></div>
      <SubmitButton className="btn-primary w-full">Update password</SubmitButton>
    </ActionForm>
  );
}
