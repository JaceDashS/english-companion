import { buildEnglishImportPrompt, groupWordsByRoot } from "../src/englishImport";
import { proseTokens } from "../src/readingWords";
import assert from "node:assert/strict";
import test from "node:test";
import { ContentError, parseBooks, parseContent } from "../src/content/content.ts";
import raw from "../src/content/words.json" with { type: "json" };
import { dueWords, grade, quizWords, sentenceOrder, summarizeUnit } from "../src/domain/study.ts";
import { remainingNewWords } from "../src/domain/study.ts";
import { buildQueue, buildUnitRows, recentUnits, relativeDay, splitWordsIntoDays, stageBuckets, WORDS_PER_DAY } from "../src/domain/dashboard.ts";

const word = (id: string, quiz = true) => ({
  id,
  word: id,
  meaning: "meaning of " + id,
  example: "An example with " + id + ".",
  ...(quiz ? { quiz: { sentences: ["a", "b", "c", "d"], answer: 2 } } : {}),
});

test("bundled content is valid and starts empty", () => {
  assert.deepEqual(parseContent(raw), []);
});

test("books group units without changing legacy word IDs or progress lookup", () => {
  const unit = { id: "unit-1", title: "Unit 1", words: [word("run")] };
  const legacy = parseBooks({ version: 1, units: [unit] });
  assert.equal(legacy[0].id, "default");
  const raw = { version: 1, books: [
    { id: "first", title: "첫 교재", units: [unit] },
    { id: "second", title: "다른 교재", units: [{ id: "unit-2", title: "Unit 2", words: [word("set")] }] },
  ] };
  const books = parseBooks(raw);
  assert.deepEqual(books.map(book => book.units.map(unit => unit.words[0].id)), [["run"], ["set"]]);
  assert.deepEqual(parseContent(raw).map(unit => unit.id), ["unit-1", "unit-2"]);
  const progress = { run: { stage: 2, due: "2026-11-10", lastResult: "PASS" as const, updatedAt: "" } };
  assert.equal(buildUnitRows(books[0].units, progress, "2026-11-10")[0].started, 1);
  assert.equal(buildUnitRows(books[1].units, progress, "2026-11-10")[0].started, 0);
});

test("book catalogs reject duplicate identities and ambiguous or malformed shapes", () => {
  const book = { id: "book", title: "Book", units: [{ id: "u", title: "Unit", words: [word("run")] }] };
  for (const books of [null, [book, book], [{ ...book, id: "Bad ID" }], [{ ...book, title: " " }], [{ ...book, units: null }],
    [book, { ...book, id: "second" }],
    [book, { id: "second", title: "Second", units: [{ id: "u2", title: "Unit 2", words: [word("run")] }] }]]) {
    assert.throws(() => parseBooks({ version: 1, books }), ContentError);
  }
  assert.throws(() => parseBooks({ version: 1, books: [], units: [] }), ContentError);
  assert.deepEqual(parseBooks({ version: 1, books: [] }), []);
});

test("content parsing keeps fields and rejects invalid shapes", () => {
  const units = parseContent({ version: 1, units: [{ id: "unit-1", title: "Unit 1", words: [word("run"), word("set", false)] }] });
  assert.equal(units[0].words[0].quiz?.answer, 2);
  assert.equal(units[0].words[1].quiz, null);
  const invalid = [
    { version: 2, units: [] },
    { version: 1, units: [{ id: "Bad Id", title: "x", words: [] }] },
    { version: 1, units: [{ id: "u", title: "x", words: [word("run"), word("run")] }] },
    { version: 1, units: [{ id: "u", title: "x", words: [{ ...word("run"), quiz: { sentences: ["a", "b", "c"], answer: 0 } }] }] },
    { version: 1, units: [{ id: "u", title: "x", words: [{ ...word("run"), quiz: { sentences: ["a", "b", "c", "d"], answer: 4 } }] }] },
    { version: 1, units: [{ id: "u", title: "x", words: [{ ...word("run"), meaning: 3 }] }] },
  ];
  for (const value of invalid) assert.throws(() => parseContent(value), ContentError);
});

test("summary and due words follow the account date", () => {
  const [unit] = parseContent({ version: 1, units: [{ id: "u", title: "U", words: [word("a"), word("b"), word("c"), word("d", false)] }] });
  const progress = {
    a: { stage: 1, due: "2026-11-05", lastResult: "PASS" as const, updatedAt: "" },
    b: { stage: 2, due: "2026-11-09", lastResult: "PASS" as const, updatedAt: "" },
    d: { stage: 0, due: "2026-11-01", lastResult: "FAIL" as const, updatedAt: "" },
  };
  assert.deepEqual(summarizeUnit(unit, progress, "2026-11-05"), { total: 4, started: 3, due: 2 });
  // d has no quiz, so it cannot be reviewed
  assert.deepEqual(dueWords([unit], progress, "2026-11-05").map((w) => w.id), ["a"]);
  assert.deepEqual(quizWords(unit.words).map((w) => w.id), ["a", "b", "c"]);
});

test("grading compares the original sentence index", () => {
  const [unit] = parseContent({ version: 1, units: [{ id: "u", title: "U", words: [word("a")] }] });
  assert.equal(grade(unit.words[0], 2), "PASS");
  assert.equal(grade(unit.words[0], 0), "FAIL");
});

test("sentence order is a permutation", () => {
  assert.deepEqual([...sentenceOrder(() => 0.99)].sort(), [0, 1, 2, 3]);
  assert.deepEqual(sentenceOrder(() => 0), [1, 2, 3, 0]);
});

import { isDesktopLayout } from "../src/responsive.ts";

test("responsive layout excludes landscape phones but admits wide tablets and desktop windows", () => {
  for (const [width, height, expected] of [
    [390, 844, false], [915, 412, false], [1280, 450, false],
    [800, 1280, false], [1280, 800, true], [1440, 900, true],
    [1023, 800, false], [1024, 599, false], [1024, 600, true],
    [700, 800, false],
  ] as const) assert.equal(isDesktopLayout(width, height), expected, `${width}x${height}`);
  assert.equal(isDesktopLayout(1440, 900, "phone"), false);
  assert.equal(isDesktopLayout(390, 844, "pc"), true);
});

test("dashboard rows map units with due reviews, the next new unit, stage buckets and recent dates", () => {
  const units = parseContent({ version: 1, units: [
    { id: "u1", title: "Unit A", words: [word("a"), word("b")] },
    { id: "u2", title: "Unit B", words: [word("c"), word("d")] },
    { id: "u3", title: "Unit C", words: [word("e")] },
  ] });
  const progress = {
    a: { stage: 6, due: "2026-12-01", lastResult: "PASS" as const, updatedAt: "2026-11-07T01:00:00Z" },
    b: { stage: 0, due: "2026-11-09", lastResult: "FAIL" as const, updatedAt: "2026-11-08T01:00:00Z" },
    c: { stage: 2, due: "2026-11-10", lastResult: "PASS" as const, updatedAt: "2026-11-05T01:00:00Z" },
  };
  const rows = buildUnitRows(units, progress, "2026-11-09");
  assert.deepEqual(rows.map((row) => [row.started, row.dueWords.map((w) => w.id), row.failCount, row.lastDate]), [
    [2, ["b"], 1, "2026-11-08"], [1, [], 0, "2026-11-05"], [0, [], 0, ""],
  ]);
  assert.equal(rows[0].passRatio, 0.5);
  const queue = buildQueue(rows, progress, remainingNewWords(progress, "2026-11-09"));
  assert.deepEqual(queue.reviews.map((row) => row.unit.id), ["u1"]);
  assert.deepEqual(queue.learning.map(({ row, words }) => [row.unit.id, words.map(word => word.id)]), [["u2", ["d"]], ["u3", ["e"]]]);
  const startedToday = Object.fromEntries(Array.from({ length: 4 }, (_, index) =>
    [`other-book-${index}`, { ...progress.a, firstStudiedOn: "2026-11-09" }]));
  const remaining = remainingNewWords({ ...progress, ...startedToday }, "2026-11-09");
  assert.equal(remaining, 1);
  assert.deepEqual(buildQueue(rows, progress, remaining).learning.flatMap(item => item.words.map(word => word.id)), ["d"]);
  const finished = buildQueue(rows, progress, 0);
  assert.deepEqual(finished.learning, []);
  assert.deepEqual(finished.reviews.map(row => row.unit.id), ["u1"]);
  assert.equal(remainingNewWords(startedToday, "2026-11-10"), 5);
  assert.deepEqual(stageBuckets(units, progress).map((bucket) => bucket.count), [3, 0, 1, 0, 0, 0, 1]);
  assert.deepEqual(["2026-11-09", "2026-11-08", "2026-11-01"].map((date) => relativeDay(date, "2026-11-09")), ["오늘", "어제", "8일 전"]);
  const sameDayRows = buildUnitRows(units, {
    a: { stage: 1, due: "2026-11-10", lastResult: "PASS", updatedAt: "2026-11-09T01:00:00Z" },
    c: { stage: 1, due: "2026-11-10", lastResult: "PASS", updatedAt: "2026-11-09T02:00:00Z" },
  }, "2026-11-09");
  assert.deepEqual(recentUnits(sameDayRows).map((row) => row.unit.id), ["u2", "u1"]);
});


test("without server tokens no prose word is selectable", () => {
  assert.deepEqual(proseTokens({ body: "A window." }), [{ text: "A window.", word: false }]);
  const tokens = [{ text: "A ", word: false }, { text: "window", word: true }, { text: ".", word: false }];
  assert.equal(proseTokens({ body: "A window.", tokens }), tokens);
});


test("provided examples prefer decomposition and retain the legacy example fallback", () => {
  const word = { id: "decomposition-word", word: "window", meaning: "창문", example: "old", decomposition: "provided example", quiz: null };
  const parsed = parseContent({ version: 1, units: [{ id: "examples", title: "Examples", words: [word] }] })[0].words[0];
  assert.equal(parsed.decomposition, "provided example");
  assert.equal(parsed.example, "provided example");
  const { decomposition, ...legacy } = word;
  assert.equal(parseContent({ version: 1, units: [{ id: "legacy-examples", title: "Examples", words: [legacy] }] })[0].words[0].decomposition, "old");
});


test("etymological root groups span materials and do not duplicate spellings", () => {
  const rootWord = (id: string, word: string, roots: string[]) => ({ id, word, roots, meaning: "meaning", example: "example", quiz: null });
  const groups = groupWordsByRoot([rootWord("a", "inspect", ["spect"]), rootWord("b", "spectator", ["spect", "test"]), rootWord("c", "INSPECT", ["spect"]), rootWord("d", "unknown", [])]);
  assert.deepEqual([...groups.keys()], ["spect", "test"]);
  assert.deepEqual(groups.get("spect")!.map(word => word.word), ["inspect", "spectator"]);
  assert.equal(groups.get("test")!.length, 1);
});

test("import prompt requests varied unseen pools and includes replenishment history without personal notes", () => {
  const prompt = buildEnglishImportPrompt({ id: "b", title: "Words", kind: "vocabulary", body: "", words: [{ id: "a", word: "inspect", meaning: "inspect meaning", example: "Study sentence.", roots: ["spect"], quiz: null }] }, { inspect: ["Used sentence."] });
  for (const expected of ["jace-s.english-words", "decomposition", "roots", "quizzes", "8세트", "최대 5단어씩", "```json", "응답 마지막 줄", "‘다음’", '\\"FYI\\"', "\\n", "JSON.parse", "인터넷", "Study sentence.", "Used sentence.", "절대 생성하지"]) assert.ok(prompt.includes(expected), expected);
});

test("splitWordsIntoDays groups vocabulary words into 5-word Day units without changing word IDs", () => {
  assert.equal(WORDS_PER_DAY, 5);
  assert.deepEqual(splitWordsIntoDays("vocab-1", []), []);
  const all = Array.from({ length: 12 }, (_, index) => parseContent({ version: 1, units: [{ id: "u", title: "U", words: [word(`w-${index + 1}`)] }] })[0].words[0]);
  const days = splitWordsIntoDays("vocab-1", all);
  assert.deepEqual(days.map(day => [day.id, day.title, day.words.map(entry => entry.id)]), [
    ["vocab-1-day-1", "Day 1", ["w-1", "w-2", "w-3", "w-4", "w-5"]],
    ["vocab-1-day-2", "Day 2", ["w-6", "w-7", "w-8", "w-9", "w-10"]],
    ["vocab-1-day-3", "Day 3", ["w-11", "w-12"]],
  ]);
  const rows = buildUnitRows(days, {}, "2026-11-20");
  const queue = buildQueue(rows, {}, remainingNewWords({}, "2026-11-20"));
  assert.deepEqual(queue.learning.map(({ row, words }) => [row.unit.title, words.length]), [["Day 1", 5]]);
});
