import assert from "node:assert/strict";
import test from "node:test";
import { accountDate, EnglishClient } from "../src/api/client.ts";
import { apiUrl } from "../src/api/http.ts";
import { createNativeTransport } from "../src/api/transport.ts";
import { createBrowserTransport } from "../src/api/transport.web.ts";
import { ApiError } from "../src/api/types.ts";

type Call = { url: string; init: RequestInit };

function fakeFetch(responses: Array<{ status?: number; body?: unknown; cookies?: string[] }>, calls: Call[]): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = responses.shift() ?? { body: {} };
    const headers = new Headers();
    for (const cookie of next.cookies ?? []) headers.append("set-cookie", cookie);
    return new Response(JSON.stringify(next.body ?? {}), { status: next.status ?? 200, headers });
  }) as typeof fetch;
}

function memoryStore(initial: string | null = null) {
  let value = initial;
  return { read: async () => value, write: async (next: string | null) => void (value = next), get value() { return value; } };
}

test("API paths must stay on the configured origin", () => {
  assert.equal(apiUrl("https://api.jace-s.com", "/auth/session"), "https://api.jace-s.com/auth/session");
  for (const bad of ["https://evil.test/x", "//evil.test", "/../x", "auth/session"]) assert.throws(() => apiUrl("https://api.jace-s.com", bad));
});

test("native transport stores session cookies and sends csrf only on writes", async () => {
  const calls: Call[] = [];
  const store = memoryStore();
  const transport = createNativeTransport(
    "https://api.jace-s.com",
    store,
    fakeFetch([{ body: { user: { id: "u1", username: "a" } }, cookies: ["session=s%201; Path=/; HttpOnly", "csrf=c1; Path=/"] }, { body: { progress: {} } }, { body: { progress: {} } }], calls),
  );
  assert.equal(await transport.hasCredentials(), false);
  await transport.send("/auth/login", { username: "a", password: "p" });
  assert.deepEqual(JSON.parse(store.value!), { session: "s 1", csrf: "c1" });
  await transport.send("/companions/english/progress");
  const read = calls[1].init.headers as Record<string, string>;
  assert.equal(read.Cookie, "session=s%201; csrf=c1");
  assert.equal(read["x-csrf-token"], undefined);
  await transport.send("/companions/english/save-results", { results: [] }, "u1");
  const write = calls[2].init.headers as Record<string, string>;
  assert.equal(write["x-csrf-token"], "c1");
  assert.equal(write["x-companion-user"], "u1");
  assert.equal(calls[2].init.credentials, "omit");
  await transport.forget();
  assert.equal(store.value, null);
});

test("native transport discards corrupted stored credentials", async () => {
  const store = memoryStore("{broken");
  const transport = createNativeTransport("https://api.jace-s.com", store, fakeFetch([], []));
  assert.equal(await transport.hasCredentials(), false);
  assert.equal(store.value, null);
});

test("browser transport uses cookies and the csrf token from response bodies", async () => {
  const calls: Call[] = [];
  const transport = createBrowserTransport("https://api.jace-s.com", fakeFetch([{ body: { user: { id: "u1" }, csrfToken: "t1" } }, { body: { ok: true } }], calls));
  await transport.send("/auth/session");
  await transport.send("/companions/english/save-results", { results: [] }, "u1");
  assert.equal(calls[0].init.credentials, "include");
  assert.equal((calls[1].init.headers as Record<string, string>)["x-csrf-token"], "t1");
});

test("client clears the session on 401 and binds writes to the signed-in account", async () => {
  const calls: Call[] = [];
  const store = memoryStore(JSON.stringify({ session: "s", csrf: "c" }));
  const client = new EnglishClient(
    createNativeTransport(
      "https://api.jace-s.com",
      store,
      fakeFetch(
        [
          { body: { user: { id: "u1", username: "a" } } },
          { body: { canUse: true, mustChangePassword: false } },
          { body: { serverNow: "2026-11-05T00:00:00Z", timeZone: "Asia/Seoul", today: "2026-11-05" } },
          { body: { ok: true, progress: { run: { stage: 1 } } } },
          { status: 401, body: { error: "UNAUTHENTICATED" } },
        ],
        calls,
      ),
    ),
  );
  assert.equal((await client.restore())?.id, "u1");
  assert.equal((await client.bootstrap()).today, "2026-11-05");
  await client.saveResults([{ id: "run", result: "PASS" }]);
  assert.equal((calls[3].init.headers as Record<string, string>)["x-companion-user"], "u1");
  await assert.rejects(client.progress(), (error: unknown) => error instanceof ApiError && error.status === 401);
  assert.equal(store.value, null);
  assert.equal(client.currentUser, null);
});

test("bootstrap refuses accounts without app permission", async () => {
  const client = new EnglishClient(createBrowserTransport("https://api.jace-s.com", fakeFetch([{ body: { canUse: false, mustChangePassword: false } }], [])));
  await assert.rejects(client.bootstrap(), (error: unknown) => error instanceof ApiError && error.code === "APP_ACCESS_DENIED");
});

test("account date follows the server clock and account zone", () => {
  assert.equal(accountDate({ serverNow: "2026-11-04T14:59:00Z", timeZone: "Asia/Seoul", today: "" }, 0), "2026-11-04");
  assert.equal(accountDate({ serverNow: "2026-11-04T14:59:00Z", timeZone: "Asia/Seoul", today: "" }, 60_000), "2026-11-05");
});

test("account reads session details and treats a missing password flag as a password account", async () => {
  const calls: Call[] = [];
  const store = memoryStore(JSON.stringify({ session: "s", csrf: "c" }));
  const client = new EnglishClient(
    createNativeTransport(
      "https://api.jace-s.com",
      store,
      fakeFetch(
        [
          { body: { user: { id: "u1", username: "a", email: "a@example.com", emailVerified: true }, hasLocalPassword: false } },
          { body: { user: { id: "u1", username: "a" } } },
          { status: 401, body: { error: "UNAUTHENTICATED" } },
        ],
        calls,
      ),
    ),
  );
  const google = await client.account();
  assert.equal(google.hasLocalPassword, false);
  assert.equal(google.user.email, "a@example.com");
  assert.equal(calls[0].url, "https://api.jace-s.com/auth/session");
  assert.equal((await client.account()).hasLocalPassword, true);
  await assert.rejects(client.account(), (error: unknown) => error instanceof ApiError && error.status === 401);
  assert.equal(client.currentUser, null);
  assert.equal(store.value, null);
});

import { signInWithNativeGoogle } from "../src/components/nativeGoogleFlow";

test("native Google challenge and token exchange retain the encrypted account session", async () => {
  const calls: Call[] = [];
  const store = memoryStore();
  const client = new EnglishClient(createNativeTransport("https://api.jace-s.com", store, fakeFetch([
    { body: { nonce: "a".repeat(64) } },
    { body: { user: { id: "native-user", username: "native" } }, cookies: ["session=native-google", "csrf=native-csrf"] },
    { body: {} },
  ], calls)));
  const nonce = await client.nativeGoogleChallenge();
  assert.equal((await client.nativeGoogleLogin("synthetic-token", nonce, false)).id, "native-user");
  assert.equal(calls[0].url, "https://api.jace-s.com/auth/google/native/challenge");
  assert.equal(calls[1].url, "https://api.jace-s.com/auth/google/native");
  assert.equal(JSON.parse(String(calls[1].init.body)).nonce, nonce);
  assert.equal(JSON.parse(String(calls[1].init.body)).remember, false);
  assert.equal(JSON.parse(store.value!).session, "native-google");
  await client.logout();
  assert.equal((calls[2].init.headers as Record<string, string>)["x-csrf-token"], "native-csrf");
});

test("native Google cancellation and stale callbacks never exchange a credential; retry uses a new nonce", async () => {
  const attempts: any[] = [];
  let nonce = 0;
  let selected: string | null = null;
  let active = true;
  const client = {
    googleConfig: async () => ({ enabled: true, clientId: "public-web-client" }),
    nativeGoogleChallenge: async () => String(++nonce).padStart(64, "0"),
    nativeGoogleLogin: async (...args: any[]) => { attempts.push(args); return { id: "google-user" }; },
  };
  const configurations: any[] = [];
  const provider = {
    checkPlayServices: async () => true,
    configure: (value: any) => { configurations.push(value); },
    pickAccount: async () => selected,
  };
  assert.equal(await signInWithNativeGoogle(client, provider, true), null);
  assert.equal(attempts.length, 0);
  selected = "synthetic-id-token";
  assert.deepEqual(await signInWithNativeGoogle(client, provider, false), { id: "google-user" });
  assert.equal(attempts[0][1], "2".padStart(64, "0"));
  assert.equal(attempts[0][2], false);
  assert.notEqual(configurations[0].nonce, configurations[1].nonce);
  assert.equal(configurations[1].autoSelectOnSignIn, false);
  provider.pickAccount = async () => { active = false; return "late-token"; };
  assert.equal(await signInWithNativeGoogle(client, provider, true, () => active), null);
  assert.equal(attempts.length, 1);
});

test("disabled native Google configuration never invokes the picker or issues a challenge", async () => {
  const forbidden = async () => { throw new Error("must not run"); };
  await assert.rejects(signInWithNativeGoogle({ googleConfig: async () => ({ enabled: false, clientId: null }),
    nativeGoogleChallenge: forbidden, nativeGoogleLogin: forbidden },
    { checkPlayServices: forbidden, configure: () => { throw Error("must not configure"); }, pickAccount: forbidden }, true), /GOOGLE_NOT_CONFIGURED/);
});


test("reading requests bind notes to the enqueued account and reject writes after logout", async () => {
  const calls: Call[] = [];
  const client = new EnglishClient(createBrowserTransport("https://api.jace-s.com", fakeFetch([
    { body: { user: { id: "reader-a", username: "a" }, csrfToken: "csrf" } },
    { body: { ok: true, detail: null } },
    { body: { ok: true } },
    { body: {} },
  ], calls)));
  await client.restore();
  await client.libraryRequest("word", undefined, { word: "a b" });
  assert.equal(calls[1].url, "https://api.jace-s.com/companions/english/word?word=a+b");
  await client.libraryRequest("word-note", { word: "window", note: "one" });
  assert.equal((calls[2].init.headers as Record<string, string>)["x-companion-user"], "reader-a");
  const loggingOut = client.logout();
  const stale = client.libraryRequest("word-note", { word: "window", note: "stale" });
  await loggingOut;
  await assert.rejects(stale, (error: unknown) => error instanceof ApiError && error.status === 401);
  assert.equal(calls.length, 4);
  await assert.rejects(client.libraryRequest("../auth"));
});
