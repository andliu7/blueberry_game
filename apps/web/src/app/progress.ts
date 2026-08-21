/**
 * Progress, as the SHELL sees it. Read this header before trusting anything
 * in this file.
 *
 * CLAUDE.md, non-negotiables: unlock state, diamond balances, ratings and
 * standings are enforced server side, and a client side value is a suggestion.
 * Phase 6 builds that server. Phase 5 has to render a pathway, a balance and a
 * reward moment today, so this file is the SEAM: one interface, ProgressSource,
 * that the tabs read through, and one implementation, the local store below,
 * that keeps a per-device copy in localStorage.
 *
 * What that local copy is: a rendering cache and an offline draft. What it is
 * not: an entitlement. Nothing paid is gated on it (the free tier is tutorial,
 * intro lessons, periodic table, five problems a day, all of which are free
 * here regardless), and Phase 6 replaces `createLocalProgress` with a Supabase
 * backed source that reconciles this draft against the append only attempt
 * history. A student who edits localStorage has edited a cache.
 *
 * The store is an external store (subscribe plus getSnapshot), the same shape
 * as packages/interaction/src/store.ts, so tabs read it with
 * useSyncExternalStore and nothing here imports React.
 */

import type { CourseId, ProblemId, TopicId } from "@blueberry/curriculum";

export interface LessonRecord {
  readonly topic: TopicId;
  readonly correct: number;
  readonly attempted: number;
  readonly completedAt: string;
}

export interface ProgressSnapshot {
  /** The course the pathway opens on. Null until the placement quiz or a pick. */
  readonly course: CourseId | null;
  /** The placement's starting frontier. Topics before these render as done. */
  readonly startTopics: readonly TopicId[];
  readonly lessons: Readonly<Record<string, LessonRecord>>;
  readonly attemptedProblems: readonly ProblemId[];
  readonly diamonds: number;
  /** Distinct local dates with at least one completed lesson. Rewards returning. */
  readonly activeDays: readonly string[];
  readonly onboardingDone: boolean;
  readonly displayName: string | null;
}

export interface ProgressSource {
  getSnapshot(): ProgressSnapshot;
  subscribe(listener: () => void): () => void;
  setCourse(course: CourseId, startTopics: readonly TopicId[]): void;
  /** A finished lesson. Returns the diamonds earned so the reward moment can show the number. */
  completeLesson(topic: TopicId, correct: number, attempted: number, problemIds: readonly ProblemId[]): number;
  finishOnboarding(): void;
  setDisplayName(name: string): void;
  reset(): void;
}

const STORAGE_KEY = "blueberry.progress.v1";

export const EMPTY_PROGRESS: ProgressSnapshot = Object.freeze({
  course: null,
  startTopics: [],
  lessons: {},
  attemptedProblems: [],
  diamonds: 0,
  activeDays: [],
  onboardingDone: false,
  displayName: null,
});

/** Diamonds per lesson: a base, plus one per correct answer, plus a return bonus. */
export const DIAMONDS_BASE = 10;
export const DIAMONDS_PER_CORRECT = 2;
export const DIAMONDS_RETURN_BONUS = 5;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(): ProgressSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return EMPTY_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<ProgressSnapshot>;
    return { ...EMPTY_PROGRESS, ...parsed };
  } catch {
    return EMPTY_PROGRESS;
  }
}

function save(snapshot: ProgressSnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* storage blocked: the session still works, it just does not persist */
  }
}

export function createLocalProgress(): ProgressSource {
  let snapshot = load();
  const listeners = new Set<() => void>();

  const commit = (next: ProgressSnapshot) => {
    snapshot = next;
    save(next);
    for (const listener of listeners) listener();
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setCourse(course, startTopics) {
      commit({ ...snapshot, course, startTopics: [...startTopics] });
    },
    completeLesson(topic, correct, attempted, problemIds) {
      const today = todayKey();
      const returning = snapshot.activeDays.length > 0 && !snapshot.activeDays.includes(today);
      const earned = DIAMONDS_BASE + correct * DIAMONDS_PER_CORRECT + (returning ? DIAMONDS_RETURN_BONUS : 0);
      const activeDays = snapshot.activeDays.includes(today)
        ? snapshot.activeDays
        : [...snapshot.activeDays, today];
      commit({
        ...snapshot,
        lessons: {
          ...snapshot.lessons,
          [topic]: { topic, correct, attempted, completedAt: new Date().toISOString() },
        },
        attemptedProblems: [...new Set([...snapshot.attemptedProblems, ...problemIds])],
        diamonds: snapshot.diamonds + earned,
        activeDays,
      });
      return earned;
    },
    finishOnboarding() {
      commit({ ...snapshot, onboardingDone: true });
    },
    setDisplayName(name) {
      commit({ ...snapshot, displayName: name.trim() === "" ? null : name.trim() });
    },
    reset() {
      commit(EMPTY_PROGRESS);
    },
  };
}

/** One instance for the app. Module scope, like the step scene in Phase 4. */
export const progress: ProgressSource = createLocalProgress();
