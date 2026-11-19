import { FeedbackSheet } from "../FeedbackSheet";
import React, { useEffect, useState } from "react";
import { Linking, Platform, ScrollView, View } from "react-native";
import type { EnglishClient } from "../api/client";
import { ApiError, type Account } from "../api/types";
import { SITE_ORIGIN } from "../config";
import type { Display } from "../display";
import type { LibraryBook } from "../readingWords";
import { Btn, Card, layout, Segment, T } from "../ui";

const DEFAULT_VOCABULARY_ID = "example-words";

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
export function SettingsScreen({ client, phone, busy, error, display, onDisplay, onLogout, onExpired, vocabularies = [], onDeleteVocabulary }: {
  client: EnglishClient; phone: boolean; busy: boolean; error: string; display: Display; onDisplay: (next: Display) => void; onLogout: () => void; onExpired: () => void;
  vocabularies?: LibraryBook[]; onDeleteVocabulary?: (book: LibraryBook) => Promise<void>;
}) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
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
  return <>
    {feedbackOpen && <FeedbackSheet send={content => client.submitFeedback(content)} onClose={() => setFeedbackOpen(false)} />}
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={phone ? layout.phoneBody : layout.body}>
    <Card title="계정">
      <View testID="account-screen" style={{ gap: 6, marginBottom: 2 }}>
        {!user && <T size={13.1} tone="muted">{loadError ? "계정 정보를 불러오지 못했습니다." : "계정 정보를 불러오는 중…"}</T>}
        {rows.map(([name, value]) => <View key={name} style={{ flexDirection: "row", gap: 16 }}><T size={13.1} tone="muted" style={{ width: 84, lineHeight: 24 }}>{name}</T><T size={16} selectable style={{ flex: 1 }}>{value}</T></View>)}
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Btn title="메인 사이트에서 계정 관리" style={{ flex: 1 }} onPress={() => void Linking.openURL(SITE_ORIGIN + "/#my-page")} />
        <Btn variant="danger" title={busy ? "로그아웃 중…" : "로그아웃"} disabled={busy} style={{ flex: 1 }} onPress={onLogout} testID="account-logout" />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Btn title="개발자에 대해" style={{ flex: 1 }} onPress={() => { const url = SITE_ORIGIN + "/about"; if (Platform.OS === "web" && typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer"); else void Linking.openURL(url); }} testID="about-developer" />
        <Btn title="피드백" style={{ flex: 1 }} onPress={() => setFeedbackOpen(true)} testID="feedback" />
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
    {vocabularies.length > 0 && <Card title="단어장 관리" hint={`${vocabularies.length}개`}>
      <View style={{ gap: 12 }}>
        {vocabularies.map((book) => {
          const isDefault = book.id === DEFAULT_VOCABULARY_ID;
          const confirming = confirmDeleteId === book.id;
          const deleting = deletingId === book.id;
          return <Row key={book.id} title={book.title} hint={`${book.words.length}단어${isDefault ? " · 기본 단어장" : ""}`}>
            {isDefault
              ? <T size={12.2} tone="dim">삭제 불가</T>
              : confirming
                ? <View style={{ flexDirection: "row", gap: 6 }}>
                    <Btn variant="danger" title={deleting ? "삭제 중…" : "정말 삭제"} disabled={deleting || !onDeleteVocabulary} testID={`confirm-delete-vocab-${book.id}`} onPress={() => {
                      if (!onDeleteVocabulary) return;
                      setDeleteError("");
                      setDeletingId(book.id);
                      void onDeleteVocabulary(book).then(() => { setConfirmDeleteId(null); }, (cause) => {
                        setDeleteError(cause instanceof Error ? cause.message : "단어장을 삭제하지 못했습니다.");
                      }).finally(() => setDeletingId(null));
                    }} />
                    <Btn title="취소" disabled={deleting} onPress={() => setConfirmDeleteId(null)} />
                  </View>
                : <Btn variant="danger" title="삭제" disabled={!!deletingId || !onDeleteVocabulary} testID={`delete-vocab-${book.id}`} onPress={() => { setDeleteError(""); setConfirmDeleteId(book.id); }} />}
          </Row>;
        })}
      </View>
      <T size={12.2} tone="dim">기본 단어장은 삭제할 수 없습니다.</T>
      {confirmDeleteId && <T size={12.2} tone="dim">삭제한 단어장은 복구할 수 없습니다.</T>}
      {!!deleteError && <T size={13.1} tone="error">{deleteError}</T>}
    </Card>}
  </ScrollView></>;
}
