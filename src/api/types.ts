export interface User {
  id: string;
  username: string;
  mustChangePassword?: boolean;
  displayName?: string | null;
  email?: string | null;
  emailVerified?: boolean;
  createdAt?: string;
  lastLoginAt?: string | null;
}

/** Current session details shown on the account screen. `hasLocalPassword` is false for Google-only accounts. */
export interface Account {
  user: User;
  hasLocalPassword: boolean;
}

export interface Clock {
  serverNow: string;
  timeZone: string;
  today: string;
}

export type StudyResult = "PASS" | "FAIL";

export interface WordProgress {
  stage: number;
  due: string;
  lastResult: StudyResult;
  updatedAt: string;
}

export type Progress = Record<string, WordProgress>;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

/** Platform-specific HTTP layer. Web relies on browser cookies; native keeps the session in encrypted storage. */
export interface Transport {
  /** Sends a request to an API path such as `/auth/session`. `account` binds a write to the expected user. */
  send<T>(path: string, body?: unknown, account?: string): Promise<T>;
  /** Drops locally held credentials without contacting the server. */
  forget(): Promise<void>;
  /** Native: whether stored credentials exist. Web always returns true so the browser cookie is checked. */
  hasCredentials(): Promise<boolean>;
}
