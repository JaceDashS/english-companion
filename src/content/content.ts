/**
 * Word content bundled with the app. The server stores only progress keyed by word ID,
 * so IDs must stay stable once published.
 */
export interface UsageQuiz {
  /** Exactly four sentences that all use the word. */
  sentences: string[];
  /** Index (0-3) of the sentence that uses the word in the intended sense. */
  answer: number;
}

export interface EnglishWord {
  id: string;
  word: string;
  meaning: string;
  example: string;
  quiz: UsageQuiz | null;
}

export interface EnglishUnit {
  id: string;
  title: string;
  words: EnglishWord[];
}

const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

export class ContentError extends Error {}

function text(value: unknown, where: string): string {
  if (typeof value !== "string") throw new ContentError(where + " must be a string");
  return value;
}

function parseQuiz(value: unknown, where: string): UsageQuiz | null {
  if (value === undefined || value === null) return null;
  const { sentences, answer } = value as { sentences?: unknown; answer?: unknown };
  if (!Array.isArray(sentences) || sentences.length !== 4) throw new ContentError(where + ".sentences must have 4 sentences");
  if (!Number.isInteger(answer) || (answer as number) < 0 || (answer as number) > 3) throw new ContentError(where + ".answer must be 0-3");
  return { sentences: sentences.map((s, i) => text(s, `${where}.sentences[${i}]`)), answer: answer as number };
}

/** Validates the content file and returns its units. Word IDs must be unique across all units. */
export function parseContent(raw: unknown): EnglishUnit[] {
  const { version, units } = (raw ?? {}) as { version?: unknown; units?: unknown };
  if (version !== 1) throw new ContentError("Unsupported content version");
  if (!Array.isArray(units)) throw new ContentError("units must be an array");
  const seen = new Set<string>();
  return units.map((unit, u) => {
    const where = `units[${u}]`;
    const { id, title, words } = (unit ?? {}) as { id?: unknown; title?: unknown; words?: unknown };
    if (typeof id !== "string" || !ID.test(id)) throw new ContentError(where + ".id is invalid");
    if (!Array.isArray(words)) throw new ContentError(where + ".words must be an array");
    return {
      id,
      title: text(title, where + ".title"),
      words: words.map((word, w) => {
        const at = `${where}.words[${w}]`;
        const value = (word ?? {}) as Record<string, unknown>;
        if (typeof value.id !== "string" || !ID.test(value.id)) throw new ContentError(at + ".id is invalid");
        if (seen.has(value.id)) throw new ContentError(at + ".id is duplicated");
        seen.add(value.id);
        return {
          id: value.id,
          word: text(value.word, at + ".word"),
          meaning: text(value.meaning, at + ".meaning"),
          example: text(value.example, at + ".example"),
          quiz: parseQuiz(value.quiz, at + ".quiz"),
        };
      }),
    };
  });
}
