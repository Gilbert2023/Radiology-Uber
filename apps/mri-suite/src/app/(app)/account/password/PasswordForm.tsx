"use client";
import { ActionForm, SubmitButton } from "@/components/client/forms";
import { changePasswordAction } from "../../../actions";
export function PasswordForm() {
  return (
    <ActionForm action={changePasswordAction} className="space-y-3">
      <div><label className="label">Current password</label><input name="current" type="password" className="input" required autoComplete="current-password" /></div>
      <div><label className="label">New password</label><input name="password" type="password" className="input" required autoComplete="new-password" /></div>
      <div><label className="label">Confirm new password</label><input name="confirm" type="password" className="input" required autoComplete="new-password" /></div>
      <SubmitButton>Change password</SubmitButton>
    </ActionForm>
  );
}
