import { ReadingLibrary } from "../ReadingLibrary";
import type { LibraryApi } from "../readingWords";
import React from "react";
import { ScrollView, View } from "react-native";
import type { Progress } from "../api/types";
import type { EnglishBook, EnglishUnit } from "../content/content";
import { BookSelect } from "../BookSelect";
import { buildQueue, buildUnitRows, stageBuckets, type UnitRow } from "../domain/dashboard";
import { Card, Empty, layout, T } from "../ui";
import { ProgressPanel, RecentUnits, StageChart, Stats, UnitCard, UnitGrid } from "./Dashboard";

export type HomeTab = "today" | "days" | "progress";

/** Today, Unit and progress tabs in the Japanese Companion composition, built from bundled units and account progress. */
export function HomeScreen({ libraryApi, onLibraryChanged, books, bookId, onBookChange, units, progress, today, desktop, tab, onStudy, onReview }: {
  libraryApi: LibraryApi; onLibraryChanged: () => void; books: EnglishBook[]; bookId: string; onBookChange: (id: string) => void; units: EnglishUnit[]; progress: Progress; today: string; desktop: boolean; tab: HomeTab;
  onStudy: (row: UnitRow) => void; onReview: (row: UnitRow) => void;
}) {
  const phone = !desktop;
  const selectedBook = books.find(book => book.id === bookId) ?? books[0];
  const visibleUnits = phone ? selectedBook?.units ?? [] : units;
  const rows = buildUnitRows(visibleUnits, progress, today);
  const { reviews, learning } = buildQueue(rows);
  const failTotal = rows.reduce((sum, row) => sum + row.failCount, 0);
  const queue = <View style={{ gap: 10 }}>
    {reviews.map(row => <UnitCard key={"r:" + row.unit.id} title={row.unit.title} tone="review" chip={row.failCount > 0 ? "복습・실패" : "복습"} chipTone={row.failCount > 0 ? "fail" : "review"} meta={[`대상 ${row.dueWords.length}개`, `학습 ${row.started}/${row.total}`]} onPress={() => onReview(row)} />)}
    {learning.map(row => <UnitCard key={"l:" + row.unit.id} title={row.unit.title} tone="learning" chip="학습" chipTone="learning" meta={[`Unit ${row.position}`, `전체 ${row.position}/${rows.length}`, `신규 ${row.total - row.started}개`]} onPress={() => onStudy(row)} />)}
    {!reviews.length && !learning.length && <T size={13.1} tone="muted">{rows.length ? "오늘 몫을 모두 끝냈습니다. 내일 다시 만나요." : "단어가 추가되면 이곳에 오늘의 학습이 표시됩니다."}</T>}
  </View>;
  const stats = <Stats phone={phone} items={[
    { accent: "info", label: "오늘 복습", value: `${reviews.length}개`, hint: reviews.length ? `단어 ${reviews.reduce((sum, row) => sum + row.dueWords.length, 0)}개` : "예정 없음" },
    { accent: "good", label: "오늘 신규", value: `${learning.length}개`, hint: learning.length ? `단어 ${learning.reduce((sum, row) => sum + row.total - row.started, 0)}개` : "모두 시작함" },
    { accent: "accent", label: "시작한 Unit", value: `${rows.filter(row => row.started > 0).length}/${rows.length}`, hint: `졸업 ${rows.filter(row => row.graduated).length}개` },
    { accent: "warn", label: "다시 볼 단어", value: `${failTotal}개`, hint: failTotal ? "복습에서 다시 나옵니다" : "오답 없음" },
  ]} />;
  const chart = <StageChart stages={stageBuckets(visibleUnits, progress)} />;
  const recent = <RecentUnits rows={rows} today={today} onOpen={onStudy} />;
  const wordCount = rows.reduce((sum, row) => sum + row.total, 0);

  let content: React.ReactNode;
  if (tab === "days") content = <Card title="Unit 선택" hint={`${rows.length}개`}><UnitGrid rows={rows} phone={phone} onOpen={onStudy} /></Card>;
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
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={phone ? layout.phoneBody : layout.body}>
    <ReadingLibrary api={libraryApi} language="en" allowVocabulary onChanged={onLibraryChanged} />{phone && <BookSelect books={books} value={selectedBook?.id ?? ""} onChange={onBookChange} />}{content}
  </ScrollView>;
}
