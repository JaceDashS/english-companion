import assert from "node:assert/strict";
import test from "node:test";
import { NOTICE_AUTO_DISMISS_MS, OUTAGE_MESSAGE, resolveNoticeToast } from "../src/components/noticeToast.ts";

test("several notices share one toast with one line each and close after 8 seconds while reachable", () => {
  const toast = resolveNoticeToast(true, [{ id: "a", title: "점검" }, { id: "b", title: "동기화 지연" }]);
  assert.deepEqual(toast, { key: "notice:a,b", lines: ["점검", "동기화 지연"], kind: "notice", autoDismissMs: NOTICE_AUTO_DISMISS_MS });
  assert.equal(NOTICE_AUTO_DISMISS_MS, 8000);
});

test("notices stay until closed while the API is unreachable and replace the outage text", () => {
  const toast = resolveNoticeToast(false, [{ id: "a", title: "점검" }]);
  assert.equal(toast?.autoDismissMs, null);
  assert.deepEqual(toast?.lines, ["점검"]);
});

test("unreachable without notices shows the fixed outage text until closed", () => {
  assert.deepEqual(resolveNoticeToast(false, []), { key: "outage", lines: [OUTAGE_MESSAGE], kind: "outage", autoDismissMs: null });
  assert.equal(OUTAGE_MESSAGE, "Unable to connect to the server.");
});

test("reachable without notices shows nothing", () => {
  assert.equal(resolveNoticeToast(true, []), null);
});
