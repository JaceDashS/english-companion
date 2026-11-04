import type { Progress, StudyResult } from "../api/types";
import type { EnglishUnit, EnglishWord } from "../content/content";

export interface UnitSummary {
  total: number;
  /** Words that have been graded at least once. */
  started: number;
  /** Started words whose review date has arrived. */
  due: number;
}

/** Counts a unit's words by state on the account date `today` (YYYY-MM-DD). */
export function summarizeUnit(unit: EnglishUnit, progress: Progress, today: string): UnitSummary {
  let started = 0;
  let due = 0;
  for (const word of unit.words) {
    const entry = progress[word.id];
    if (!entry) continue;
    started++;
    if (entry.due <= today) due++;
  }
  return { total: unit.words.length, started, due };
}

/** Started words with a usage quiz whose review date is on or before `today`, in content order. */
export function dueWords(units: EnglishUnit[], progress: Progress, today: string): EnglishWord[] {
  return units.flatMap((unit) => unit.words.filter((word) => word.quiz && progress[word.id] && progress[word.id].due <= today));
}

/** Words that can be graded in a quiz session. */
export function quizWords(words: EnglishWord[]): EnglishWord[] {
  return words.filter((word) => word.quiz !== null);
}

/** Fisher-Yates order of the four sentence indexes. `random` is injectable for tests. */
export function sentenceOrder(random: () => number = Math.random): number[] {
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** PASS when the chosen original sentence index is the intended-sense sentence. */
export function grade(word: EnglishWord, chosenIndex: number): StudyResult {
  return word.quiz && word.quiz.answer === chosenIndex ? "PASS" : "FAIL";
}
