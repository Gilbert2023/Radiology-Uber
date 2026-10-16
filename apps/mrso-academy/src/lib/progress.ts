"use client";

import { useSyncExternalStore } from "react";

/**
 * Local demonstration progress store.
 *
 * LIMITATION: progress is stored in this browser's localStorage only. It is not
 * tied to an account, does not sync across devices, is lost if site data is
 * cleared, and can be edited by the user — so it cannot evidence completion to
 * anyone else. A production deployment should replace this module with an
 * authenticated API backed by a database (see README).
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

export const CAPSTONE_PASS_MARK = 0.8;

export function bestCapstone(s: ProgressState): ExamAttempt | undefined {
  return s.exams
    .filter((e) => e.kind === "capstone")
    .sort((a, b) => b.correct / b.total - a.correct / a.total)[0];
}
