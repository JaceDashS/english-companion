/**
 * Word content bundled with the app. The server stores only progress keyed by word ID,
 * so IDs must stay stable once published.
 */
export interface UsageQuiz {
  pattern?: string;
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
  decomposition?: string;
  roots?: string[];
  quizzes?: UsageQuiz[];
  quiz: UsageQuiz | null;
}

export interface EnglishUnit {
  id: string;
  title: string;
  words: EnglishWord[];
}

/** A named group of units; word IDs remain globally stable across all books. */
export interface EnglishBook {
  id: string;
  title: string;
  units: EnglishUnit[];
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
  return { sentences: sentences.map((s, i) => text(s, `${where}.sentences[${i}]`)), answer: answer as number, ...(typeof (value as any).pattern === "string" ? { pattern: (value as any).pattern } : {}) };
}

function parseUnits(units: unknown, seen: Set<string>, unitIds: Set<string>): EnglishUnit[] {
  if (!Array.isArray(units)) throw new ContentError("units must be an array");
  return units.map((unit, u) => {
    const where = `units[${u}]`;
    const { id, title, words } = (unit ?? {}) as { id?: unknown; title?: unknown; words?: unknown };
    if (typeof id !== "string" || !ID.test(id)) throw new ContentError(where + ".id is invalid");
    if (unitIds.has(id)) throw new ContentError(where + ".id is duplicated");
    unitIds.add(id);
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
          example: text(value.decomposition ?? value.example ?? "", at + ".decomposition"),
          decomposition: text(value.decomposition ?? value.example ?? "", at + ".decomposition"),
          roots: Array.isArray(value.roots) ? value.roots.map((root, i) => text(root, `${at}.roots[${i}]`)) : [],
          quizzes: Array.isArray(value.quizzes) ? value.quizzes.map((q, i) => parseQuiz(q, `${at}.quizzes[${i}]`)!).filter(Boolean) : undefined,
          quiz: parseQuiz(value.quiz ?? (Array.isArray(value.quizzes) ? value.quizzes[0] : null), at + ".quiz"),
        };
      }),
    };
  });
}

/** Parse named books or wrap the legacy flat units in a default book without changing IDs. */
export function parseBooks(raw: unknown): EnglishBook[] {
  const { version, books, units } = (raw ?? {}) as { version?: unknown; books?: unknown; units?: unknown };
  if (version !== 1) throw new ContentError("Unsupported content version");
  const words = new Set<string>();
  const unitIds = new Set<string>();
  if (books === undefined) return [{ id: "default", title: "기본 교재", units: parseUnits(units, words, unitIds) }];
  if (units !== undefined) throw new ContentError("Use books or units, not both");
  if (!Array.isArray(books)) throw new ContentError("books must be an array");
  const ids = new Set<string>();
  return books.map((book, index) => {
    const { id, title, units: content } = (book ?? {}) as { id?: unknown; title?: unknown; units?: unknown };
    if (typeof id !== "string" || !ID.test(id) || ids.has(id)) throw new ContentError(`books[${index}].id is invalid or duplicated`);
    ids.add(id);
    const name = text(title, `books[${index}].title`);
    if (!name.trim()) throw new ContentError(`books[${index}].title must not be empty`);
    return { id, title: name, units: parseUnits(content, words, unitIds) };
  });
}

/** Return all validated units in original order for existing desktop and study consumers. */
export function parseContent(raw: unknown): EnglishUnit[] {
  return parseBooks(raw).flatMap(book => book.units);
}
