import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { API_ORIGIN, NOTICE_APP_ID } from "../config";
import { colors } from "../ui";
import { resolveNoticeToast, type Notice } from "./noticeToast";

/** Reads `/health` and `/notices` (answered even during outages) once, in parallel. */
export async function loadNotices(send: typeof fetch = fetch): Promise<{ up: boolean; notices: Notice[] }> {
  const request = (path: string) => send(API_ORIGIN + path, { credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(10000) });
  const [up, notices] = await Promise.all([
    request("/health").then((response) => response.ok, () => false),
    request(NOTICE_APP_ID ? `/notices?app=${NOTICE_APP_ID}` : "/notices")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { schemaVersion?: number; announcements?: Notice[] } | null) =>
        body?.schemaVersion === 1 && Array.isArray(body.announcements)
          ? body.announcements.filter((n) => n && typeof n.id === "string" && typeof n.title === "string").map(({ id, title }) => ({ id, title }))
          : [],
      )
      .catch(() => [] as Notice[]),
  ]);
  return { up, notices };
}

/** One toast for every notice, closing after 8 seconds while reachable and staying until closed otherwise. */
export function Notices() {
  const [state, setState] = useState<{ up: boolean; notices: Notice[] } | null>(null);
  const [closed, setClosed] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    loadNotices().then((value) => active && setState(value), () => undefined);
    return () => {
      active = false;
    };
  }, []);
  const toast = state ? resolveNoticeToast(state.up, state.notices) : null;
  const close = useRef(() => setClosed(toast?.key ?? null));
  close.current = () => setClosed(toast?.key ?? null);
  const autoDismissMs = toast?.autoDismissMs ?? null;
  useEffect(() => {
    if (autoDismissMs === null) return undefined;
    const timer = setTimeout(() => close.current(), autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, toast?.key]);
  if (!toast || closed === toast.key) return null;
  // Several notices share one toast, one line each, instead of stacking separate toasts
  return (
    <View accessibilityLabel="서비스 공지" style={{ gap: 8 }}>
      <View
        accessibilityRole={toast.kind === "outage" ? "alert" : "summary"}
        style={{ flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 12, borderRadius: 10, backgroundColor: colors.surfaceRaised, borderColor: colors.accent, borderWidth: 1 }}
      >
        <View style={{ flex: 1, gap: 6 }}>
          {toast.lines.length === 1 ? (
            <Text style={{ color: colors.text, fontWeight: "600" }}>{toast.lines[0]}</Text>
          ) : (
            toast.lines.map((line, index) => (
              <View key={index} style={{ flexDirection: "row", gap: 6 }}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>·</Text>
                <Text style={{ flex: 1, color: colors.text, fontWeight: "600" }}>{line}</Text>
              </View>
            ))
          )}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="공지 닫기" onPress={() => close.current()}>
          <Text style={{ color: colors.text, fontSize: 18, lineHeight: 20 }}>×</Text>
        </Pressable>
      </View>
    </View>
  );
}
