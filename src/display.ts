import { Platform } from "react-native";

/** Theme and layout preference kept on this device only (D-0004: no server change). */
export type Display = { theme: "dark" | "light"; device: "auto" | "phone" | "pc" };
export const DEFAULT_DISPLAY: Display = { theme: "dark", device: "auto" };
const KEY = "ec-display-v1";

/** Accepts only known values so a damaged entry falls back to the defaults. */
export function parseDisplay(raw: string | null | undefined): Display {
  try {
    const value = JSON.parse(raw ?? "{}") as Partial<Display>;
    return { theme: value.theme === "light" ? "light" : "dark", device: value.device === "phone" || value.device === "pc" ? value.device : "auto" };
  } catch {
    return DEFAULT_DISPLAY;
  }
}

export async function readDisplay(): Promise<Display> {
  if (Platform.OS === "web") return parseDisplay(globalThis.localStorage?.getItem(KEY));
  const SecureStore = require("expo-secure-store") as typeof import("expo-secure-store");
  return parseDisplay(await SecureStore.getItemAsync(KEY));
}

export async function writeDisplay(display: Display): Promise<void> {
  const raw = JSON.stringify(display);
  if (Platform.OS === "web") { globalThis.localStorage?.setItem(KEY, raw); return; }
  const SecureStore = require("expo-secure-store") as typeof import("expo-secure-store");
  await SecureStore.setItemAsync(KEY, raw);
}
