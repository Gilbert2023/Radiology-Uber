"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, Search, Shield, UserX, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getSupabase, type Profile } from "@/lib/supabase";
import { normalizeState, type ProgressState } from "@/lib/progress";
import { computeStats } from "@/lib/stats";
import { questionById, modules } from "@/content";
import { labs } from "@/content/labs";
import { downloadText, formatDate, pct } from "@/lib/utils";
import { Badge, Button, Callout, Card, EmptyState, LinkButton, ProgressBar } from "@/components/ui";
import { BarList } from "@/components/charts";
import { AccountsOff } from "@/components/AccountsOff";

interface Learner {
  profile: Profile;
  state: ProgressState;
  stats: ReturnType<typeof computeStats>;
  updatedAt: string | null;
}

type Filter = "all" | "certified" | "in-progress" | "not-started" | "disabled" | "admins";
type Sort = "recent" | "name" | "progress" | "capstone" | "joined";

const DAY = 86_400_000;
const daysAgo = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / DAY : Infinity);

function recordStatus(l: Learner) {
  if (!l.stats.certificateEarned) return { label: "Not earned", tone: "default" as const };
  if (l.profile.certificate_revoked) return { label: "Revoked", tone: "danger" as const };
  return { label: "Earned", tone: "safe" as const };
}

export function AdminDashboard() {
  const auth = useAuth();
  const sb = getSupabase();
  const [learners, setLearners] = useState<Learner[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"overview" | "learners" | "content">("overview");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [selected, setSelected] = useState<string | null>(null);

  const isAdmin = auth.profile?.role === "admin";

  const load = useCallback(async () => {
    if (!sb) return;
    setLoading(true);
    setError(null);
    const [p, g] = await Promise.all([sb.from("profiles").select("*"), sb.from("progress").select("user_id,state,updated_at")]);
    setLoading(false);
    if (p.error || g.error) return setError((p.error ?? g.error)!.message);
    const byUser = new Map((g.data ?? []).map((r) => [r.user_id as string, r]));
    setLearners(
      (p.data as Profile[]).map((profile) => {
        const row = byUser.get(profile.id);
        const state = normalizeState(row?.state);
        return { profile, state, stats: computeStats(state), updatedAt: (row?.updated_at as string) ?? null };
      }),
    );
  }, [sb]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const list = useMemo(() => {
    if (!learners) return [];
    const term = q.trim().toLowerCase();
    return learners
      .filter((l) => !term || `${l.profile.full_name} ${l.profile.email}`.toLowerCase().includes(term))
      .filter((l) => {
        switch (filter) {
          case "certified": return l.stats.certificateEarned && !l.profile.certificate_revoked;
          case "in-progress": return l.stats.lessonsDone > 0 && !l.stats.allLessonsDone;
          case "not-started": return l.stats.lessonsDone === 0;
          case "disabled": return l.profile.disabled;
          case "admins": return l.profile.role === "admin";
          default: return true;
        }
      })
      .sort((a, b) => {
        switch (sort) {
          case "name": return (a.profile.full_name || a.profile.email).localeCompare(b.profile.full_name || b.profile.email);
          case "progress": return b.stats.overall - a.stats.overall;
          case "capstone": return (b.stats.best ? b.stats.best.correct / b.stats.best.total : -1) - (a.stats.best ? a.stats.best.correct / a.stats.best.total : -1);
          case "joined": return b.profile.created_at.localeCompare(a.profile.created_at);
          default: return (b.profile.last_active_at ?? "").localeCompare(a.profile.last_active_at ?? "");
        }
      });
  }, [learners, q, filter, sort]);

  const updateProfile = async (id: string, patch: Partial<Profile>, confirmText?: string) => {
    if (!sb) return;
    if (confirmText && !window.confirm(confirmText)) return;
    const { error: e } = await sb.from("profiles").update(patch).eq("id", id);
    if (e) return window.alert(e.message);
    await load();
  };
  const resetProgress = async (l: Learner) => {
    if (!sb) return;
    if (!window.confirm(`Erase ALL progress for ${l.profile.email}? This cannot be undone.`)) return;
    const { error: e } = await sb.from("progress").delete().eq("user_id", l.profile.id);
    if (e) return window.alert(e.message);
    await load();
  };

  const exportCsv = () => {
    if (!learners) return;
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["Name", "Email", "Role", "Joined", "Last active", "Lessons done", "Lessons %", "Labs done", "Knowledge check avg %", "Best capstone %", "Completion record", "Disabled"];
    const rows = learners.map((l) => [
      l.profile.full_name, l.profile.email, l.profile.role, l.profile.created_at.slice(0, 10), l.profile.last_active_at?.slice(0, 10) ?? "",
      l.stats.lessonsDone, l.stats.lessonPct, l.stats.labsDone, l.stats.quizAvg ?? "",
      l.stats.best ? pct(l.stats.best.correct, l.stats.best.total) : "", recordStatus(l).label, l.profile.disabled ? "yes" : "no",
    ]);
    downloadText(`mrso-learners-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows].map((r) => r.map(esc).join(",")).join("\n"), "text/csv");
  };

  // ── guards ───────────────────────────────────────────────
  if (!auth.enabled) return <AccountsOff />;
  if (!auth.ready || (auth.session && !auth.profile)) return <p className="text-slate-400">Loading…</p>;
  if (!auth.session)
    return <EmptyState title="Sign in required" action={<LinkButton href="/login/">Sign in</LinkButton>}>Sign in with an administrator account.</EmptyState>;
  if (!isAdmin)
    return (
      <EmptyState title="Administrators only" action={<LinkButton href="/dashboard/">Go to my dashboard</LinkButton>}>
        Your account does not have the admin role.
      </EmptyState>
    );
  if (error) return <Callout tone="danger" title="Could not load learner data">{error}</Callout>;
  if (!learners) return <p className="text-slate-400">Loading learners…</p>;

  // ── aggregates ───────────────────────────────────────────
  const total = learners.length;
  const active7 = learners.filter((l) => daysAgo(l.profile.last_active_at) <= 7).length;
  const new7 = learners.filter((l) => daysAgo(l.profile.created_at) <= 7).length;
  const avgLessons = total ? Math.round(learners.reduce((s, l) => s + l.stats.lessonPct, 0) / total) : 0;
  const certified = learners.filter((l) => l.stats.certificateEarned && !l.profile.certificate_revoked).length;
  const withCap = learners.filter((l) => l.stats.best);
  const avgCap = withCap.length ? Math.round(withCap.reduce((s, l) => s + pct(l.stats.best!.correct, l.stats.best!.total), 0) / withCap.length) : null;

  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = Date.now() - i * 7 * DAY;
    const start = end - 7 * DAY;
    const n = learners.filter((l) => {
      const t = new Date(l.profile.created_at).getTime();
      return t > start && t <= end;
    }).length;
    return { label: i === 0 ? "This week" : `${i} week${i > 1 ? "s" : ""} ago`, n };
  }).reverse();
  const maxWeek = Math.max(1, ...weeks.map((w) => w.n));

  const topic: Record<string, { c: number; t: number }> = {};
  const missed: Record<string, number> = {};
  for (const l of learners)
    for (const e of l.state.exams) {
      for (const [k, v] of Object.entries(e.byTopic)) {
        topic[k] = topic[k] ?? { c: 0, t: 0 };
        topic[k].c += v.correct;
        topic[k].t += v.total;
      }
      for (const id of e.wrongIds) missed[id] = (missed[id] ?? 0) + 1;
    }
  const topMissed = Object.entries(missed).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const moduleReach = modules.map((m) => ({
    label: `${m.number}. ${m.title}`,
    value: total ? pct(learners.filter((l) => m.lessons.every((les) => l.state.completedLessons[`${m.id}/${les.id}`])).length, total) : 0,
    detail: "of learners completed",
  }));

  const sel = learners.find((l) => l.profile.id === selected) ?? null;
  const me = auth.profile!.id;

  const Kpi = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <Card>
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl bg-white/5 p-1" role="tablist" aria-label="Admin sections">
          {(["overview", "learners", "content"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${tab === t ? "bg-cyan-400 text-navy-950" : "text-slate-300 hover:text-white"}`}
            >
              {t === "content" ? "Content analytics" : t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden /> Refresh
          </Button>
          <Button variant="secondary" onClick={exportCsv}>
            <Download className="h-4 w-4" aria-hidden /> Export CSV
          </Button>
        </div>
      </div>

      {tab === "overview" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Kpi label="Learners" value={total} sub={`${new7} new this week`} />
            <Kpi label="Active (7 days)" value={active7} sub={total ? `${pct(active7, total)}% of learners` : undefined} />
            <Kpi label="Avg lessons done" value={`${avgLessons}%`} />
            <Kpi label="Completion records" value={certified} />
            <Kpi label="Avg best capstone" value={avgCap === null ? "—" : `${avgCap}%`} sub={`${withCap.length} attempted`} />
            <Kpi label="Disabled accounts" value={learners.filter((l) => l.profile.disabled).length} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="font-semibold text-white">Sign-ups (last 8 weeks)</h2>
              <ul className="mt-4 space-y-2">
                {weeks.map((w) => (
                  <li key={w.label} className="flex items-center gap-3 text-xs">
                    <span className="w-24 shrink-0 text-slate-400">{w.label}</span>
                    <span className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
                      <span className="block h-full rounded-full bg-cyan-400" style={{ width: `${(w.n / maxWeek) * 100}%` }} />
                    </span>
                    <span className="w-6 text-right text-white">{w.n}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <h2 className="font-semibold text-white">Recently active learners</h2>
              {learners.filter((l) => l.profile.last_active_at).length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">No activity yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-white/5">
                  {[...learners]
                    .filter((l) => l.profile.last_active_at)
                    .sort((a, b) => b.profile.last_active_at!.localeCompare(a.profile.last_active_at!))
                    .slice(0, 8)
                    .map((l) => (
                      <li key={l.profile.id}>
                        <button type="button" onClick={() => { setSelected(l.profile.id); setTab("learners"); }} className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm hover:text-cyan-200">
                          <span className="truncate text-slate-200">{l.profile.full_name || l.profile.email}</span>
                          <span className="shrink-0 text-xs text-slate-500">{l.stats.lessonPct}% · {formatDate(l.profile.last_active_at!)}</span>
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}

      {tab === "learners" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <label htmlFor="adm-q" className="sr-only">Search learners</label>
                <input id="adm-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className="w-full rounded-xl border border-white/15 bg-navy-900 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
              </div>
              <label className="text-sm text-slate-300">
                <span className="sr-only">Filter</span>
                <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className="w-full rounded-xl border border-white/15 bg-navy-900 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400">
                  <option value="all">All learners</option>
                  <option value="certified">Completion record earned</option>
                  <option value="in-progress">In progress</option>
                  <option value="not-started">Not started</option>
                  <option value="disabled">Disabled</option>
                  <option value="admins">Admins</option>
                </select>
              </label>
              <label className="text-sm text-slate-300">
                <span className="sr-only">Sort</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-full rounded-xl border border-white/15 bg-navy-900 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400">
                  <option value="recent">Sort: last active</option>
                  <option value="joined">Sort: newest</option>
                  <option value="name">Sort: name</option>
                  <option value="progress">Sort: progress</option>
                  <option value="capstone">Sort: capstone score</option>
                </select>
              </label>
            </div>
            <p className="text-sm text-slate-400" aria-live="polite">{list.length} of {total} learners</p>
            {list.length === 0 ? (
              <EmptyState title="No learners match" />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <caption className="sr-only">Learners</caption>
                  <thead className="bg-white/5 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th scope="col" className="px-4 py-3">Learner</th>
                      <th scope="col" className="px-4 py-3">Last active</th>
                      <th scope="col" className="px-4 py-3">Lessons</th>
                      <th scope="col" className="px-4 py-3">Capstone</th>
                      <th scope="col" className="px-4 py-3">Record</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {list.map((l) => {
                      const rs = recordStatus(l);
                      return (
                        <tr key={l.profile.id} className={`cursor-pointer hover:bg-white/[0.04] ${selected === l.profile.id ? "bg-cyan-400/10" : ""}`} onClick={() => setSelected(l.profile.id)}>
                          <td className="px-4 py-3">
                            <button type="button" className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" onClick={() => setSelected(l.profile.id)}>
                              <span className="flex items-center gap-1.5 font-medium text-white">
                                {l.profile.full_name || "—"}
                                {l.profile.role === "admin" && <Shield className="h-3.5 w-3.5 text-caution-400" aria-label="Admin" />}
                                {l.profile.disabled && <UserX className="h-3.5 w-3.5 text-hazard-400" aria-label="Disabled" />}
                              </span>
                              <span className="block text-xs text-slate-400">{l.profile.email}</span>
                            </button>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{l.profile.last_active_at ? formatDate(l.profile.last_active_at) : "Never"}</td>
                          <td className="px-4 py-3">
                            <span className="text-slate-200">{l.stats.lessonsDone}/{l.stats.lessonsTotal}</span>
                            <ProgressBar value={l.stats.lessonPct} label={`${l.profile.email} lesson completion`} className="mt-1 w-24" />
                          </td>
                          <td className="px-4 py-3 text-slate-200">{l.stats.best ? `${pct(l.stats.best.correct, l.stats.best.total)}%` : "—"}</td>
                          <td className="px-4 py-3"><Badge tone={rs.tone}>{rs.label}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <aside aria-label="Learner detail" className="xl:sticky xl:top-24 xl:self-start">
            {!sel ? (
              <EmptyState title="Select a learner">Choose a row to see their full progress and manage the account.</EmptyState>
            ) : (
              <Card className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-white">{sel.profile.full_name || "—"}</p>
                    <p className="truncate text-sm text-slate-400">{sel.profile.email}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Joined {formatDate(sel.profile.created_at)}
                      {sel.updatedAt && ` · progress saved ${formatDate(sel.updatedAt)}`}
                    </p>
                  </div>
                  <Button variant="ghost" className="p-1.5" aria-label="Close learner detail" onClick={() => setSelected(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    ["Lessons", `${sel.stats.lessonPct}%`],
                    ["Labs", `${sel.stats.labsDone}/${sel.stats.labsTotal}`],
                    ["Capstone", sel.stats.best ? `${pct(sel.stats.best.correct, sel.stats.best.total)}%` : "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-white/5 p-2">
                      <p className="text-[11px] uppercase text-slate-400">{k}</p>
                      <p className="font-bold text-white">{v}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-sm font-medium text-white">Manage</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sel.stats.certificateEarned &&
                      (sel.profile.certificate_revoked ? (
                        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => updateProfile(sel.profile.id, { certificate_revoked: false })}>Restore record</Button>
                      ) : (
                        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => updateProfile(sel.profile.id, { certificate_revoked: true }, `Revoke the completion record for ${sel.profile.email}?`)}>Revoke record</Button>
                      ))}
                    {sel.profile.id !== me &&
                      (sel.profile.disabled ? (
                        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => updateProfile(sel.profile.id, { disabled: false })}>Enable account</Button>
                      ) : (
                        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => updateProfile(sel.profile.id, { disabled: true }, `Disable ${sel.profile.email}? They can still sign in but progress will not save.`)}>Disable account</Button>
                      ))}
                    {sel.profile.id !== me &&
                      (sel.profile.role === "admin" ? (
                        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => updateProfile(sel.profile.id, { role: "learner" }, `Remove admin rights from ${sel.profile.email}?`)}>Remove admin</Button>
                      ) : (
                        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => updateProfile(sel.profile.id, { role: "admin" }, `Give ${sel.profile.email} full admin rights?`)}>Make admin</Button>
                      ))}
                    <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => resetProgress(sel)}>Reset progress</Button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">To delete an account entirely, use Supabase → Authentication → Users.</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-white">Modules</p>
                  <ul className="mt-2 space-y-1.5">
                    {sel.stats.moduleStatus.map((m) => (
                      <li key={m.module.id} className="text-xs">
                        <div className="flex justify-between text-slate-300"><span className="truncate">{m.module.number}. {m.module.title}</span><span>{m.completed}/{m.total}</span></div>
                        <ProgressBar value={m.pct} label={`${m.module.title}`} className="mt-0.5" />
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-medium text-white">Topic performance (exams)</p>
                  <div className="mt-2">
                    <BarList data={Object.entries(sel.stats.topic).map(([t, v]) => ({ label: t, value: pct(v.correct, v.total), detail: `${v.correct}/${v.total}` }))} emptyText="No exam attempts yet." />
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-white">Exam attempts</p>
                  {sel.state.exams.length === 0 ? (
                    <p className="mt-1 text-xs text-slate-400">None.</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-xs">
                      {sel.state.exams.slice(0, 10).map((e) => (
                        <li key={e.id} className="flex justify-between text-slate-300">
                          <span>{e.kind === "capstone" ? "Capstone" : "Practice"} · {formatDate(e.date)} · {e.mode}</span>
                          <span className="font-semibold text-white">{pct(e.correct, e.total)}%</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium text-white">Labs</p>
                  <ul className="mt-2 grid grid-cols-2 gap-1 text-xs">
                    {labs.map((lab) => (
                      <li key={lab.id} className="flex justify-between gap-2 text-slate-400">
                        <span className="truncate">{lab.title}</span>
                        <span className="text-slate-200">{sel.state.labResults[lab.id] ? `${sel.state.labResults[lab.id].score}/${sel.state.labResults[lab.id].total}` : "—"}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-medium text-white">Recent activity</p>
                  {sel.state.activity.length === 0 ? (
                    <p className="mt-1 text-xs text-slate-400">None.</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-xs">
                      {sel.state.activity.slice(0, 8).map((a, i) => (
                        <li key={i} className="flex justify-between gap-2 text-slate-300"><span className="truncate">{a.label}</span><span className="shrink-0 text-slate-500">{formatDate(a.date)}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            )}
          </aside>
        </div>
      )}

      {tab === "content" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="font-semibold text-white">Exam performance by topic (all learners)</h2>
            <div className="mt-4">
              <BarList data={Object.entries(topic).map(([t, v]) => ({ label: t, value: pct(v.c, v.t), detail: `${v.c}/${v.t}` })).sort((a, b) => a.value - b.value)} emptyText="No exam attempts yet." />
            </div>
          </Card>
          <Card>
            <h2 className="font-semibold text-white">Most-missed questions</h2>
            {topMissed.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">No exam attempts yet.</p>
            ) : (
              <ol className="mt-3 space-y-2 text-sm">
                {topMissed.map(([id, n]) => (
                  <li key={id} className="rounded-lg bg-white/5 p-3">
                    <p className="text-slate-200">{questionById[id]?.stem ?? id}</p>
                    <p className="mt-1 text-xs text-slate-500">{questionById[id]?.topic} · missed {n} time{n > 1 ? "s" : ""} · {id}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          <Card className="lg:col-span-2">
            <h2 className="font-semibold text-white">Module completion across learners</h2>
            <div className="mt-4">
              <BarList data={moduleReach} emptyText="No learners yet." />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
