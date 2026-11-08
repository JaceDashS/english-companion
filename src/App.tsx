import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { accountDate, EnglishClient } from "./api/client";
import { createTransport } from "./api/transport";
import { ApiError, type Clock, type Progress, type StudyResult, type User } from "./api/types";
import { Notices } from "./components/Notices";
import { API_ORIGIN, SITE_ORIGIN } from "./config";
import { parseContent, type EnglishUnit, type EnglishWord } from "./content/content";
import rawContent from "./content/words.json";
import { quizWords } from "./domain/study";
import { AccountScreen } from "./screens/AccountScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { QuizScreen } from "./screens/QuizScreen";
import { ResultScreen } from "./screens/ResultScreen";
import { StudyScreen } from "./screens/StudyScreen";
import { Button, colors, styles } from "./ui";
import { Chrome } from "./Chrome";
import { isDesktopLayout } from "./responsive";

const UNITS: EnglishUnit[] = parseContent(rawContent);

type Gate =
  | { kind: "checking" }
  | { kind: "login"; notice?: string }
  | { kind: "blocked"; message: string }
  | { kind: "ready"; user: User; clock: Clock; clockAt: number; progress: Progress };

type View_ =
  | { kind: "home" }
  | { kind: "account" }
  | { kind: "study"; unit: EnglishUnit }
  | { kind: "quiz"; title: string; words: EnglishWord[] }
  | { kind: "result"; results: Record<string, StudyResult> };

const BLOCKED: Record<string, string> = {
  APP_ACCESS_DENIED: "이 앱을 사용할 권한이 없습니다.",
  PASSWORD_CHANGE_REQUIRED: "임시 비밀번호를 메인 사이트에서 바꾼 뒤 사용할 수 있습니다.",
};

export default function App() {
  const { width, height } = useWindowDimensions();
  const desktop = isDesktopLayout(width, height);
  const client = useMemo(() => new EnglishClient(createTransport(API_ORIGIN)), []);
  const [gate, setGate] = useState<Gate>({ kind: "checking" });
  const [view, setView] = useState<View_>({ kind: "home" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const userId = useRef("");

  /** Loads permission, account clock and progress for a signed-in user. Another account resets every screen. */
  const enter = useCallback(
    async (user: User | null, notice?: string) => {
      if (!user) return setGate({ kind: "login", notice });
      try {
        const clock = await client.bootstrap();
        const progress = await client.progress();
        if (userId.current && userId.current !== user.id) setView({ kind: "home" });
        userId.current = user.id;
        setGate({ kind: "ready", user, clock, clockAt: Date.now(), progress });
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) return setGate({ kind: "login", notice: "로그인이 끝났습니다. 다시 로그인해 주세요." });
        const code = cause instanceof ApiError ? cause.code : "";
        setGate({ kind: "blocked", message: BLOCKED[code] ?? "로그인 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." });
      }
    },
    [client],
  );

  useEffect(() => {
    client.restore().then(
      (user) => enter(user),
      () => setGate({ kind: "blocked", message: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." }),
    );
  }, [client, enter]);

  const today = gate.kind === "ready" ? accountDate(gate.clock, Date.now() - gate.clockAt) : "";

  const save = async (results: Record<string, StudyResult>) => {
    if (gate.kind !== "ready" || busy) return;
    setBusy(true);
    setError("");
    try {
      const updated = await client.saveResults(Object.entries(results).map(([id, result]) => ({ id, result })));
      setGate({ ...gate, progress: { ...gate.progress, ...updated } });
      setView({ kind: "home" });
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) setGate({ kind: "login", notice: "로그인이 끝났습니다. 다시 로그인한 뒤 결과를 저장해 주세요." });
      else setError("저장하지 못했습니다. 연결을 확인한 뒤 다시 저장해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    try {
      await client.logout();
      userId.current = "";
      setView({ kind: "home" });
      setGate({ kind: "login" });
    } catch {
      setError("로그아웃하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const expired = useCallback(() => {
    setView({ kind: "home" });
    setGate({ kind: "login", notice: "로그인이 끝났습니다. 다시 로그인해 주세요." });
  }, []);

  let body: React.ReactNode;
  if (gate.kind === "checking") body = <Text style={styles.muted}>로그인 확인 중…</Text>;
  else if (gate.kind === "login") body = <LoginScreen client={client} notice={gate.notice} onLoggedIn={(user) => enter(user)} />;
  else if (gate.kind === "blocked")
    body = (
      <View style={styles.card}>
        <Text style={styles.heading}>{gate.message}</Text>
        <Button title="메인 페이지로" variant="primary" onPress={() => void Linking.openURL(SITE_ORIGIN + "/")} />
      </View>
    );
  else if (view.kind === "account")
    body = (
      <AccountScreen
        client={client}
        busy={busy}
        error={error}
        onBack={() => {
          setError("");
          setView({ kind: "home" });
        }}
        onLogout={() => void logout()}
        onExpired={expired}
      />
    );
  else if (view.kind === "study") body = <StudyScreen unit={view.unit} onBack={() => setView({ kind: "home" })} onQuiz={() => setView({ kind: "quiz", title: view.unit.title, words: quizWords(view.unit.words) })} />;
  else if (view.kind === "quiz")
    body = <QuizScreen key={view.words.map((w) => w.id).join()} title={view.title} words={view.words} onBack={() => setView({ kind: "home" })} onFinish={(results) => setView({ kind: "result", results })} />;
  else if (view.kind === "result") body = <ResultScreen results={view.results} busy={busy} error={error} onSave={() => void save(view.results)} onDiscard={() => setView({ kind: "home" })} />;
  else
    body = (
      <HomeScreen
        desktop={desktop}
        units={UNITS}
        progress={gate.progress}
        today={today}
        onStudy={(unit) => setView({ kind: "study", unit })}
        onReview={(words) => setView({ kind: "quiz", title: "오늘 복습", words })}
      />
    );

  const content = <ScrollView contentContainerStyle={[styles.screen, { maxWidth: view.kind === "home" && gate.kind === "ready" ? 1320 : 860 }]} keyboardShouldPersistTaps="handled">
    <Notices />
    {gate.kind === "ready" && view.kind === "home" && !!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {body}
  </ScrollView>;
  return <SafeAreaProvider><StatusBar style="light" /><SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    {gate.kind === "ready" && (view.kind === "home" || view.kind === "account") ? <Chrome desktop={desktop} account={view.kind === "account"} username={gate.user.username} onHome={() => { setError(""); setView({ kind: "home" }); }} onAccount={() => setView({ kind: "account" })}>{content}</Chrome> : content}
  </SafeAreaView></SafeAreaProvider>;
}
