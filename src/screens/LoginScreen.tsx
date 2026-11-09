import React, { useContext, useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, View } from "react-native";
import type { EnglishClient } from "../api/client";
import { ApiError, type User } from "../api/types";
import { GoogleButton } from "../components/GoogleButton";
import { SITE_ORIGIN } from "../config";
import { Btn, Card, Input, T, Theme } from "../ui";

const ERRORS: Record<string, string> = {
  INVALID_CREDENTIALS: "아이디 또는 비밀번호가 맞지 않습니다.",
  EMAIL_NOT_VERIFIED: "이메일 인증을 마친 뒤 로그인할 수 있습니다.",
  RATE_LIMITED: "로그인 시도가 많습니다. 잠시 후 다시 시도해 주세요.",
};

/** Centered login card like the other companions: notice, Google sign-in, fields, remember check, primary submit and main page link. */
export function LoginScreen({ client, notice, onLoggedIn }: { client: EnglishClient; notice?: string; onLoggedIn: (user: User) => Promise<void> }) {
  const c = useContext(Theme);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (busy || !username.trim() || !password) return;
    setBusy(true);
    setError("");
    try { await onLoggedIn(await client.login(username, password, remember)); }
    catch (cause) { setError((cause instanceof ApiError && ERRORS[cause.code]) || "로그인하지 못했습니다. 다시 시도해 주세요."); }
    finally { setBusy(false); setPassword(""); }
  };
  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.55)" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 16 }} keyboardShouldPersistTaps="handled">
      <View style={{ width: "100%", maxWidth: 360 }}><Card title="로그인">
        <T size={13.1} tone="muted">{notice ?? "jace-s 계정으로 로그인하면 학습 기록이 계정별로 저장됩니다."}</T>
        <GoogleButton client={client} remember={remember} disabled={busy} onBusyChange={setBusy} onLoggedIn={onLoggedIn} />
        <View style={{ gap: 6 }}><T size={13.1} tone="muted" weight="600">아이디</T><Input label="아이디" value={username} onChangeText={setUsername} testID="login-username" /></View>
        <View style={{ gap: 6 }}><T size={13.1} tone="muted" weight="600">비밀번호</T><Input label="비밀번호" value={password} onChangeText={setPassword} secure onSubmit={() => void submit()} testID="login-password" /></View>
        {Platform.OS === "web" && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: remember }} accessibilityLabel="로그인 유지" onPress={() => setRemember(!remember)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: remember ? c.accent : c.border, backgroundColor: remember ? c.accent : c.raised, alignItems: "center", justifyContent: "center" }}>{remember && <T size={11} weight="800" style={{ color: c.onAccent, lineHeight: 13 }}>✓</T>}</View>
          <T size={13.1} tone="muted">로그인 유지</T>
        </Pressable>}
        {!!error && <T size={13.1} tone="error" selectable>{error}</T>}
        <Btn variant="primary" title={busy ? "로그인 중" : "로그인"} disabled={busy || !username.trim() || !password} onPress={() => void submit()} testID="login-submit" />
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(SITE_ORIGIN + "/")}><T size={13.1} tone="muted" style={{ textDecorationLine: "underline" }}>메인 페이지로</T></Pressable>
      </Card></View>
    </ScrollView>
  </KeyboardAvoidingView>;
}
