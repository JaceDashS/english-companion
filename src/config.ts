/** Build-time settings. Expo inlines EXPO_PUBLIC_* values into the web and native bundles. */
const trim = (value: string | undefined, fallback: string) => (value?.trim() || fallback).replace(/\/+$/, "");

export const APP_KEY = "english";
/** Login, data, health and notice API origin. The session cookie lives only on this origin. */
export const API_ORIGIN = trim(process.env.EXPO_PUBLIC_EC_API_ORIGIN, "https://api.jace-s.com");
/** Main site used for the "main page" link. */
export const SITE_ORIGIN = trim(process.env.EXPO_PUBLIC_EC_SITE_ORIGIN, "https://jace-s.com");
/** Registered platform app ID for app-specific notices; empty means shared notices only. */
export const NOTICE_APP_ID = Number(process.env.EXPO_PUBLIC_EC_NOTICE_APP_ID) || null;
