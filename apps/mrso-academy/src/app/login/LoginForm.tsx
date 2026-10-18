"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button, Callout } from "@/components/ui";
import { AccountsOff } from "@/components/AccountsOff";
import { SafetySign } from "@/components/art/SafetySign";

type Mode = "signin" | "signup" | "forgot";

const input =
  "mt-1 block w-full rounded-xl border border-white/15 bg-navy-950 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40";

export function LoginForm() {
  const auth = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (auth.session) router.replace("/dashboard/");
  }, [auth.session, router]);

  if (!auth.enabled) return <div className="max-w-lg"><AccountsOff /></div>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const err = await auth.signIn(email.trim(), password);
        if (err) setError(err === "Invalid login credentials" ? "Email or password is incorrect." : err);
      } else if (mode === "signup") {
        if (password.length < 8) return setError("Use at least 8 characters for your password.");
        const r = await auth.signUp(email.trim(), password, name.trim());
        if (r.error) setError(r.error);
        else if (r.needsConfirmation) setNotice(`Check ${email.trim()} for a confirmation link, then come back and sign in.`);
      } else {
        const err = await auth.resetPassword(email.trim());
        if (err) setError(err);
        else setNotice("If that email has an account, a password-reset link is on its way.");
      }
    } finally {
      setBusy(false);
    }
  };

  const tabs: { id: Mode; label: string }[] = [
    { id: "signin", label: "Sign in" },
    { id: "signup", label: "Create account" },
  ];

  return (
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-navy-900/80 p-6 shadow-2xl sm:p-8">
      <div className="flex flex-col items-center text-center">
        <SafetySign kind="magnetic-field" size={48} />
        <h1 className="mt-3 text-2xl font-bold text-white">
          {mode === "signup" ? "Create your free account" : mode === "forgot" ? "Reset your password" : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-slate-400">Save your progress, exam results and completion record to your account.</p>
      </div>

      {mode !== "forgot" && (
        <div className="mt-6 grid grid-cols-2 rounded-xl bg-white/5 p-1" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={mode === t.id}
              onClick={() => { setMode(t.id); setError(null); setNotice(null); }}
              className={`rounded-lg py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${mode === t.id ? "bg-cyan-400 text-navy-950" : "text-slate-300 hover:text-white"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate={false}>
        {mode === "signup" && (
          <label className="block text-sm text-slate-300">
            Full name
            <input className={input} required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="As it should appear on your record" />
          </label>
        )}
        <label className="block text-sm text-slate-300">
          Email
          <input className={input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        {mode !== "forgot" && (
          <label className="block text-sm text-slate-300">
            Password
            <input
              className={input}
              type="password"
              required
              minLength={mode === "signup" ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </label>
        )}

        {error && <p role="alert" className="rounded-lg bg-hazard-500/15 p-3 text-sm text-hazard-400">{error}</p>}
        {notice && <Callout tone="info" title="Next step">{notice}</Callout>}

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
        </Button>
      </form>

      <div className="mt-4 flex justify-between text-sm">
        {mode === "forgot" ? (
          <button type="button" className="text-cyan-300 hover:underline" onClick={() => setMode("signin")}>← Back to sign in</button>
        ) : (
          <button type="button" className="text-cyan-300 hover:underline" onClick={() => setMode("forgot")}>Forgot password?</button>
        )}
        <Link href="/" className="text-slate-400 hover:text-white">Continue as guest</Link>
      </div>
      <p className="mt-6 text-center text-xs text-slate-500">
        Any work you did as a guest in this browser is added to your account when you sign in.
      </p>
    </div>
  );
}
