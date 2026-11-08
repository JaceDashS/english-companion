import assert from "node:assert/strict";
import test from "node:test";
import { ContentError, parseContent } from "../src/content/content.ts";
import raw from "../src/content/words.json" with { type: "json" };
import { dueWords, grade, quizWords, sentenceOrder, summarizeUnit } from "../src/domain/study.ts";

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
