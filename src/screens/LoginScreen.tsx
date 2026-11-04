import React, { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import type { EnglishClient } from "../api/client";
import { ApiError, type User } from "../api/types";
import { GoogleButton } from "../components/GoogleButton";
import { Button, colors, Field, styles } from "../ui";

const ERRORS: Record<string, string> = {
  INVALID_CREDENTIALS: "아이디 또는 비밀번호가 맞지 않습니다.",
  EMAIL_NOT_VERIFIED: "이메일 인증을 마친 뒤 로그인할 수 있습니다.",
  RATE_LIMITED: "로그인 시도가 많습니다. 잠시 후 다시 시도해 주세요.",
};

/** Account login shown on direct entry or after the session ends. Web also offers the Google button. */
export function LoginScreen({ client, notice, onLoggedIn }: { client: EnglishClient; notice?: string; onLoggedIn: (user: User) => Promise<void> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (busy || !username.trim() || !password) return;
    setBusy(true);
    setError("");
    try {
      await onLoggedIn(await client.login(username, password, remember));
    } catch (cause) {
      setError((cause instanceof ApiError && ERRORS[cause.code]) || "로그인하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
      setPassword("");
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>로그인</Text>
      {!!notice && <Text style={styles.muted}>{notice}</Text>}
      <Field label="아이디" value={username} onChangeText={setUsername} autoComplete="username" textContentType="username" testID="login-username" />
      <Field
        label="비밀번호"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={() => void submit()}
        testID="login-password"
      />
      {Platform.OS === "web" && (
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: remember }} onPress={() => setRemember((v) => !v)} style={styles.row}>
          <Text style={{ color: remember ? colors.accent : colors.muted, fontSize: 18 }}>{remember ? "☑" : "☐"}</Text>
          <Text style={styles.text}>로그인 유지</Text>
        </Pressable>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <Button title={busy ? "로그인 중…" : "로그인"} variant="primary" disabled={busy || !username.trim() || !password} onPress={() => void submit()} testID="login-submit" />
      <GoogleButton client={client} remember={remember} disabled={busy} onBusyChange={setBusy} onLoggedIn={onLoggedIn} />
    </View>
  );
}
