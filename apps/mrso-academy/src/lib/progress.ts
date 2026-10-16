"use client";

import { useSyncExternalStore } from "react";

/**
 * Local demonstration progress store.
 *
 * Progress always lives in this browser's localStorage. When Supabase accounts
 * are configured and the learner is signed in, lib/auth.tsx additionally syncs
 * the same document to the `progress` table (see supabase/schema.sql).
 */

const STORAGE_KEY = "mrso-academy:progress:v1";

export interface ExamAttempt {
  id: string;
  kind: "practice" | "capstone";
  mode: "timed" | "untimed";
  date: string;
  total: number;
  correct: number;
  durationSec: number;
  byTopic: Record<string, { correct: number; total: number }>;
  wrongIds: string[];
}

export interface ActivityItem {
  label: string;
  href: string;
  date: string;
}

export interface ProgressState {
  version: 1;
  completedLessons: Record<string, string>;
  lessonQuiz: Record<string, { correct: number; total: number; date: string }>;
  labResults: Record<string, { score: number; total: number; date: string }>;
  caseViewed: Record<string, string>;
  exams: ExamAttempt[];
  bookmarks: string[];
  flashcards: Record<string, "known" | "learning">;
  learningSeconds: number;
  activity: ActivityItem[];
  learnerName: string;
}

const empty: ProgressState = {
  version: 1,
  completedLessons: {},
  lessonQuiz: {},
  labResults: {},
  caseViewed: {},
  exams: [],
  bookmarks: [],
  flashcards: {},
  learningSeconds: 0,
  activity: [],
  learnerName: "",
};

let state: ProgressState = empty;
let loaded = false;
let storageAvailable = true;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ProgressState>;
      if (parsed.version === 1) state = { ...empty, ...parsed };
    }
  } catch {
    storageAvailable = false;
  }
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    storageAvailable = false;
  }
}

function update(fn: (s: ProgressState) => ProgressState) {
  load();
  state = fn(state);
  persist();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      loaded = false;
      load();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => {
  load();
  return state;
};
const getServerSnapshot = () => empty;

export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function isStorageAvailable() {
  load();
  return storageAvailable;
}

const now = () => new Date().toISOString();

function withActivity(s: ProgressState, label: string, href: string): ProgressState {
  return { ...s, activity: [{ label, href, date: now() }, ...s.activity].slice(0, 25) };
}

export const progress = {
  completeLesson(key: string, label: string, href: string) {
    update((s) =>
      s.completedLessons[key]
        ? s
        : withActivity({ ...s, completedLessons: { ...s.completedLessons, [key]: now() } }, `Completed lesson: ${label}`, href),
    );
  },
  uncompleteLesson(key: string) {
    update((s) => {
      const next = { ...s.completedLessons };
      delete next[key];
      return { ...s, completedLessons: next };
    });
  },
  recordLessonQuiz(key: string, correct: number, total: number, label: string, href: string) {
    update((s) =>
      withActivity(
        { ...s, lessonQuiz: { ...s.lessonQuiz, [key]: { correct, total, date: now() } } },
        `Knowledge check ${correct}/${total}: ${label}`,
        href,
      ),
    );
  },
  recordLab(id: string, score: number, total: number, label: string) {
    update((s) =>
      withActivity(
        { ...s, labResults: { ...s.labResults, [id]: { score, total, date: now() } } },
        `Lab ${score}/${total}: ${label}`,
        `/lab/${id}/`,
      ),
    );
  },
  viewCase(id: string, label: string) {
    update((s) =>
      s.caseViewed[id] ? s : withActivity({ ...s, caseViewed: { ...s.caseViewed, [id]: now() } }, `Worked case: ${label}`, `/cases/${id}/`),
    );
  },
  recordExam(attempt: ExamAttempt) {
    update((s) =>
      withActivity(
        { ...s, exams: [attempt, ...s.exams].slice(0, 50) },
        `${attempt.kind === "capstone" ? "Capstone" : "Practice exam"}: ${Math.round((attempt.correct / attempt.total) * 100)}%`,
        "/exam/",
      ),
    );
  },
  toggleBookmark(key: string) {
    update((s) => ({
      ...s,
      bookmarks: s.bookmarks.includes(key) ? s.bookmarks.filter((b) => b !== key) : [key, ...s.bookmarks],
    }));
  },
  setFlashcard(term: string, status: "known" | "learning") {
    update((s) => ({ ...s, flashcards: { ...s.flashcards, [term]: status } }));
  },
  addLearningSeconds(sec: number) {
    update((s) => ({ ...s, learningSeconds: s.learningSeconds + sec }));
  },
  setLearnerName(name: string) {
    update((s) => ({ ...s, learnerName: name.slice(0, 80) }));
  },
  reset() {
    update(() => empty);
  },
  exportJson(): string {
    load();
    return JSON.stringify(state, null, 2);
  },
};

/** Fill in missing fields so documents from older versions or the server are safe to use. */
export function normalizeState(raw: unknown): ProgressState {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<ProgressState>;
  return { ...empty, ...r, version: 1 };
}

export function isEmptyState(s: ProgressState) {
  return (
    Object.keys(s.completedLessons).length === 0 &&
    s.exams.length === 0 &&
    Object.keys(s.labResults).length === 0 &&
    Object.keys(s.lessonQuiz).length === 0 &&
    s.bookmarks.length === 0
  );
}

const latest = <T extends { date: string }>(a?: T, b?: T) => (!a ? b : !b ? a : a.date >= b.date ? a : b);
function mergeByDate<T extends { date: string }>(a: Record<string, T>, b: Record<string, T>) {
  const out: Record<string, T> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = latest(out[k], v)!;
  return out;
}

/** Combine two progress documents without losing work from either (e.g. guest work + account). */
export function mergeStates(a: ProgressState, b: ProgressState): ProgressState {
  const exams = [...a.exams, ...b.exams.filter((e) => !a.exams.some((x) => x.id === e.id))].sort((x, y) => (x.date < y.date ? 1 : -1));
  const activity = [...a.activity, ...b.activity]
    .filter((x, i, arr) => arr.findIndex((y) => y.date === x.date && y.label === x.label) === i)
    .sort((x, y) => (x.date < y.date ? 1 : -1))
    .slice(0, 25);
  const earliest = (x: Record<string, string>, y: Record<string, string>) => {
    const o = { ...x };
    for (const [k, v] of Object.entries(y)) o[k] = o[k] && o[k] < v ? o[k] : v;
    return o;
  };
  return {
    version: 1,
    completedLessons: earliest(a.completedLessons, b.completedLessons),
    caseViewed: earliest(a.caseViewed, b.caseViewed),
    lessonQuiz: mergeByDate(a.lessonQuiz, b.lessonQuiz),
    labResults: mergeByDate(a.labResults, b.labResults),
    exams: exams.slice(0, 50),
    bookmarks: Array.from(new Set([...a.bookmarks, ...b.bookmarks])),
    flashcards: { ...b.flashcards, ...a.flashcards },
    learningSeconds: Math.max(a.learningSeconds, b.learningSeconds),
    activity,
    learnerName: a.learnerName || b.learnerName,
  };
}

/** Low-level access used by the account sync layer. */
export const progressStore = {
  get: getSnapshot,
  replace(next: ProgressState) {
    update(() => normalizeState(next));
  },
  subscribe(listener: () => void) {
    load();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export const CAPSTONE_PASS_MARK = 0.8;

export function bestCapstone(s: ProgressState): ExamAttempt | undefined {
  return s.exams
    .filter((e) => e.kind === "capstone")
    .sort((a, b) => b.correct / b.total - a.correct / a.total)[0];
}
