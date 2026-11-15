import { Platform } from "react-native";
import type { ResultStorage } from "./domain/resultQueue";

/** Account IDs scope pending results; credentials are never copied into jobs. */
export function resultStorage(account: string): ResultStorage {
  const key = "ec-results-v1-" + account;
  if (Platform.OS === "web") return {
    read: async () => globalThis.localStorage.getItem(key),
    write: async value => globalThis.localStorage.setItem(key, value),
  };
  const store = require("expo-secure-store") as typeof import("expo-secure-store");
  return { read: () => store.getItemAsync(key), write: value => store.setItemAsync(key, value) };
}
