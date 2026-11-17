import { Platform } from "react-native";

/** Device-only values such as the reader page layout; study data lives on the server. */
export async function readAsync(key: string): Promise<string | null> {
  if (Platform.OS === "web") { try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; } }
  const SecureStore = require("expo-secure-store") as typeof import("expo-secure-store");
  return SecureStore.getItemAsync(key);
}

export async function write(key: string, value: string | null): Promise<void> {
  if (Platform.OS === "web") { try { if (value === null) globalThis.localStorage?.removeItem(key); else globalThis.localStorage?.setItem(key, value); } catch { /* private mode */ } return; }
  const SecureStore = require("expo-secure-store") as typeof import("expo-secure-store");
  if (value === null) await SecureStore.deleteItemAsync(key); else await SecureStore.setItemAsync(key, value);
}
