import React, { useEffect, useState } from "react";
import { Linking, Text, View } from "react-native";
import type { EnglishClient } from "../api/client";
import { ApiError, type Account } from "../api/types";
import { SITE_ORIGIN } from "../config";
import { Button, styles } from "../ui";

function formatTime(value: string | null | undefined) {
  if (!value) return "없음";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ko-KR");
}

/**
 * Signed-in account details and sign out. Name, email and password changes stay on the main site's My Page.
 * On the web the session cookie is shared, so signing out here also signs out the other jace-s apps in this browser.
 */
export function AccountScreen({
  client,
  busy,
  error,
  onBack,
  onLogout,
  onExpired,
}: {
  client: EnglishClient;
  busy: boolean;
  error: string;
  onBack: () => void;
  onLogout: () => void;
  onExpired: () => void;
}) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    client.account().then(
      (next) => active && setAccount(next),
      (cause) => {
        if (!active) return;
        if (cause instanceof ApiError && cause.status === 401) onExpired();
        else setLoadError(true);
      },
    );
    return () => {
      active = false;
    };
  }, [client, onExpired]);

  const user = account?.user;
  const rows: Array<[string, string]> = user
    ? [
        ["이름", user.displayName || "없음"],
        ["아이디", user.username],
        ["이메일", user.email ? `${user.email} (${user.emailVerified ? "인증됨" : "인증 전"})` : "없음"],
        ["로그인 방식", account.hasLocalPassword ? "아이디·비밀번호" : "Google 전용"],
        ["가입일", formatTime(user.createdAt)],
        ["마지막 로그인", formatTime(user.lastLoginAt)],
      ]
    : [];

  return (
    <View style={styles.card} testID="account-screen">
      <Text style={styles.heading}>계정</Text>
      {!user && <Text style={styles.muted}>{loadError ? "계정 정보를 불러오지 못했습니다." : "계정 정보를 불러오는 중…"}</Text>}
      {rows.map(([label, value]) => (
        <View key={label} style={{ gap: 2 }}>
          <Text style={styles.muted}>{label}</Text>
          <Text style={styles.text}>{value}</Text>
        </View>
      ))}
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <Button title="메인 사이트에서 계정 관리" onPress={() => void Linking.openURL(SITE_ORIGIN + "/#my-page")} />
      <Button title={busy ? "로그아웃 중…" : "로그아웃"} disabled={busy} onPress={onLogout} testID="account-logout" />
      <Text style={styles.muted}>웹에서는 같은 브라우저의 다른 jace-s 앱과 메인 사이트도 함께 로그아웃됩니다.</Text>
      <Button title="목록으로" variant="ghost" disabled={busy} onPress={onBack} />
    </View>
  );
}
