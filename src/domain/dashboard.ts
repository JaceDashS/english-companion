import type { Progress } from "../api/types";
import type { EnglishUnit, EnglishWord } from "../content/content";

/** The last review stage; a word at this stage counts as graduated. */
export const MAX_STAGE = 6;
/** Labels for the stage distribution: unstarted words first, then the review interval of each stage. */
export const STAGE_LABELS = ["신규", "1일", "2일", "4일", "7일", "15일", "30일"];

export interface UnitRow {
  unit: EnglishUnit;
  /** 1-based position in content order, shown as "Unit n". */
  position: number;
  total: number;
  started: number;
  /** Started words with a usage quiz whose review date has arrived. */
  dueWords: EnglishWord[];
  failCount: number;
  passRatio: number;
  graduated: boolean;
  /** Latest account date a word of the unit was graded, or "" when never. */
  lastDate: string;
  /** Average stage of started words, 0 when none. */
  averageStage: number;
}

/** Per-unit rows used by the dashboard, Unit grid and recent list. Dates use the account calendar `today`. */
export function buildUnitRows(units: EnglishUnit[], progress: Progress, today: string): UnitRow[] {
  return units.map((unit, index) => {
    const entries = unit.words.map((word) => progress[word.id]).filter(Boolean);
    const passes = entries.filter((entry) => entry.lastResult === "PASS").length;
    return {
      unit,
      position: index + 1,
      total: unit.words.length,
      started: entries.length,
      dueWords: unit.words.filter((word) => word.quiz && progress[word.id] && progress[word.id].due <= today),
      failCount: entries.filter((entry) => entry.lastResult === "FAIL").length,
      passRatio: entries.length ? passes / entries.length : 0,
      graduated: unit.words.length > 0 && unit.words.every((word) => (progress[word.id]?.stage ?? 0) >= MAX_STAGE),
      lastDate: entries.reduce((latest, entry) => (entry.updatedAt.slice(0, 10) > latest ? entry.updatedAt.slice(0, 10) : latest), ""),
      averageStage: entries.length ? entries.reduce((sum, entry) => sum + entry.stage, 0) / entries.length : 0,
    };
  });
}

/** Today's queue: units with due reviews, and the first unit that still has unstarted words. */
export function buildQueue(rows: UnitRow[]) {
  return {
    reviews: rows.filter((row) => row.dueWords.length > 0),
    learning: rows.filter((row) => row.started < row.total).slice(0, 1),
  };
}

/** Word counts per stage bucket: unstarted or failed-to-zero words first, then stages 1 to MAX_STAGE. */
export function stageBuckets(units: EnglishUnit[], progress: Progress) {
  const counts = STAGE_LABELS.map(() => 0);
  for (const word of units.flatMap((unit) => unit.words)) counts[Math.max(0, Math.min(MAX_STAGE, progress[word.id]?.stage ?? 0))]++;
  return STAGE_LABELS.map((label, index) => ({ label, count: counts[index] }));
}

/** Days between two YYYY-MM-DD dates, as "오늘", "어제", "n일 전" or the date itself. */
export function relativeDay(date: string, today: string) {
  if (date === today) return "오늘";
  const [fy, fm, fd] = date.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  const diff = Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
  return diff === 1 ? "어제" : diff > 1 ? `${diff}일 전` : date;
}
