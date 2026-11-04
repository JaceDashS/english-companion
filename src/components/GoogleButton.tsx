import type { EnglishClient } from "../api/client";
import type { User } from "../api/types";

export interface GoogleButtonProps {
  client: EnglishClient;
  remember: boolean;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onLoggedIn: (user: User) => Promise<void>;
}

/** Native apps sign in with the account password; the Google button exists only in the web build (GoogleButton.web.tsx). */
export function GoogleButton(_props: GoogleButtonProps) {
  return null;
}
