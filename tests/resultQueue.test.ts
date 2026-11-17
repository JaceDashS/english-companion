import assert from "node:assert/strict";
import test from "node:test";
import { ResultQueue, optimisticResults } from "../src/domain/resultQueue.ts";
import { ApiError } from "../src/api/types.ts";

async function until(check: () => boolean) {
  for (let i = 0; i < 200 && !check(); i++) await new Promise(resolve => setTimeout(resolve, 2));
  assert.ok(check());
}
test("progress updates before delivery and retry keeps its durable operation ID and study date", async () => {
  let disk: string | null = null;
  let calls = 0;
  const ids: string[] = [];
  const times: number[] = [];
  const storage = { read: async () => disk, write: async (raw: string) => { disk = raw; } };
  const queue = new ResultQueue(storage, async job => {
    assert.equal(JSON.parse(disk!)[0].id, job.id);
    ids.push(job.id); times.push(Date.now()); calls++;
    if (calls < 3) throw new Error("Offline");
    return job.optimistic;
  }, 10);
  try {
    await queue.restore({});
    queue.enqueue([{ id: "word", result: "PASS" }], "2026-11-16");
    assert.equal(calls, 0);
    assert.equal(queue.getSnapshot().progress.word.stage, 1);
    assert.equal(queue.getSnapshot().progress.word.due, "2026-11-17");
    await until(() => calls === 3 && queue.getSnapshot().items.length === 0);
    assert.equal(new Set(ids).size, 1);
    assert.ok(times[1] - times[0] >= 9);
    assert.ok(times[2] - times[1] >= 19);
    assert.equal(queue.getSnapshot().progress.word.stage, 1);
  } finally { queue.pause(); }
});
test("persisted pending results survive reload and permanent rejection stays visible", async () => {
  let disk: string | null = null;
  const storage = { read: async () => disk, write: async (raw: string) => { disk = raw; } };
  const first = new ResultQueue(storage, async () => { throw new Error("Offline"); }, 60000);
  await first.restore({});
  first.enqueue([{ id: "word", result: "FAIL" }], "2026-11-16");
  await until(() => first.getSnapshot().items[0]?.status === "retrying");
  first.pause();
  await new Promise(resolve => setTimeout(resolve, 0));
  const restored = new ResultQueue(storage, async () => { throw new ApiError(403, "DENIED"); });
  try {
    await restored.restore({});
    assert.equal(restored.getSnapshot().progress.word.lastResult, "FAIL");
    restored.retry(restored.getSnapshot().items[0].id);
    await until(() => restored.getSnapshot().items[0]?.status === "failed");
    assert.equal(restored.getSnapshot().items[0].error, "DENIED");
  } finally { restored.pause(); }
});
test("optimistic failure lowers one stage with a zero floor and is due tomorrow", () => {
  const prior = { word: { stage: 4, due: "2026-11-20", lastResult: "PASS" as const, updatedAt: "" } };
  const failed = optimisticResults(prior, [{ id: "word", result: "FAIL" }], "2026-11-30");
  assert.equal(failed.word.stage, 3);
  assert.equal(failed.word.due, "2026-12-01");
  assert.equal(failed.word.updatedAt.slice(0, 10), "2026-11-30");
  assert.equal(optimisticResults({}, [{ id: "word", result: "FAIL" }], "2026-11-30").word.due, "2026-12-01");
});
