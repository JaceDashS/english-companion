import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bookImportPrompt,
  importBookFromClipboard,
  importBookJson,
  importWordsFromClipboard,
  importWordsJson,
  parseBookImport,
} from "../src/bookImport";

test("book JSON needs a title and body and may be fenced", () => {
  assert.deepEqual(parseBookImport('```json\n{"format":"jace-s.reading-book","version":1,"title":" 海辺 ","body":" 本文 "}\n```'), { title: "海辺", body: "本文" });
  assert.throws(() => parseBookImport("not json"), /JSON/);
  assert.throws(() => parseBookImport('{"title":"","body":"x"}'), /title/);
  assert.throws(() => parseBookImport('{"title":"x","body":""}'), /body/);
});

test("the prompt asks for the same title on later pages", () => {
  assert.match(bookImportPrompt("ja"), /같은 책의 다음 페이지/);
  assert.match(bookImportPrompt("en"), /영어/);
});

test("one-click book clipboard import creates on first batch, appends consecutive same-title batches, and respects targetId", async () => {
  const store: Array<{ id: string; title: string; body: string }> = [];
  const deps = {
    books: store,
    targetId: null as string | null,
    saveBook: async (title: string, body: string) => {
      const book = { id: `b${store.length + 1}`, title, body };
      store.push(book);
      return book;
    },
    appendBook: async (id: string, body: string) => {
      const target = store.find((entry) => entry.id === id)!;
      target.body = `${target.body}\n\n${body}`;
      return { ...target };
    },
  };

  const first = await importBookFromClipboard(
    async () => '{"title":"The Harbor Window","body":"Page one"}',
    "",
    deps,
  );
  assert.equal(first.ok, true);
  if (first.ok) {
    assert.equal(first.mode, "created");
    assert.match(first.status, /The Harbor Window/);
  }

  const second = await importBookFromClipboard(
    async () => '{"title":"The Harbor Window","body":"Page two"}',
    "",
    deps,
  );
  assert.equal(second.ok, true);
  if (second.ok) {
    assert.equal(second.mode, "appended");
    assert.equal(second.book.id, "b1");
    assert.equal(second.book.body, "Page one\n\nPage two");
  }

  const targeted = await importBookFromClipboard(
    async () => '{"title":"Ignored Title","body":"Page three"}',
    "",
    { ...deps, targetId: "b1" },
  );
  assert.equal(targeted.ok, true);
  if (targeted.ok) {
    assert.equal(targeted.mode, "appended");
    assert.equal(targeted.book.id, "b1");
    assert.equal(store.length, 1);
  }
});

test("book clipboard import handles empty/unreadable clipboard and opens manual input on parse/save error", async () => {
  const deps = {
    books: [],
    targetId: null,
    saveBook: async () => ({ id: "b1", title: "Window" }),
    appendBook: async () => ({ id: "b1", title: "Window" }),
  };

  const empty = await importBookFromClipboard(async () => "  ", "existing", deps);
  assert.equal(empty.ok, false);
  if (!empty.ok) {
    assert.equal(empty.openManual, false);
    assert.equal(empty.text, "existing");
  }

  const err = await importBookFromClipboard(async () => { throw new Error("clipboard denied"); }, "existing", deps);
  assert.equal(err.ok, false);
  if (!err.ok) {
    assert.equal(err.error, "clipboard denied");
    assert.equal(err.openManual, false);
    assert.equal(err.text, "existing");
  }

  const badJson = await importBookFromClipboard(async () => "{bad", "", deps);
  assert.equal(badJson.ok, false);
  if (!badJson.ok) {
    assert.equal(badJson.openManual, true);
    assert.equal(badJson.text, "{bad");
  }

  const retry = await importBookJson('{"title":"Window","body":"Text"}', deps);
  assert.equal(retry.ok, true);
});

test("word clipboard import tracks created bookId across consecutive batches and falls back to manual on failure", async () => {
  let targetBookId = "";
  const calls: Array<{ bookId: string; payload: string }> = [];
  const runImport = async (payload: string) => {
    const parsed = JSON.parse(payload) as { words?: string[] };
    if (!parsed.words?.length) throw new Error("단어가 필요합니다.");
    const usedId = targetBookId || "v-new";
    targetBookId = usedId;
    calls.push({ bookId: usedId, payload });
    return { bookId: usedId, added: parsed.words.length, updated: 0, setsAdded: parsed.words.length * 8 };
  };

  const batch1 = await importWordsFromClipboard(async () => '{"words":["inspect"]}', "", runImport);
  assert.equal(batch1.ok, true);
  const batch2 = await importWordsFromClipboard(async () => '{"words":["respect"]}', "", runImport);
  assert.equal(batch2.ok, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].bookId, "v-new");
  assert.equal(calls[1].bookId, "v-new");

  const empty = await importWordsFromClipboard(async () => "", "keep", runImport);
  assert.equal(empty.ok, false);
  if (!empty.ok) {
    assert.equal(empty.openManual, false);
    assert.equal(empty.text, "keep");
  }

  const failed = await importWordsJson('{"words":[]}', runImport);
  assert.equal(failed.ok, false);
  if (!failed.ok) {
    assert.equal(failed.openManual, true);
    assert.equal(failed.text, '{"words":[]}');
  }
});
