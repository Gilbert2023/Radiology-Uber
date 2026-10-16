import { allLessons, modules, questionById } from "@/content";
import { labs } from "@/content/labs";
import { bestCapstone, CAPSTONE_PASS_MARK, type ProgressState } from "./progress";
import { pct } from "./utils";

export function computeStats(s: ProgressState) {
  const done = allLessons.filter((l) => s.completedLessons[l.key]);
  const lessonPct = pct(done.length, allLessons.length);
  const moduleStatus = modules.map((m) => {
    const keys = m.lessons.map((l) => `${m.id}/${l.id}`);
    const completed = keys.filter((k) => s.completedLessons[k]).length;
    return { module: m, completed, total: keys.length, pct: pct(completed, keys.length) };
  });
  const next = allLessons.find((l) => !s.completedLessons[l.key]);

  const quizzes = Object.values(s.lessonQuiz);
  const quizAvg = quizzes.length ? pct(quizzes.reduce((a, q) => a + q.correct, 0), quizzes.reduce((a, q) => a + q.total, 0)) : null;

  // Topic performance across lesson checks and exams.
  const topic: Record<string, { correct: number; total: number }> = {};
  for (const e of s.exams) {
    for (const [t, v] of Object.entries(e.byTopic)) {
      topic[t] = topic[t] ?? { correct: 0, total: 0 };
      topic[t].correct += v.correct;
      topic[t].total += v.total;
    }
  }

  const best = bestCapstone(s);
  const capstonePassed = !!best && best.correct / best.total >= CAPSTONE_PASS_MARK;
  const allLessonsDone = done.length === allLessons.length;
  const labsDone = labs.filter((l) => s.labResults[l.id]).length;

  // Overall completion: lessons 70%, labs 15%, capstone pass 15%.
  const overall = Math.round(lessonPct * 0.7 + pct(labsDone, labs.length) * 0.15 + (capstonePassed ? 15 : 0));

  const weakTopics = Object.entries(topic)
    .filter(([, v]) => v.total >= 2)
    .map(([t, v]) => ({ topic: t, pct: pct(v.correct, v.total) }))
    .sort((a, b) => a.pct - b.pct)
    .filter((t) => t.pct < 75);

  return {
    lessonsDone: done.length,
    lessonsTotal: allLessons.length,
    lessonPct,
    moduleStatus,
    next,
    quizAvg,
    topic,
    weakTopics,
    best,
    capstonePassed,
    allLessonsDone,
    certificateEarned: capstonePassed && allLessonsDone,
    labsDone,
    labsTotal: labs.length,
    overall,
  };
}

export function topicOfQuestion(id: string) {
  return questionById[id]?.topic;
}
