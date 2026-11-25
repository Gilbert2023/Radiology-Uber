"use client";
import { ActionForm, SubmitButton } from "@/components/client/forms";
import { loginAction } from "../actions";

export function LoginForm() {
  return (
    <ActionForm action={loginAction} className="mt-6 space-y-4">
      <div><label className="label" htmlFor="username">Username</label><input id="username" name="username" className="input" autoComplete="username" required autoFocus /></div>
      <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" className="input" autoComplete="current-password" required /></div>
      <SubmitButton className="btn-primary w-full py-2.5" pendingText="Signing in…">Sign in</SubmitButton>
    </ActionForm>
  );
}
