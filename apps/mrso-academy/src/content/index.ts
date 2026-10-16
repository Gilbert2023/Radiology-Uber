import { m01, m02, m03, m04 } from "./modules/m01-m04";
import { m05, m06, m07, m08 } from "./modules/m05-m08";
import { m09, m10, m11, m12, m13, m14 } from "./modules/m09-m14";
import { bankA } from "./questions/bank-a";
import { bankB } from "./questions/bank-b";
import { bankC } from "./questions/bank-c";
import type { Lesson, Module, Question } from "./types";

export const modules: Module[] = [m01, m02, m03, m04, m05, m06, m07, m08, m09, m10, m11, m12, m13, m14];

/**
 * The question bank is assembled from per-topic files. To expand toward 500+
 * items, add new files under content/questions/ and append them here; ids must
 * be unique (enforced by scripts/validate-content.ts).
 */
export const questions: Question[] = [...bankA, ...bankB, ...bankC];

export const questionById: Record<string, Question> = Object.fromEntries(questions.map((q) => [q.id, q]));
export const moduleById: Record<string, Module> = Object.fromEntries(modules.map((m) => [m.id, m]));

export const lessonKey = (moduleId: string, lessonId: string) => `${moduleId}/${lessonId}`;

export interface LessonRef {
  module: Module;
  lesson: Lesson;
  key: string;
}

export const allLessons: LessonRef[] = modules.flatMap((module) =>
  module.lessons.map((lesson) => ({ module, lesson, key: lessonKey(module.id, lesson.id) })),
);

export function findLesson(moduleId: string, lessonId: string): LessonRef | undefined {
  return allLessons.find((l) => l.module.id === moduleId && l.lesson.id === lessonId);
}

export const totalLessonMinutes = allLessons.reduce((s, l) => s + l.lesson.minutes, 0);
