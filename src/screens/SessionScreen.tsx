import { WordLookup } from "../ReadingLibrary";
import type { LibraryApi } from "../readingWords";
import React, { useContext, useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import type { Progress, StudyResult } from "../api/types";
import type { EnglishWord } from "../content/content";
import { grade, quizWords, sentenceOrder } from "../domain/study";
import { Btn, Chip, Empty, fonts, Input, primaryFill, Segment, Sheet, Switch, T, Theme } from "../ui";

export type SessionStart = { title: string; words: EnglishWord[]; review: boolean };
type Phase = "study" | "quiz" | "done";

/** One-line scratch memo for the current question; never saved and recreated empty for each question. */
function QuizMemo() {
  const [memo, setMemo] = useState("");
  return <Input label="메모" placeholder="메모 (저장되지 않음)" value={memo} onChangeText={setMemo} testID="quiz-memo" />;
}
function WordCard({ children }: { children: React.ReactNode }) {
  const c = useContext(Theme);
  return <View style={{ alignItems: "center", gap: 12, paddingVertical: 22, paddingHorizontal: 16, borderWidth: 1, borderColor: c.border, borderRadius: 16, backgroundColor: c.panel }}>{children}</View>;
}
function IdChip({ id }: { id: string }) {
  const c = useContext(Theme);
  return <View style={{ paddingVertical: 2, paddingHorizontal: 7, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.raised }}><T size={11.2} mono tone="dim" style={{ lineHeight: 16 }}>{id}</T></View>;
}
function Choice({ index, text, selected, state, disabled, phone, onPress }: { index: number; text: string; selected: boolean; state?: "correct" | "wrong"; disabled: boolean; phone: boolean; onPress: () => void }) {
  const c = useContext(Theme);
  const [hover, setHover] = useState(false);
  const border = state === "correct" ? c.good : state === "wrong" ? c.error : selected ? c.accent : hover && !disabled ? c.accentLine : c.border;
  const bg = state === "correct" ? c.goodSoft : state === "wrong" ? c.errorSoft : selected ? c.soft : c.panel;
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} accessibilityLabel={`${index + 1}번 ${text}`} disabled={disabled} onPress={onPress} onHoverIn={() => setHover(true)} onHoverOut={() => setHover(false)} testID={`quiz-choice-${index}`}
    style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: phone ? 52 : undefined, paddingVertical: 13, paddingHorizontal: 14, borderWidth: 1, borderRadius: 11, borderColor: border, backgroundColor: bg }}>
    <View style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: c.sunken, alignItems: "center", justifyContent: "center" }}><T size={12.2} mono tone="muted" style={{ lineHeight: 16 }}>{index + 1}</T></View>
    <Text selectable style={{ flex: 1, color: c.text, fontSize: 16, lineHeight: 24, fontFamily: fonts.serif }}>{text}</Text>
  </Pressable>;
}
function Verdict({ pass, children }: { pass: boolean; children: React.ReactNode }) {
  const c = useContext(Theme);
  return <View accessibilityRole="alert" style={{ gap: 4, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1, borderColor: pass ? c.goodLine : c.errorLine, backgroundColor: pass ? c.goodSoft : c.errorSoft }}>{children}</View>;
}
function NavButton({ title, label, phone, primary = false, disabled, onPress, testID }: { title: string; label: string; phone: boolean; primary?: boolean; disabled: boolean; onPress: () => void; testID?: string }) {
  const c = useContext(Theme);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} testID={testID}
    style={[{ flex: phone ? 1 : undefined, minWidth: 74, minHeight: phone ? 50 : 44, alignItems: "center", justifyContent: "center", borderRadius: 11, borderWidth: 1, borderColor: primary ? "transparent" : c.border, backgroundColor: primary ? c.accent : c.raised, opacity: disabled ? 0.35 : 1 }, primary ? primaryFill(c) : null]}>
    <T size={16.8} weight="700" style={{ color: primary ? c.onAccent : c.text }}>{title}</T>
  </Pressable>;
}

/** Study and usage-quiz session in the Japanese Companion layout: top bar, word tiles on PC or a sheet on phones, bottom navigator and a save step. */
export function SessionScreen({ libraryApi, start, progress, isPhone, busy, error, onSave, onClose }: {
  libraryApi: LibraryApi; start: SessionStart; progress: Progress; isPhone: boolean; busy: boolean; error: string;
  onSave: (results: Record<string, StudyResult>) => void; onClose: () => void;
}) {
  const c = useContext(Theme);
  const { width: viewport } = useWindowDimensions();
  const quizList = quizWords(start.words);
  const [phase, setPhase] = useState<Phase>(start.review ? "quiz" : "study");
  const [indexes, setIndexes] = useState({ study: 0, quiz: 0 });
  const [orders] = useState(() => Object.fromEntries(quizList.map((word) => [word.id, sentenceOrder()])));
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Record<string, StudyResult>>({});
  const [wordNote, setWordNote] = useState<string | null>(null);
  const [meaning, setMeaning] = useState(true);
  const [example, setExample] = useState(true);
  const [panel, setPanel] = useState<"items" | "hide">("items");
  const [sheet, setSheet] = useState(false);
  const list = phase === "quiz" ? quizList : start.words;
  const index = phase === "quiz" ? indexes.quiz : indexes.study;
  const word = phase === "done" ? null : list[index] ?? null;
  const result = word ? results[word.id] : undefined;
  const setIndex = (next: number) => setIndexes((previous) => ({ ...previous, [phase === "quiz" ? "quiz" : "study"]: Math.max(0, Math.min(list.length - 1, next)) }));
  const choose = (original: number) => { if (!word?.quiz || result) return; setChosen((previous) => ({ ...previous, [word.id]: original })); setResults((previous) => ({ ...previous, [word.id]: grade(word, original) })); };
  const canNext = phase === "study" || (phase === "quiz" && !!result);
  const next = () => {
    if (phase === "study") { if (index < list.length - 1) setIndex(index + 1); else if (quizList.length) setPhase("quiz"); else onClose(); }
    else if (phase === "quiz" && result) { if (index < list.length - 1) setIndex(index + 1); else setPhase("done"); }
  };
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onKey = (event: KeyboardEvent) => {
      const node = event.target as HTMLElement | null;
      if (event.altKey || event.ctrlKey || event.metaKey || (node && ["INPUT", "TEXTAREA"].includes(node.tagName))) return;
      if (event.key === "ArrowLeft" && index > 0) { event.preventDefault(); setIndex(index - 1); }
      else if (event.key === "ArrowRight" && canNext) { event.preventDefault(); next(); }
      else if (phase === "quiz" && word && /^[1-4]$/.test(event.key)) { event.preventDefault(); choose(orders[word.id][Number(event.key) - 1]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const wordSize = Math.max(38, Math.min(60, viewport * 0.11));
  const pass = Object.values(results).filter((value) => value === "PASS").length;
  const graded = Object.keys(results).length;
  const last = progress;

  const noteControl = word && (phase === "study" || Boolean(result)) ? <Btn title="뜻과 내 메모" onPress={() => setWordNote(word.word)} /> : null;

  const tiles = <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
    {list.map((entry, position) => {
      const active = position === index && phase !== "done";
      const state = results[entry.id];
      return <Pressable key={entry.id} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={entry.word} onPress={() => { setIndex(position); setSheet(false); }}
        style={{ flexBasis: 96, flexGrow: 1, alignItems: "center", gap: 3, paddingVertical: 9, paddingHorizontal: 6, borderWidth: 1, borderRadius: 7, borderColor: active ? c.accent : state === "PASS" ? c.goodLine : state === "FAIL" ? c.errorLine : c.border, backgroundColor: active ? c.soft : c.raised }}>
        <T size={16} serif numberOfLines={1}>{entry.word}</T>
        <T size={9.9} mono tone="dim">{entry.id}</T>
      </Pressable>;
    })}
  </View>;
  const body = <>
    {word && phase === "study" && <WordCard>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", alignItems: "center" }}>
        <IdChip id={word.id} />{last[word.id]?.lastResult === "PASS" && <Chip tone="pass">지난 정답</Chip>}{last[word.id]?.lastResult === "FAIL" && <Chip tone="fail">지난 오답</Chip>}
      </View>
      <Text selectable style={{ color: c.text, fontSize: wordSize, lineHeight: wordSize * 1.25, fontFamily: fonts.serif, textAlign: "center" }}>{word.word}</Text>
      {meaning && <T size={16.3} tone="muted" selectable style={{ textAlign: "center" }}>{word.meaning}</T>}
      {example && <Text selectable style={{ color: c.text, fontSize: 17, lineHeight: 28, fontFamily: fonts.serif, fontStyle: "italic", textAlign: "center", maxWidth: 560 }}>{word.example}</Text>}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", alignItems: "center" }}><Switch on={meaning} onToggle={() => setMeaning(!meaning)} label="뜻" /><Switch on={example} onToggle={() => setExample(!example)} label="예문" /></View>
      {noteControl}
    </WordCard>}
    {word?.quiz && phase === "quiz" && <>
      <View style={{ flexDirection: "row" }}><IdChip id={word.id} /></View>
      <View style={{ alignItems: "center", gap: 6, paddingVertical: 20, paddingHorizontal: 18, borderWidth: 1, borderColor: c.border, borderRadius: 16, backgroundColor: c.panel }}>
        <Text selectable style={{ color: c.text, fontSize: Math.min(44, wordSize * 0.8), fontFamily: fonts.serif }}>{word.word}</Text>
        <T size={13.1} tone="muted">알맞은 의미로 쓰인 문장을 고르세요.</T>
      </View>
      <QuizMemo key={word.id} />
      <View style={{ gap: 8 }}>{orders[word.id].map((original, position) => <Choice key={original} index={position} text={word.quiz!.sentences[original]} phone={isPhone} disabled={!!result} selected={chosen[word.id] === original}
        state={result ? (original === word.quiz!.answer ? "correct" : chosen[word.id] === original ? "wrong" : undefined) : undefined} onPress={() => choose(original)} />)}</View>
      {result && <Verdict pass={result === "PASS"}><T size={14.4} weight="600" style={{ color: result === "PASS" ? c.good : c.error }}>{result === "PASS" ? "정답입니다." : "오답입니다."}</T><T size={13.4} tone="muted" selectable>뜻: {word.meaning}</T></Verdict>}
    </>}
    {phase === "done" && <WordCard>
      <T serif size={41.6} style={{ lineHeight: 52, color: c.accent }}>{graded && pass === graded ? "Perfect" : "Done"}</T>
      <T size={16.3} tone="muted" style={{ textAlign: "center" }}>정답 {pass} / {graded}</T>
      <T size={13.1} tone="dim" style={{ textAlign: "center" }}>저장을 누르면 계정의 진도와 복습 일정에 반영됩니다.</T>
      {!!error && <T size={13.4} tone="error" style={{ textAlign: "center" }}>{error}</T>}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        <Btn variant="primary" title={busy ? "저장 중…" : "결과 저장"} disabled={busy || !graded} onPress={() => onSave(results)} testID="result-save" />
        <Btn variant="ghost" title="저장하지 않고 목록으로" disabled={busy} onPress={onClose} />
      </View>
    </WordCard>}
    {!list.length && phase !== "done" && <Empty>이 Unit에는 아직 단어가 없습니다.</Empty>}
  </>;
  const split = !isPhone && panel === "items" && phase !== "done";
  return <View style={{ flex: 1, backgroundColor: c.bg }}>
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderColor: c.border, backgroundColor: c.header }}>
      <Btn size="icon" title="←" label="세션 닫기" disabled={busy} onPress={onClose} testID="back-home" />
      <View style={{ minWidth: 0, flexShrink: 1 }}>
        <T size={14.7} weight="700" numberOfLines={1}>{start.title}</T>
        <T size={11.4} mono tone="dim">{phase === "done" ? "-" : index + 1}/{list.length} · {start.review ? "복습" : "학습"} · {phase === "study" ? "단어" : phase === "quiz" ? "문제" : "완료"}</T>
      </View>
      <View style={{ flex: 1 }} />
      {!start.review && <Btn title={phase === "quiz" ? "학습" : "문제"} label={phase === "quiz" ? "학습으로" : "문제로"} disabled={phase === "done" || !quizList.length} onPress={() => setPhase(phase === "quiz" ? "study" : "quiz")} />}
      {isPhone ? <Btn size="icon" title="▦" label="단어 목록" disabled={phase === "done"} onPress={() => setSheet(true)} />
        : <Segment options={[{ key: "items", label: "목록" }, { key: "hide", label: "숨김" }]} value={panel} onChange={(key) => setPanel(key as "items" | "hide")} />}
    </View>
    <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ paddingTop: isPhone ? 14 : 18, paddingHorizontal: isPhone ? 14 : 16, paddingBottom: isPhone ? 8 : 12 }}>
      {split ? <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 16, width: "100%", maxWidth: 1320, alignSelf: "center" }}>
        <View style={{ flex: 1, minWidth: 0, gap: 14 }}>{body}</View>
        <View style={{ width: 340, maxWidth: "45%", gap: 12, padding: 14, borderWidth: 1, borderColor: c.border, borderRadius: 16, backgroundColor: c.panel }}><T size={14.7} weight="700">{start.title} 목록</T>{tiles}</View>
      </View> : <View style={{ width: "100%", maxWidth: 720, alignSelf: "center", gap: 14 }}>{body}</View>}
    </ScrollView>
    {phase !== "done" && <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 16, borderTopWidth: 1, borderColor: c.border, backgroundColor: c.header }}>
      <NavButton label="이전" title="←" phone={isPhone} disabled={index === 0} onPress={() => setIndex(index - 1)} />
      {!isPhone && <View style={{ flex: 1 }} />}
      <NavButton label="다음" title="→" phone={isPhone} primary disabled={!canNext} onPress={next} testID={phase === "quiz" ? "quiz-next" : "study-next"} />
    </View>}
    {sheet && <Sheet title={`${start.title} 목록`} onClose={() => setSheet(false)}>{tiles}</Sheet>}
  {wordNote && <WordLookup key={wordNote} api={libraryApi} word={wordNote} onClose={() => setWordNote(null)} />}</View>;
}
