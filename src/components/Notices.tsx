import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { API_ORIGIN, NOTICE_APP_ID } from "../config";
import { colors } from "../ui";

interface Notice {
  id: string;
  title: string;
}

const OUTAGE: Notice = { id: "outage", title: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." };

/** Reads `/notices` (answered even during outages) and `/health` once, then shows dismissible notice titles. */
export async function loadNotices(send: typeof fetch = fetch): Promise<Notice[]> {
  const request = (path: string) => send(API_ORIGIN + path, { credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(10000) });
  const [up, list] = await Promise.all([
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
  return up || list.length ? list : [OUTAGE];
}

export function Notices() {
  const [notices, setNotices] = useState<Notice[]>([]);
  useEffect(() => {
    let active = true;
    loadNotices().then((list) => active && setNotices(list), () => undefined);
    return () => {
      active = false;
    };
  }, []);
  if (!notices.length) return null;
  // Several notices share one toast, one line each, instead of stacking separate toasts
  return (
    <View accessibilityLabel="서비스 공지" style={{ gap: 8 }}>
      <View
        accessibilityRole="alert"
        style={{ flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 12, borderRadius: 10, backgroundColor: colors.surfaceRaised, borderColor: colors.accent, borderWidth: 1 }}
      >
        <View style={{ flex: 1, gap: 6 }}>
          {notices.length === 1 ? (
            <Text style={{ color: colors.text, fontWeight: "600" }}>{notices[0].title}</Text>
          ) : (
            notices.map((notice) => (
              <View key={notice.id} style={{ flexDirection: "row", gap: 6 }}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>·</Text>
                <Text style={{ flex: 1, color: colors.text, fontWeight: "600" }}>{notice.title}</Text>
              </View>
            ))
          )}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="공지 닫기" onPress={() => setNotices([])}>
          <Text style={{ color: colors.text, fontSize: 18, lineHeight: 20 }}>×</Text>
        </Pressable>
      </View>
    </View>
  );
}
