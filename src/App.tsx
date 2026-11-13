import type { LibraryApi, LibraryBook } from "./readingWords";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, useWindowDimensions, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { accountDate, EnglishClient } from "./api/client";
import { createTransport } from "./api/transport";
import { ApiError, type Clock, type Progress, type StudyResult, type User } from "./api/types";
import { Notices } from "./components/Notices";
import { API_ORIGIN, SITE_ORIGIN } from "./config";
import { parseBooks } from "./content/content";
import rawContent from "./content/words.json";
import { DEFAULT_DISPLAY, readDisplay, writeDisplay, type Display } from "./display";
import { HomeScreen } from "./screens/HomeScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { SessionScreen, type SessionStart } from "./screens/SessionScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { Btn, Card, Device, gradient, layout, palettes, T, Theme } from "./ui";
import { Chrome, type Tab } from "./Chrome";
import { isDesktopLayout } from "./responsive";
import { BrowserTheme } from "./BrowserTheme";

const BOOKS = parseBooks(rawContent);

type Gate =
  | { kind: "checking" }
  | { kind: "login"; notice?: string }
  | { kind: "blocked"; message: string }
  | { kind: "ready"; user: User; clock: Clock; clockAt: number; progress: Progress };

const BLOCKED: Record<string, string> = {
  APP_ACCESS_DENIED: "이 앱을 사용할 권한이 없습니다.",
  PASSWORD_CHANGE_REQUIRED: "임시 비밀번호를 메인 사이트에서 바꾼 뒤 사용할 수 있습니다.",
};

export default function App() {
  const { width, height } = useWindowDimensions();
  const client = useMemo(() => new EnglishClient(createTransport(API_ORIGIN)), []);
  const [gate, setGate] = useState<Gate>({ kind: "checking" });
  const [tab, setTab] = useState<Tab>("today");
  const [bookId, setBookId] = useState(BOOKS[0]?.id ?? "");
  const [session, setSession] = useState<SessionStart | null>(null);
  const [display, setDisplay] = useState<Display>(DEFAULT_DISPLAY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const userId = useRef("");
  const desktop = isDesktopLayout(width, height, display.device);
  const [personalMaterials, setPersonalMaterials] = useState<LibraryBook[]>([]);
  const libraryApi: LibraryApi = useCallback((endpoint, body, query) => client.libraryRequest(endpoint, body, query), [client]);
  const books = useMemo(() => [...BOOKS, ...personalMaterials.filter(book => book.kind === "vocabulary").map(book => ({ id: book.id, title: book.title, units: [{ id: book.id, title: book.title, words: book.words }] }))], [personalMaterials]);
  const allUnits = useMemo(() => books.flatMap(book => book.units), [books]);
  const visibleUnits = desktop ? allUnits : books.find(book => book.id === bookId)?.units ?? [];
  const reloadLibrary = useCallback(() => { void libraryApi<{ books: LibraryBook[] }>("library").then(data => setPersonalMaterials(data.books), () => setError("교재 목록을 새로 불러오지 못했습니다.")); }, [libraryApi]);
  const c = palettes[display.theme];

  useEffect(() => { readDisplay().then(setDisplay, () => undefined); }, []);
  const changeDisplay = (next: Display) => { setDisplay(next); void writeDisplay(next).catch(() => undefined); };

  /** Loads permission, account clock and progress for a signed-in user. Another account resets every screen. */
  const enter = useCallback(async (user: User | null, notice?: string) => {
    if (!user) return setGate({ kind: "login", notice });
    try {
      const clock = await client.bootstrap();
      const progress = await client.progress();
      const library = await client.libraryRequest<{ books: LibraryBook[] }>("library");
      setPersonalMaterials(library.books);
      if (userId.current && userId.current !== user.id) { setSession(null); setTab("today"); setBookId(BOOKS[0]?.id ?? ""); }
      userId.current = user.id;
      setGate({ kind: "ready", user, clock, clockAt: Date.now(), progress });
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) return setGate({ kind: "login", notice: "로그인이 끝났습니다. 다시 로그인해 주세요." });
      const code = cause instanceof ApiError ? cause.code : "";
      setGate({ kind: "blocked", message: BLOCKED[code] ?? "로그인 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." });
    }
  }, [client]);

  useEffect(() => {
    client.restore().then((user) => enter(user), () => setGate({ kind: "blocked", message: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." }));
  }, [client, enter]);

  const today = gate.kind === "ready" ? accountDate(gate.clock, Date.now() - gate.clockAt) : "";

  /** Results are written only when the learner presses save on the result step. */
  const save = async (results: Record<string, StudyResult>) => {
    if (gate.kind !== "ready" || busy) return;
    setBusy(true);
    setError("");
    try {
      const updated = await client.saveResults(Object.entries(results).map(([id, result]) => ({ id, result })));
      setGate({ ...gate, progress: { ...gate.progress, ...updated } });
      setSession(null);
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
      setSession(null);
      setTab("today");
      setBookId(BOOKS[0]?.id ?? "");
      setGate({ kind: "login" });
    } catch {
      setError("로그아웃하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const expired = useCallback(() => { setSession(null); setGate({ kind: "login", notice: "로그인이 끝났습니다. 다시 로그인해 주세요." }); }, []);

  let body: React.ReactNode;
  if (gate.kind === "checking") body = <View style={layout.body}><T tone="muted">로그인 확인 중…</T></View>;
  else if (gate.kind === "login") body = <LoginScreen client={client} notice={gate.notice} onLoggedIn={(user) => enter(user)} />;
  else if (gate.kind === "blocked") body = <View style={[layout.body, { maxWidth: 520 }]}><Card title="English Companion"><T>{gate.message}</T><Btn variant="primary" title="메인 페이지로" onPress={() => void Linking.openURL(SITE_ORIGIN + "/")} /></Card></View>;
  else if (session) body = <SessionScreen libraryApi={libraryApi} key={session.title + session.words.map((word) => word.id).join()} start={session} progress={gate.progress} isPhone={!desktop} busy={busy} error={error} onSave={(results) => void save(results)} onClose={() => { setError(""); setSession(null); }} />;
  else body = <Chrome desktop={desktop} tab={tab} today={today} dueCount={visibleUnits.filter((unit) => unit.words.some((word) => word.quiz && gate.progress[word.id] && gate.progress[word.id].due <= today)).length} onNavigate={setTab}>
    {tab === "settings"
      ? <SettingsScreen client={client} phone={!desktop} busy={busy} error={error} display={display} onDisplay={changeDisplay} onLogout={() => void logout()} onExpired={expired} />
      : <HomeScreen libraryApi={libraryApi} onLibraryChanged={reloadLibrary} key={gate.user.id} books={books} bookId={bookId} onBookChange={setBookId} units={allUnits} progress={gate.progress} today={today} desktop={desktop} tab={tab}
        onStudy={(row) => setSession({ title: row.unit.title, words: row.unit.words, review: false })}
        onReview={(row) => setSession({ title: row.unit.title + " 복습", words: row.dueWords, review: true })} />}
  </Chrome>;

  return <SafeAreaProvider><Theme.Provider value={c}><Device.Provider value={{ phone: !desktop }}><BrowserTheme scheme={display.theme} />
    <StatusBar style={display.theme === "light" ? "dark" : "light"} />
    <SafeAreaView style={[{ flex: 1, backgroundColor: c.bg }, gradient(`radial-gradient(900px 480px at 85% -10%, ${c.glow}, transparent 70%)`)]}>
      <Notices />
      {body}
    </SafeAreaView>
  </Device.Provider></Theme.Provider></SafeAreaProvider>;
}
