import { APP_KEY } from "../config";
import { ApiError, type Account, type Clock, type Progress, type StudyResult, type Transport, type User } from "./types";

/** Account and progress API used by every screen. Requests run one at a time so session updates never race. */
export class EnglishClient {
  private tail: Promise<unknown> = Promise.resolve();
  private user: User | null = null;

  constructor(private transport: Transport) {}

  private serialize<T>(work: () => Promise<T>): Promise<T> {
    const result = this.tail.then(work, work);
    this.tail = result.catch(() => undefined);
    return result;
  }

  private async call<T>(path: string, body?: unknown, account?: string): Promise<T> {
    try {
      return await this.transport.send<T>(path, body, account);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        this.user = null;
        await this.transport.forget();
      }
      throw error;
    }
  }

  get currentUser(): User | null {
    return this.user;
  }

  /** Returns the signed-in user, or null when there is no valid session. */
  restore(): Promise<User | null> {
    return this.serialize(async () => {
      if (!(await this.transport.hasCredentials())) return null;
      try {
        this.user = (await this.call<{ user: User }>("/auth/session")).user;
        return this.user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    });
  }

  /** Reads the signed-in account for the account screen. A 401 clears the stored session like any other call. */
  account(): Promise<Account> {
    return this.serialize(async () => {
      const body = await this.call<{ user: User; hasLocalPassword?: boolean }>("/auth/session");
      this.user = body.user;
      return { user: body.user, hasLocalPassword: body.hasLocalPassword !== false };
    });
  }

  /** Password login through the existing account API. The password is never stored. */
  login(username: string, password: string, remember: boolean): Promise<User> {
    return this.serialize(async () => {
      await this.transport.forget();
      this.user = (await this.call<{ user: User }>("/auth/login", { username: username.trim(), password, remember })).user;
      return this.user;
    });
  }

  /** Public Google configuration for the browser button. */
  googleConfig(): Promise<{ enabled: boolean; clientId: string | null }> {
    return this.serialize(() => this.call("/auth/google/config"));
  }

  /** One-use nonce bound to the next Google credential. */
  googleChallenge(): Promise<string> {
    return this.serialize(async () => (await this.call<{ nonce: string }>("/auth/google/challenge", {})).nonce);
  }

  /** Exchanges a Google ID token (web only) for the existing account session. */
  googleLogin(credential: string, remember: boolean): Promise<User> {
    return this.serialize(async () => {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      this.user = (await this.call<{ user: User }>("/auth/google", { credential, remember, timeZone })).user;
      return this.user;
    });
  }

  /** Revokes the server session. A failure stays retryable instead of pretending the user signed out. */
  logout(): Promise<void> {
    return this.serialize(async () => {
      await this.call("/auth/logout", {});
      this.user = null;
      await this.transport.forget();
    });
  }

  /** Confirms app permission and returns the account calendar clock. */
  bootstrap(): Promise<Clock> {
    return this.serialize(async () => {
      const access = await this.call<{ canUse: boolean; mustChangePassword: boolean }>("/app-access/" + APP_KEY);
      if (access.mustChangePassword) throw new ApiError(403, "PASSWORD_CHANGE_REQUIRED");
      if (!access.canUse) throw new ApiError(403, "APP_ACCESS_DENIED");
      return this.call<Clock>("/auth/clock");
    });
  }

  /** The account's review state per word ID. */
  progress(): Promise<Progress> {
    return this.serialize(async () => (await this.call<{ progress: Progress }>("/companions/english/progress")).progress);
  }

  /** Saves graded words once; a network failure needs an explicit user retry. Returns the updated entries. */
  saveResults(results: { id: string; result: StudyResult }[]): Promise<Progress> {
    return this.serialize(async () => {
      if (!this.user) throw new ApiError(401, "UNAUTHENTICATED");
      return (await this.call<{ progress: Progress }>("/companions/english/save-results", { results }, this.user.id)).progress;
    });
  }
}

/** Projects the server time forward with elapsed monotonic time in the account time zone. */
export function accountDate(clock: Clock, elapsedMs: number): string {
  const epoch = Date.parse(clock.serverNow);
  if (!Number.isFinite(epoch)) throw new Error("Invalid server clock");
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: clock.timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date(epoch + Math.max(0, elapsedMs)));
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return part("year") + "-" + part("month") + "-" + part("day");
}
