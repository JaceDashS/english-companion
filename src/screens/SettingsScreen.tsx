import React, { useEffect, useState } from "react";
import { Linking, Platform, ScrollView, View } from "react-native";
import type { EnglishClient } from "../api/client";
import { ApiError, type Account } from "../api/types";
import { SITE_ORIGIN } from "../config";
import type { Display } from "../display";
import { Btn, Card, layout, Segment, T } from "../ui";

function formatTime(value: string | null | undefined) {
  if (!value) return "없음";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}
function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
    <View style={{ flexShrink: 1 }}><T size={13.8}>{title}</T>{hint ? <T size={12.2} tone="dim">{hint}</T> : null}</View>{children}
  </View>;
}

/**
 * Account card and display settings in the Japanese Companion layout. Profile and password changes stay on the main site.
 * On the web the session cookie is shared, so signing out here also signs out the other jace-s apps in this browser.
 */
export function SettingsScreen({ client, phone, busy, error, display, onDisplay, onLogout, onExpired }: {
  client: EnglishClient; phone: boolean; busy: boolean; error: string; display: Display; onDisplay: (next: Display) => void; onLogout: () => void; onExpired: () => void;
}) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    let active = true;
    client.account().then((next) => active && setAccount(next), (cause) => {
      if (!active) return;
      if (cause instanceof ApiError && cause.status === 401) onExpired(); else setLoadError(true);
    });
    return () => { active = false; };
  }, [client, onExpired]);
  const user = account?.user;
  const rows: Array<[string, string]> = user ? [
    ["이름", user.displayName || "없음"], ["아이디", user.username],
    ["이메일", user.email ? `${user.email} (${user.emailVerified ? "인증됨" : "인증 전"})` : "없음"],
    ["로그인 방식", account.hasLocalPassword ? "아이디·비밀번호" : "Google 전용"],
    ["가입일", formatTime(user.createdAt)], ["마지막 로그인", formatTime(user.lastLoginAt)],
  ] : [];
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={phone ? layout.phoneBody : layout.body}>
    <Card title="계정">
      <View testID="account-screen" style={{ gap: 6, marginBottom: 2 }}>
        {!user && <T size={13.1} tone="muted">{loadError ? "계정 정보를 불러오지 못했습니다." : "계정 정보를 불러오는 중…"}</T>}
        {rows.map(([name, value]) => <View key={name} style={{ flexDirection: "row", gap: 16 }}><T size={13.1} tone="muted" style={{ width: 84, lineHeight: 24 }}>{name}</T><T size={16} selectable style={{ flex: 1 }}>{value}</T></View>)}
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Btn title="메인 사이트에서 계정 관리" style={{ flex: 1 }} onPress={() => void Linking.openURL(SITE_ORIGIN + "/#my-page")} />
        <Btn variant="danger" title={busy ? "로그아웃 중…" : "로그아웃"} disabled={busy} style={{ flex: 1 }} onPress={onLogout} testID="account-logout" />
      </View>
      {Platform.OS === "web" && <T size={13.1} tone="muted">같은 브라우저의 다른 jace-s 앱과 메인 사이트도 함께 로그아웃됩니다.</T>}
      {!!error && <T size={13.1} tone="error">{error}</T>}
    </Card>
    <Card title="화면">
      <View style={{ gap: 14 }}>
        <Row title="레이아웃 모드" hint={`자동은 현재 ${phone ? "폰" : "PC"}으로 인식 중`}><Segment options={[{ key: "auto", label: "자동" }, { key: "phone", label: "폰" }, { key: "pc", label: "PC" }]} value={display.device} onChange={(device) => onDisplay({ ...display, device })} /></Row>
        <Row title="테마"><Segment options={[{ key: "dark", label: "다크 모드" }, { key: "light", label: "라이트 모드" }]} value={display.theme} onChange={(theme) => onDisplay({ ...display, theme })} /></Row>
      </View>
      <T size={12.2} tone="dim">화면 설정은 이 기기에만 저장됩니다.</T>
    </Card>
  </ScrollView>;
}
