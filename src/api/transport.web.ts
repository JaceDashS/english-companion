import { apiUrl, readResponse } from "./http";
import type { Transport } from "./types";

/**
 * Browser transport. The session cookie is set on the API origin and sent with `credentials: "include"`.
 * The page cannot read that origin's CSRF cookie, so it keeps the token returned in session and login responses.
 */
export function createBrowserTransport(origin: string, send: typeof fetch = (input, init) => fetch(input, init)): Transport {
  let csrf = "";
  return {
    async hasCredentials() {
      return true;
    },
    async forget() {
      csrf = "";
    },
    async send<T>(path: string, body?: unknown, account?: string): Promise<T> {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        if (csrf) headers["x-csrf-token"] = csrf;
      }
      if (account) headers["x-companion-user"] = account;
      const response = await send(apiUrl(origin, path), {
        method: body === undefined ? "GET" : "POST",
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: "include",
        cache: "no-store",
      });
      const payload = await readResponse<T>(response);
      const token = (payload as { csrfToken?: unknown } | null)?.csrfToken;
      if (typeof token === "string" && token) csrf = token;
      return payload;
    },
  };
}

export function createTransport(origin: string): Transport {
  return createBrowserTransport(origin);
}
