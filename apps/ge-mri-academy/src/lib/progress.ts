"use client";

import { useSyncExternalStore } from "react";

/**
 * Browser-local learning progress store.
 *
 * Limitation: everything lives in this browser's localStorage — it is not
 * shared across devices or browsers, and clearing site data erases it. The
 * shape is versioned and serialisable so a backend (e.g. a `progress` table
 * keyed by user id) can store the same document later.
 */

const KEY = "ge-mri-academy:progress:v1";

export interface ActivityItem {
  label: string;
  href: string;
  kind: "parameter" | "sequence" | "protocol" | "case" | "troubleshooting" | "physics" | "exam" | "simulator";
  date: string;
}

export interface ExamAttempt {
  id: string;
  date: string;
  mode: "practice" | "timed";
  topic: string;
  total: number;
  correct: number;
  wrongIds: string[];
  durationSec: number;
}

export interface SavedConfig {
  id: string;
  name: string;
  date: string;
  params: Record<string, unknown>;
}

export interface ProgressState {
  version: 1;
  visited: Record<string, string>; // key "kind:id" → ISO date
  completed: Record<string, string>;
  bookmarks: string[]; // "kind:id"
  savedProtocols: string[]; // protocol ids
  savedConfigs: SavedConfig[];
  caseResults: Record<string, { score: number; total: number; date: string }>;
  questionHistory: Record<string, { correct: boolean; date: string }>;
  exams: ExamAttempt[];
  activity: ActivityItem[];
}

const empty: ProgressState = {
  version: 1,
  visited: {},
  completed: {},
  bookmarks: [],
  savedProtocols: [],
  savedConfigs: [],
  caseResults: {},
  questionHistory: {},
  exams: [],
  activity: [],
};

let state: ProgressState = empty;
let loaded = false;
let available = true;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ProgressState>;
      if (parsed.version === 1) state = { ...empty, ...parsed };
    }
  } catch {
    available = false;
  }
}

function commit(next: ProgressState) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    available = false;
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  load();
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useProgress(): ProgressState {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return state;
    },
    () => empty,
  );
}

export function storageAvailable() {
  load();
  return available;
}

const now = () => new Date().toISOString();

export const progress = {
  get: () => {
    load();
    return state;
  },
  visit(kind: ActivityItem["kind"], id: string, label: string, href: string) {
    load();
    const key = `${kind}:${id}`;
    const activity = [{ kind, label, href, date: now() }, ...state.activity.filter((a) => a.href !== href)].slice(0, 30);
    commit({ ...state, visited: { ...state.visited, [key]: now() }, activity });
  },
  toggleComplete(key: string) {
    load();
    const completed = { ...state.completed };
    if (completed[key]) delete completed[key];
    else completed[key] = now();
    commit({ ...state, completed });
  },
  toggleBookmark(key: string) {
    load();
    const has = state.bookmarks.includes(key);
    commit({ ...state, bookmarks: has ? state.bookmarks.filter((b) => b !== key) : [key, ...state.bookmarks] });
  },
  toggleSavedProtocol(id: string) {
    load();
    const has = state.savedProtocols.includes(id);
    commit({ ...state, savedProtocols: has ? state.savedProtocols.filter((b) => b !== id) : [id, ...state.savedProtocols] });
  },
  saveConfig(name: string, params: Record<string, unknown>) {
    load();
    const cfg: SavedConfig = { id: Math.random().toString(36).slice(2, 10), name, date: now(), params };
    commit({ ...state, savedConfigs: [cfg, ...state.savedConfigs].slice(0, 20) });
  },
  deleteConfig(id: string) {
    load();
    commit({ ...state, savedConfigs: state.savedConfigs.filter((c) => c.id !== id) });
  },
  recordCase(id: string, score: number, total: number) {
    load();
    commit({ ...state, caseResults: { ...state.caseResults, [id]: { score, total, date: now() } }, completed: { ...state.completed, [`case:${id}`]: now() } });
  },
  recordAnswer(qid: string, correct: boolean) {
    load();
    commit({ ...state, questionHistory: { ...state.questionHistory, [qid]: { correct, date: now() } } });
  },
  recordExam(a: Omit<ExamAttempt, "id" | "date">) {
    load();
    const attempt: ExamAttempt = { ...a, id: Math.random().toString(36).slice(2, 10), date: now() };
    commit({ ...state, exams: [attempt, ...state.exams].slice(0, 50) });
  },
  reset() {
    load();
    commit({ ...empty });
  },
  exportJson() {
    load();
    return JSON.stringify(state, null, 2);
  },
};
