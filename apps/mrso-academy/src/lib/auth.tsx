"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { accountsEnabled, getSupabase, type Profile } from "./supabase";
import { isEmptyState, mergeStates, normalizeState, progress, progressStore } from "./progress";

type SyncStatus = "off" | "loading" | "saved" | "saving" | "error" | "disabled";

interface AuthCtx {
  enabled: boolean;
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  sync: SyncStatus;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  updateName: (name: string) => Promise<string | null>;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

const site = () => (typeof window === "undefined" ? "" : window.location.origin);

export function AuthProvider({ children }: { children: ReactNode }) {
  const sb = getSupabase();
  const [ready, setReady] = useState(!accountsEnabled);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sync, setSync] = useState<SyncStatus>("off");
  const userId = session?.user.id ?? null;
  const syncingFor = useRef<string | null>(null);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [sb]);

  const refreshProfile = useCallback(async () => {
    if (!sb || !userId) return setProfile(null);
    const { data } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
    setProfile((data as Profile) ?? null);
  }, [sb, userId]);

  // Load and merge cloud progress when a user signs in, then keep saving changes.
  useEffect(() => {
    if (!sb || !userId) {
      setSync("off");
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe: (() => void) | undefined;
    syncingFor.current = userId;

    (async () => {
      setSync("loading");
      const { data: prof } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (cancelled) return;
      setProfile((prof as Profile) ?? null);
      const disabled = !!(prof as Profile | null)?.disabled;

      const { data: row, error } = await sb.from("progress").select("state").eq("user_id", userId).maybeSingle();
      if (cancelled) return;
      if (error) return setSync("error");
      const remote = normalizeState(row?.state);
      const local = progressStore.get();
      const merged = isEmptyState(local) ? remote : mergeStates(remote, local);
      progressStore.replace(merged);

      const save = async () => {
        if (syncingFor.current !== userId) return;
        setSync("saving");
        const { error: e } = await sb
          .from("progress")
          .upsert({ user_id: userId, state: progressStore.get(), updated_at: new Date().toISOString() });
        setSync(e ? "error" : "saved");
      };

      if (disabled) {
        setSync("disabled");
      } else {
        await save();
        unsubscribe = progressStore.subscribe(() => {
          clearTimeout(timer);
          timer = setTimeout(save, 1200);
        });
      }
      await sb.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", userId);
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubscribe?.();
    };
  }, [sb, userId]);

  const value = useMemo<AuthCtx>(
    () => ({
      enabled: accountsEnabled,
      ready,
      session,
      profile,
      sync,
      refreshProfile,
      async signIn(email, password) {
        if (!sb) return "Accounts are not configured.";
        const { error } = await sb.auth.signInWithPassword({ email, password });
        return error?.message ?? null;
      },
      async signUp(email, password, fullName) {
        if (!sb) return { error: "Accounts are not configured.", needsConfirmation: false };
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName }, emailRedirectTo: `${site()}/dashboard/` },
        });
        return { error: error?.message ?? null, needsConfirmation: !error && !data.session };
      },
      async signOut() {
        syncingFor.current = null;
        await sb?.auth.signOut();
        setProfile(null);
        // Clear this browser's copy so the next person starts fresh; the account copy is kept in the cloud.
        progress.reset();
      },
      async resetPassword(email) {
        if (!sb) return "Accounts are not configured.";
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${site()}/account/` });
        return error?.message ?? null;
      },
      async updatePassword(password) {
        if (!sb) return "Accounts are not configured.";
        const { error } = await sb.auth.updateUser({ password });
        return error?.message ?? null;
      },
      async updateName(name) {
        if (!sb || !userId) return "Not signed in.";
        const { error } = await sb.from("profiles").update({ full_name: name.slice(0, 120) }).eq("id", userId);
        if (!error) await refreshProfile();
        return error?.message ?? null;
      },
    }),
    [ready, session, profile, sync, sb, userId, refreshProfile],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
