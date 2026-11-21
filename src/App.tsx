import { StudySkeleton } from "./StudyLoading";
import { clearSnapshot, readSnapshot, saveSnapshot } from "./studySnapshot";
import { useCompanionReady } from "./useCompanionReady";
import type { LibraryApi, LibraryBook } from "./readingWords";
import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Linking, Platform, Pressable, Text, useWindowDimensions, View, type ViewStyle } from "react-native";
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
import { Btn, Card, Device, gradient, layout, palettes, T, Theme, Toast } from "./ui";
import { ReaderScreen, useReadingLibrary } from "./ReadingLibrary";
import { Chrome, type HeaderSection, type Tab } from "./Chrome";
import { isDesktopLayout } from "./responsive";
import { BrowserTheme } from "./BrowserTheme";
import { useMainReturn } from "./useMainReturn";
import { CompletionHud, type Completion, type CompletionMessage } from "./CompletionHud";

import { remainingNewWords } from "./domain/study";
import { splitWordsIntoDays, WORDS_PER_DAY } from "./domain/dashboard";
import { ResultQueue } from "./domain/resultQueue";
import { resultStorage } from "./resultStorage";
const EMPTY_DELIVERY = { items: [], persistent: true, progress: {} };
const subscribeNone = () => () => {};

const BOOKS = parseBooks(rawContent);

type CachedStudy = { user: User; clock: Clock; progress: Progress };

type Gate =
  | { kind: "checking" }
  | { kind: "login"; notice?: string }
  | { kind: "blocked"; message: string }
  | { kind: "ready"; user: User; clock: Clock; clockAt: number; progress: Progress; verified: boolean };

const BLOCKED: Record<string, string> = {
  APP_ACCESS_DENIED: "이 앱을 사용할 권한이 없습니다.",
  PASSWORD_CHANGE_REQUIRED: "임시 비밀번호를 메인 사이트에서 바꾼 뒤 사용할 수 있습니다.",
};

export interface CompanionHost {
  embedded?: boolean;
  active?: boolean;
  initialUser?: User;
  onOpenHub?: () => void;
  onLogout?: () => Promise<void>;
  onExpired?: () => void;
  onStatusChange?: (status: { state: "loading" | "ready" | "error"; dueCount?: number; summary?: string }) => void;
  renderAdSlot?: (placement: string) => React.ReactNode;
}

export function EnglishCompanionApp({ host }: { host?: CompanionHost } = {}) {
  const embedded = Boolean(host?.embedded);
  const hostActive = host?.active !== false;
  const hostRef = useRef(host);
  hostRef.current = host;
  const { width, height } = useWindowDimensions();
  const client = useMemo(() => new EnglishClient(createTransport(API_ORIGIN)), []);
  const [gate, setGate] = useState<Gate>({ kind: "checking" });
  const [tab, setTab] = useState<Tab>("today");
  const [bookId, setBookId] = useState(BOOKS[0]?.id ?? "");
  useCompanionReady(gate.kind === "ready");
  const [session, setSession] = useState<SessionStart | null>(null);
  const [display, setDisplay] = useState<Display>(DEFAULT_DISPLAY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const userId = useRef("");
  const queues = useRef(new Map<string, ResultQueue>());
  const [resultQueue, setResultQueue] = useState<ResultQueue | null>(null);
  const delivery = useSyncExternalStore(resultQueue?.subscribe ?? subscribeNone, resultQueue?.getSnapshot ?? (() => EMPTY_DELIVERY));
  useEffect(() => {
    if (!resultQueue) return;
    setGate(previous => previous.kind === "ready" && previous.user.id === client.currentUser?.id ? { ...previous, progress: delivery.progress } : previous);
  }, [delivery, resultQueue, client]);
  useEffect(() => () => { for (const queue of queues.current.values()) queue.pause(); }, []);
  const desktop = isDesktopLayout(width, height, display.device);
  const [section, setSection] = useState<HeaderSection>("vocabulary");
  const [toast, setToast] = useState<{ text: string; tone?: string } | null>(null);
  const notify = useCallback((text: string, tone?: string) => setToast({ text, tone }), []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 5000); return () => clearTimeout(timer); }, [toast]);
  const libraryApi: LibraryApi = useCallback((endpoint, body, query) => client.libraryRequest(endpoint, body, query), [client]);
  const library = useReadingLibrary(libraryApi, notify, gate.kind === "ready" && gate.verified);
  const personalMaterials: LibraryBook[] = useMemo(() => library.books ?? [], [library.books]);
  const books = useMemo(() => [...BOOKS.filter(book => book.units.some(unit => unit.words.length)), ...personalMaterials.filter(book => book.kind === "vocabulary").map(book => ({ id: book.id, title: book.title, units: splitWordsIntoDays(book.id, book.words) }))], [personalMaterials]);
  const allUnits = useMemo(() => books.flatMap(book => book.units), [books]);
  const visibleUnits = (books.find(book => book.id === bookId) ?? books[0])?.units ?? [];
  // The last selected vocabulary is part of the account reader state, so every device opens the same one.
  useEffect(() => { const saved = library.reading.vocabularyId; if (saved && books.some(book => book.id === saved)) setBookId(saved); else if (!books.some(book => book.id === bookId) && books[0]) setBookId(books[0].id); }, [library.reading.vocabularyId, books]);
  const chooseVocabulary = (id: string) => { setBookId(id); library.setVocabulary(id); };
  // The account's last section opens again once per sign-in: a visit that ended in the bookshelf starts there.
  const sectionRestoredFor = useRef("");
  const signedInId = gate.kind === "ready" ? gate.user.id : "";
  useEffect(() => {
    if (!signedInId || !library.loaded || sectionRestoredFor.current === signedInId) return;
    sectionRestoredFor.current = signedInId;
    setSection(library.reading.section === "bookshelf" ? "bookshelf" : "vocabulary");
  }, [signedInId, library.loaded, library.reading.section]);
  const changeSection = (next: HeaderSection) => { setSection(next); library.setSection(next); };
  const goHome = () => { changeSection("vocabulary"); setTab("today"); };
  // The last saved quiz; the home screen shows it once and clears it.
  const [completion, setCompletion] = useState<Completion | CompletionMessage | null>(null);
  const c = palettes[display.theme];

  useEffect(() => { readDisplay().then(setDisplay, () => undefined); }, []);
  const changeDisplay = (next: Display) => { setDisplay(next); void writeDisplay(next).catch(() => undefined); };

  const getQueue = useCallback((owner: string) => {
    let queue = queues.current.get(owner);
    if (!queue) {
      queue = new ResultQueue(resultStorage(owner), job => {
        if (client.currentUser?.id !== owner) return Promise.reject(new ApiError(401, "ACCOUNT_CHANGED"));
        return client.saveResults(job.results, job.id, job.date);
      });
      queues.current.set(owner, queue);
    }
    return queue;
  }, [client]);

  const checking = useRef(false);
  const [rechecking, setRechecking] = useState(false);
  const enter = useCallback(async (knownUser?: User) => {
    if (checking.current) return;
    checking.current = true;
    setRechecking(true);
    let finished = false;
    let previewQueue: ResultQueue | undefined;
    const cached = knownUser ? Promise.resolve(null) : readSnapshot<CachedStudy>().then(async snapshot => {
      if (!snapshot || snapshot.owner !== snapshot.payload.user.id) return null;
      if (!finished) {
        const { user, clock, progress } = snapshot.payload;
        const queue = getQueue(user.id);
        await queue.restore(progress, false);
        previewQueue = queue;
        if (!finished) {
          setResultQueue(queue);
          setGate({ kind: "ready", verified: false, user, clock, clockAt: snapshot.savedAt, progress: queue.getSnapshot().progress });
        }
      }
      return snapshot;
    }).catch(() => null);
    try {
      const result = await client.startStudy(knownUser);
      finished = true;
      const snapshot = await cached;
      if (!result || (snapshot && snapshot.owner !== result.user.id)) {
        await clearSnapshot(snapshot?.owner);
        setResultQueue(null);
        return setGate({ kind: "login" });
      }
      const { user, progress, clock } = result;
      if (userId.current && userId.current !== user.id) { setSession(null); setTab("today"); setBookId(BOOKS[0]?.id ?? ""); }
      for (const queue of queues.current.values()) queue.pause();
      const queue = getQueue(user.id);
      if (queue === previewQueue) { queue.reconcile(progress); queue.resume(); }
      else await queue.restore(progress);
      setResultQueue(queue);
      userId.current = user.id;
      setGate({ kind: "ready", verified: true, user, clock, clockAt: Date.now(), progress: queue.getSnapshot().progress });
      void saveSnapshot(user.id, "progress", result);
    } catch (cause) {
      const snapshot = await cached;
      if (cause instanceof ApiError && (cause.status === 401 || cause.code === "ACCOUNT_CHANGED")) {
        await clearSnapshot(snapshot?.owner);
        setResultQueue(null);
        return setGate({ kind: "login", notice: "로그인이 끝났습니다. 다시 로그인해 주세요." });
      }
      const code = cause instanceof ApiError ? cause.code : "";
      if (!snapshot || BLOCKED[code]) {
        setGate({ kind: "blocked", message: BLOCKED[code] ?? "로그인 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." });
      }
    } finally { checking.current = false; setRechecking(false); }
  }, [client, getQueue]);

  useEffect(() => { void enter(hostRef.current?.initialUser); }, [enter]);

  const today = gate.kind === "ready" ? accountDate(gate.clock, Date.now() - gate.clockAt) : "";
  const dueCount = gate.kind === "ready"
    ? visibleUnits.filter((unit) => unit.words.some((word) => word.quiz && gate.progress[word.id] && gate.progress[word.id].due <= today)).length
    : 0;

  useEffect(() => {
    const report = hostRef.current?.onStatusChange;
    if (!report) return;
    if (gate.kind === "ready") report({ state: "ready", dueCount, summary: dueCount > 0 ? `복습 ${dueCount} Day` : "오늘 복습 완료" });
    else if (gate.kind === "blocked") report({ state: "error", summary: gate.message });
    else report({ state: "loading" });
  }, [gate, dueCount]);

  /** Local progress and navigation update immediately; durable delivery runs independently. */
  const save = (results: Record<string, StudyResult>) => {
    if (gate.kind !== "ready" || !gate.verified || !resultQueue) return false;
    resultQueue.enqueue(Object.entries(results).map(([id, result]) => ({ id, result })), today);
    const progress = resultQueue.getSnapshot().progress;
    setGate(previous => previous.kind === "ready" ? { ...previous, progress } : previous);
    const ids = Object.keys(results);
    const passCount = ids.filter(id => results[id] === "PASS").length;
    const nextReviewDate = ids.map(id => progress[id]?.due).filter((due): due is string => typeof due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(due)).sort()[0] ?? null;
    if (ids.length) setCompletion({ id: Date.now(), passCount, total: ids.length, allPass: passCount === ids.length, nextReviewDate });
    return true;
  };

  const logout = async () => {
    if (hostRef.current?.onLogout) {
      resultQueue?.pause();
      await clearSnapshot(userId.current || undefined);
      await hostRef.current.onLogout();
      return;
    }
    resultQueue?.pause();
    setBusy(true);
    try {
      await client.logout();
      await clearSnapshot(userId.current || undefined);
      userId.current = "";
      setSession(null);
      setTab("today");
      setBookId(BOOKS[0]?.id ?? "");
      setGate({ kind: "login" });
    } catch {
      resultQueue?.resume();
      setError("로그아웃하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const expired = useCallback(() => {
    void clearSnapshot(userId.current || undefined);
    for (const queue of queues.current.values()) queue.pause();
    setSession(null);
    if (hostRef.current?.onExpired) {
      hostRef.current.onExpired();
      return;
    }
    setGate({ kind: "login", notice: "로그인이 끝났습니다. 다시 로그인해 주세요." });
  }, []);

  useMainReturn({
    active: hostActive && gate.kind === "ready" && Boolean(session),
    busy,
    dirty: false,
    subPath: "session",
    onReturn: () => {
      setError("");
      setSession(null);
    },
  });
  useMainReturn({
    active: hostActive && gate.kind === "ready" && !session && tab !== "today",
    dirty: false,
    subPath: tab !== "today" ? tab : undefined,
    onReturn: () => setTab("today"),
  });

  let body: React.ReactNode;
  if (gate.kind === "checking") body = <StudySkeleton />;
  else if (gate.kind === "login") body = <LoginScreen client={client} notice={gate.notice} onLoggedIn={(user) => enter(user)} />;
  else if (gate.kind === "blocked") body = <View style={[layout.body, { maxWidth: 520 }]}><Card title="English Companion"><T>{gate.message}</T><Btn variant="primary" title="메인 페이지로" onPress={() => void Linking.openURL(SITE_ORIGIN + "/")} /></Card></View>;
  else if (library.openId) body = <ReaderScreen library={library} api={libraryApi} language="en" notify={notify} />;
  else if (session) body = <SessionScreen libraryApi={libraryApi} vocabularyWords={allUnits.flatMap(unit => unit.words)} key={session.title + session.words.map((word) => word.id).join()} start={session} progress={gate.progress} isPhone={!desktop} busy={busy} error={error} onSave={save} onClose={() => { setError(""); setSession(null); }} />;
  else body = <Chrome desktop={desktop} section={section} onSectionChange={(next) => { changeSection(next); if (tab === "settings") setTab("today"); }} onHome={goHome} onOpenHub={host?.onOpenHub} adSlot={tab !== "settings" ? host?.renderAdSlot?.("english-bottom") : undefined} tab={tab} today={today} dueCount={dueCount} onNavigate={setTab}>
    {tab === "settings"
      ? <SettingsScreen client={client} phone={!desktop} busy={busy} error={error} display={display} onDisplay={changeDisplay} onLogout={() => void logout()} onExpired={expired} hideUnifiedAppLink={embedded}
        vocabularies={personalMaterials.filter(book => book.kind === "vocabulary")}
        onDeleteVocabulary={async (book) => { await libraryApi("library/delete", { id: book.id }); await library.reload(); notify(`${book.title} 단어장을 삭제했습니다.`); }} />
      : <HomeScreen libraryApi={libraryApi} library={library} section={section} notify={notify} key={gate.user.id} books={books} bookId={bookId} onBookChange={chooseVocabulary} units={allUnits} progress={gate.progress} today={today} desktop={desktop} tab={tab} dailyNewDays={display.dailyNewDays}
        onImportComplete={(title, detail) => setCompletion({ id: Date.now(), allPass: true, title, detail })}
        onStudy={(row, queuedWords) => {
          const dailyLimit = display.dailyNewDays * WORDS_PER_DAY;
          const remaining = remainingNewWords(gate.progress, today, dailyLimit);
          const newWords = row.unit.words.filter(word => word.quiz && !gate.progress[word.id]).slice(0, remaining);
          const newIds = new Set(newWords.map(word => word.id));
          const words = queuedWords ?? row.unit.words.filter(word => !word.quiz || gate.progress[word.id] || newIds.has(word.id));
          if (words.length) setSession({ title: row.unit.title, words, review: false });
          else notify(`오늘 신규 학습(${display.dailyNewDays}개 Day · ${dailyLimit}단어)을 모두 완료했습니다.`);
        }}
        onReview={(row) => setSession({ title: row.unit.title + " 복습", words: row.dueWords, review: true })} />}
  </Chrome>;

  const toastBottom = !desktop && !session && !library.openId ? 76 : 24;
  const content = <Theme.Provider value={c}><Device.Provider value={{ phone: !desktop }}>
    {hostActive && <BrowserTheme scheme={display.theme} />}
    {hostActive && <StatusBar style={display.theme === "light" ? "dark" : "light"} />}
    <View style={[{ flex: 1, backgroundColor: c.bg }, gradient(`radial-gradient(900px 480px at 85% -10%, ${c.glow}, transparent 70%)`)]}>
      <View ref={node => { if (Platform.OS === "web" && node instanceof HTMLElement) node.inert = gate.kind === "ready" && !gate.verified; }} accessibilityElementsHidden={gate.kind === "ready" && !gate.verified} importantForAccessibility={gate.kind === "ready" && !gate.verified ? "no-hide-descendants" : "auto"} pointerEvents={gate.kind === "ready" && !gate.verified ? "none" : "auto"} style={{ flex: 1 }}>{body}</View>
      <CompletionHud completion={gate.kind === "ready" && !session ? completion : null} today={today} onDone={() => setCompletion(null)} />
      <Notices />
      {gate.kind === "ready" && gate.verified && delivery.items.length > 0 && (
        <View
          pointerEvents="box-none"
          style={{ position: "absolute", left: 16, right: 16, bottom: toastBottom, zIndex: 85, elevation: 8, alignItems: "center" }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 460,
              gap: 6,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.sunken,
              boxShadow: "0 16px 38px rgba(0, 0, 0, 0.5)",
            } as ViewStyle}
          >
            <T size={12} tone="muted">전송 대기 {delivery.items.length}건 · 연결되면 자동으로 재시도합니다.</T>
            {!delivery.persistent && <T size={12} tone="error">이 기기에서는 큐를 저장할 수 없어 앱을 닫으면 대기 기록이 사라질 수 있습니다.</T>}
            {delivery.items.filter(job => job.status === "failed").map(job => (
              <View key={job.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <T size={12} tone="error" style={{ flex: 1 }}>전송 거절: {job.error}</T>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => resultQueue?.retry(job.id)}
                  style={({ pressed }) => ({
                    paddingVertical: 4,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    backgroundColor: c.errorSoft,
                    borderWidth: 1,
                    borderColor: c.errorLine,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text style={{ color: c.error, fontSize: 12, fontWeight: "700" }}>재전송</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}
      {gate.kind === "ready" && !gate.verified && (
        <View
          pointerEvents="box-none"
          style={{ position: "absolute", left: 16, right: 16, bottom: toastBottom, zIndex: 100, elevation: 12, alignItems: "center" }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              maxWidth: 460,
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: rechecking ? c.border : c.accentLine,
              backgroundColor: c.sunken,
              boxShadow: "0 16px 38px rgba(0, 0, 0, 0.5)",
            } as ViewStyle}
          >
            {rechecking ? (
              <Text accessibilityRole="summary" style={{ color: c.text, fontSize: 13.5, fontWeight: "600" }}>
                연결 확인 중...
              </Text>
            ) : (
              <>
                <Text accessibilityRole="alert" style={{ color: c.text, fontSize: 13.5, fontWeight: "600" }}>
                  연결 확인 필요
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void enter()}
                  style={({ pressed }) => ({
                    paddingVertical: 4,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    backgroundColor: c.soft,
                    borderWidth: 1,
                    borderColor: c.accentLine,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text style={{ color: c.accentStrong, fontSize: 12.8, fontWeight: "700" }}>다시 확인</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      )}
      {toast && <Toast text={toast.text} tone={toast.tone} phone={!desktop && !session && !library.openId} />}
    </View>
  </Device.Provider></Theme.Provider>;

  if (embedded) return content;
  return <SafeAreaProvider><SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>{content}</SafeAreaView></SafeAreaProvider>;
}

export default function App() {
  return <EnglishCompanionApp />;
}
