"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CloudOff, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Badge, Button, Callout, Card, LinkButton } from "@/components/ui";
import { AccountsOff } from "@/components/AccountsOff";
import { formatDate } from "@/lib/utils";

const input =
  "mt-1 block w-full rounded-xl border border-white/15 bg-navy-950 px-3 py-2.5 text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40";

const syncLabel = { off: "Not syncing", loading: "Loading…", saving: "Saving…", saved: "All progress saved to your account", error: "Could not save — check your connection", disabled: "Account disabled — progress is not being saved" };

export function AccountView() {
  const auth = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => setName(auth.profile?.full_name ?? ""), [auth.profile?.full_name]);

  if (!auth.enabled) return <AccountsOff />;
  if (!auth.ready) return <p className="text-slate-400">Loading…</p>;
  if (!auth.session)
    return (
      <Card className="max-w-lg">
        <p className="text-white">You are not signed in.</p>
        <LinkButton href="/login/" className="mt-4">Sign in or create an account</LinkButton>
      </Card>
    );

  const p = auth.profile;
  const show = (err: string | null, okText: string) => setMsg(err ? { ok: false, text: err } : { ok: true, text: okText });

  return (
    <div className="grid max-w-4xl gap-6 md:grid-cols-2">
      <Card>
        <h2 className="font-semibold text-white">Profile</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div><dt className="text-slate-400">Email</dt><dd className="text-white">{auth.session.user.email}</dd></div>
          {p && <div><dt className="text-slate-400">Member since</dt><dd className="text-white">{formatDate(p.created_at)}</dd></div>}
          <div>
            <dt className="text-slate-400">Role</dt>
            <dd>{p?.role === "admin" ? <Badge tone="warn"><Shield className="h-3 w-3" aria-hidden /> Administrator</Badge> : <Badge>Learner</Badge>}</dd>
          </div>
        </dl>
        <form
          className="mt-4"
          onSubmit={async (e) => {
            e.preventDefault();
            show(await auth.updateName(name.trim()), "Name updated.");
          }}
        >
          <label className="block text-sm text-slate-300">
            Full name (shown on your completion record)
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <Button type="submit" variant="secondary" className="mt-3">Save name</Button>
        </form>
      </Card>

      <Card>
        <h2 className="font-semibold text-white">Progress sync</h2>
        <p className={`mt-3 flex items-center gap-2 text-sm ${auth.sync === "saved" ? "text-safe-400" : auth.sync === "error" || auth.sync === "disabled" ? "text-hazard-400" : "text-slate-300"}`} role="status">
          {auth.sync === "saved" ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : auth.sync === "error" || auth.sync === "disabled" ? <CloudOff className="h-4 w-4" aria-hidden /> : null}
          {syncLabel[auth.sync]}
        </p>
        {p?.disabled && (
          <div className="mt-3">
            <Callout tone="warning" title="Account disabled">An administrator has disabled this account. Contact the course administrator.</Callout>
          </div>
        )}
        <p className="mt-3 text-sm text-slate-400">Your progress is saved to your account and is available on any device you sign in on.</p>
        <LinkButton href="/dashboard/" variant="secondary" className="mt-4">Go to dashboard</LinkButton>
      </Card>

      <Card>
        <h2 className="font-semibold text-white">Change password</h2>
        <form
          className="mt-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (pw.length < 8) return setMsg({ ok: false, text: "Use at least 8 characters." });
            show(await auth.updatePassword(pw), "Password changed.");
            setPw("");
          }}
        >
          <label className="block text-sm text-slate-300">
            New password
            <input className={input} type="password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          </label>
          <Button type="submit" variant="secondary" className="mt-3">Update password</Button>
        </form>
      </Card>

      <Card className="flex flex-col justify-between">
        <div>
          <h2 className="font-semibold text-white">Sign out</h2>
          <p className="mt-2 text-sm text-slate-400">Your progress stays saved in your account. This browser&apos;s copy is cleared so the next person starts fresh.</p>
        </div>
        <Button
          variant="danger"
          className="mt-4 self-start"
          onClick={async () => {
            await auth.signOut();
            router.push("/");
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden /> Sign out
        </Button>
      </Card>

      {msg && (
        <p role="status" className={`md:col-span-2 rounded-lg p-3 text-sm ${msg.ok ? "bg-safe-500/15 text-safe-400" : "bg-hazard-500/15 text-hazard-400"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
