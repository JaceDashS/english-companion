import { RootBrowser } from "../RootBrowser";
import { BookSelect } from "../BookSelect";
import { Bookshelf, type ReadingLibraryModel } from "../ReadingLibrary";
import { VocabularyImport } from "../VocabularyImport";
import type { HeaderSection } from "../Chrome";
import type { LibraryApi } from "../readingWords";
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import type { Progress } from "../api/types";
import type { EnglishBook, EnglishUnit, EnglishWord } from "../content/content";
import { buildQueue, buildUnitRows, stageBuckets, WORDS_PER_DAY, type UnitRow } from "../domain/dashboard";
import { remainingNewWords } from "../domain/study";
import { Btn, Card, Empty, layout, T } from "../ui";
import { ProgressPanel, RecentUnits, StageChart, Stats, UnitCard, UnitGrid } from "./Dashboard";

export type HomeTab = "today" | "days" | "progress";

/** Today, Unit and progress tabs in the Japanese Companion composition, built from bundled units and account progress. */
export function HomeScreen({ libraryApi, library, section, notify, books, bookId, onBookChange, onImportComplete, units, progress, today, desktop, tab, dailyNewDays = 1, onStudy, onReview }: {
  libraryApi: LibraryApi; library: ReadingLibraryModel; section: HeaderSection; notify: (text: string, tone?: string) => void; books: EnglishBook[]; bookId: string; onBookChange: (id: string) => void; units: EnglishUnit[]; progress: Progress; today: string; desktop: boolean; tab: HomeTab; dailyNewDays?: number;
  onStudy: (row: UnitRow, words?: EnglishWord[]) => void; onReview: (row: UnitRow) => void;
  onImportComplete: (title: string, detail: string) => void;
}) {
  const [importing, setImporting] = useState(false);
  const phone = !desktop;
  const selectedBook = books.find(book => book.id === bookId) ?? books[0];
  const visibleUnits = selectedBook?.units ?? [];
  const rows = buildUnitRows(visibleUnits, progress, today);
  const remaining = remainingNewWords(progress, today, dailyNewDays * WORDS_PER_DAY);
  const { reviews, learning } = buildQueue(rows, progress, remaining);
  const newCount = learning.reduce((sum, item) => sum + item.words.length, 0);
  const failTotal = rows.reduce((sum, row) => sum + row.failCount, 0);
  const queue = <View style={{ gap: 10 }}>
    {reviews.map(row => <UnitCard key={"r:" + row.unit.id} title={row.unit.title} tone="review" chip={row.failCount > 0 ? "복습・실패" : "복습"} chipTone={row.failCount > 0 ? "fail" : "review"} meta={[`대상 ${row.dueWords.length}개`, `학습 ${row.started}/${row.total}`]} onPress={() => onReview(row)} />)}
    {learning.map(({ row, words }) => <UnitCard key={"l:" + row.unit.id} title={row.unit.title} tone="learning" chip="학습" chipTone="learning" meta={[`신규 ${words.length}개`, `전체 ${row.position}/${rows.length}`]} onPress={() => onStudy(row, words)} />)}
    {!reviews.length && !learning.length && <T size={13.1} tone="muted">{rows.length ? "오늘 몫을 모두 끝냈습니다. 내일 다시 만나요." : "단어가 추가되면 이곳에 오늘의 학습이 표시됩니다."}</T>}
  </View>;
  const stats = <Stats phone={phone} items={[
    { accent: "info", label: "오늘 복습", value: `${reviews.length}개`, hint: reviews.length ? `단어 ${reviews.reduce((sum, row) => sum + row.dueWords.length, 0)}개` : "예정 없음" },
    { accent: "good", label: "오늘 신규", value: `${learning.length}개`, hint: learning.length ? `단어 ${newCount}개` : "오늘 몫 완료" },
    { accent: "accent", label: "시작한 Day", value: `${rows.filter(row => row.started > 0).length}/${rows.length}`, hint: `졸업 ${rows.filter(row => row.graduated).length}개` },
    { accent: "warn", label: "다시 볼 단어", value: `${failTotal}개`, hint: failTotal ? "복습에서 다시 나옵니다" : "오답 없음" },
  ]} />;
  const chart = <StageChart stages={stageBuckets(visibleUnits, progress)} />;
  const recent = <RecentUnits rows={rows} today={today} onOpen={onStudy} />;
  const wordCount = rows.reduce((sum, row) => sum + row.total, 0);

  let content: React.ReactNode;
  if (tab === "days") content = <Card title="Day 선택" hint={`${rows.length}개`}><UnitGrid rows={rows} phone={phone} onOpen={onStudy} /></Card>;
  else if (tab === "progress") content = <Card title="전체 진행률">{rows.length ? <ProgressPanel rows={rows} /> : <Empty>단어가 추가되면 진행률이 표시됩니다.</Empty>}</Card>;
  else if (phone) content = <>
    {stats}
    <Card title="오늘 할 학습" hint={`복습 ${reviews.length} · 신규 ${learning.length}`}>{queue}</Card>
    <Card title="복습 단계 분포" hint={`단어 ${wordCount}개`}>{chart}</Card>
    <Card title="최근 학습">{recent}</Card>
  </>;
  else content = <>
    <View style={{ minWidth: 0 }}><T size={21.6} serif weight="700" style={{ lineHeight: 30 }}>오늘 할 학습</T><T size={13.1} tone="muted" style={{ marginTop: 5 }}>{today} · 복습 {reviews.length}개 · 신규 {learning.length}개</T></View>
    {stats}
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 16 }}>
      <View style={{ flex: 1.25, minWidth: 0 }}><Card title="학습 대기열" hint={`${reviews.length + learning.length}건`}>{queue}</Card></View>
      <View style={{ flex: 0.75, minWidth: 300, gap: 14 }}>
        <Card title="복습 단계 분포" hint={`단어 ${wordCount}개`}>{chart}</Card>
        <Card title="진행률">{rows.length ? <ProgressPanel rows={rows} /> : <Empty>단어가 추가되면 진행률이 표시됩니다.</Empty>}</Card>
        <Card title="최근 학습">{recent}</Card>
      </View>
    </View>
  </>;
  const select = <BookSelect label="단어장" books={books.map(book => ({ id: book.id, title: book.title }))} value={selectedBook?.id ?? ""} onChange={onBookChange} />;
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={phone ? layout.phoneBody : layout.body}>
    {section === "bookshelf" ? <Bookshelf library={library} api={libraryApi} language="en" notify={notify} /> : <>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0 }}>{select}</View>
        <Btn title="단어장 관리" onPress={() => setImporting(true)} testID="manage-vocab" style={{ minHeight: 44 }} />
      </View>
      {content}
      <RootBrowser api={libraryApi} words={visibleUnits.flatMap(unit => unit.words)} />
    </>}
    {importing && <VocabularyImport api={libraryApi} books={(library.books ?? []).filter(book => book.kind === "vocabulary")} usedExamples={library.usedExamples} notify={notify} onReload={library.reload} onSelectBook={onBookChange} onImportComplete={onImportComplete} onClose={() => setImporting(false)} />}
  </ScrollView>;
}
