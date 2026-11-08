import React from "react";
import { Text, View } from "react-native";
import type { Progress } from "../api/types";
import type { EnglishUnit, EnglishWord } from "../content/content";
import { dueWords, summarizeUnit } from "../domain/study";
import { Button, colors, styles } from "../ui";

/** Responsive vocabulary dashboard with real progress and an actionable review queue. */
export function HomeScreen({ units, progress, today, desktop, onStudy, onReview }: {
  units: EnglishUnit[]; progress: Progress; today: string; desktop: boolean;
  onStudy: (unit: EnglishUnit) => void; onReview: (words: EnglishWord[]) => void;
}) {
  const due = dueWords(units, progress, today);
  const summaries = units.map(unit => ({ unit, summary: summarizeUnit(unit, progress, today) }));
  const total = summaries.reduce((sum, row) => sum + row.summary.total, 0);
  const started = summaries.reduce((sum, row) => sum + row.summary.started, 0);
  const ratio = total ? started / total : 0;
  return <>
    <View style={{ gap: 6, paddingVertical: 12 }}><Text style={{ color: colors.accent, fontSize: 12, fontWeight: "700", letterSpacing: 2 }}>DAILY PRACTICE</Text><Text style={styles.title}>오늘의 영어, 한 걸음 더.</Text><Text style={styles.muted}>{today} · 단어를 익히고, 문장으로 기억하세요.</Text></View>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {[{ label: "전체 단어", value: total }, { label: "학습한 단어", value: started }, { label: "오늘 복습", value: due.length }].map(item => <View key={item.label} style={[styles.card, { flexBasis: 130, flexGrow: 1 }]}><Text style={styles.muted}>{item.label}</Text><Text style={[styles.title, { color: colors.accent }]}>{item.value}</Text></View>)}
    </View>
    <View style={{ flexDirection: desktop ? "row" : "column", gap: 20, alignItems: "flex-start" }}>
      <View style={{ flex: desktop ? 1.65 : undefined, width: desktop ? undefined : "100%", minWidth: 0, gap: 14 }}>
        <View style={[styles.row, { justifyContent: "space-between", paddingVertical: 8 }]}><Text style={styles.heading}>학습 단원</Text><Text style={styles.muted}>{units.length} UNITS</Text></View>
        {!units.length && <View style={styles.card}><Text style={[styles.title, { color: colors.accent }]}>Aa</Text><Text style={styles.heading}>다음 학습을 준비하고 있어요.</Text><Text style={styles.muted}>단어가 추가되면 이곳에 학습 단원이 표시됩니다.</Text></View>}
        {summaries.map(({ unit, summary }, index) => <View key={unit.id} style={styles.card}>
          <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 12, letterSpacing: 1 }}>UNIT {String(index + 1).padStart(2, "0")}</Text>
          <Text style={styles.heading}>{unit.title}</Text><Text style={styles.muted}>단어 {summary.total}개 · 학습 {summary.started}개 · 복습 대기 {summary.due}개</Text>
          <ProgressBar ratio={summary.total ? summary.started / summary.total : 0} />
          <Button title="학습하기 →" disabled={!unit.words.length} onPress={() => onStudy(unit)} />
        </View>)}
      </View>
      <View style={{ flex: desktop ? 1 : undefined, width: desktop ? undefined : "100%", minWidth: 0, gap: 16 }}>
        <View style={[styles.card, { borderColor: colors.accent }]}><Text style={{ color: colors.accent, fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>READY TO REVIEW</Text><Text style={styles.heading}>오늘 복습</Text><Text style={styles.text}>{due.length ? `기억을 다질 단어 ${due.length}개가 기다려요.` : "오늘 복습할 단어가 없습니다."}</Text><Button title="복습 시작" variant="primary" disabled={!due.length} onPress={() => onReview(due)} testID="review-start" /></View>
        <View style={styles.card}><Text style={styles.heading}>나의 학습 진행률</Text><Text style={[styles.title, { color: colors.accent }]}>{Math.round(ratio * 100)}%</Text><ProgressBar ratio={ratio} /><Text style={styles.muted}>{total}개 중 {started}개 학습</Text></View>
        <View style={styles.card}><Text style={styles.heading}>작은 습관, 오래가는 기억.</Text><Text style={styles.muted}>단어의 뜻을 살펴보고 예문을 읽어 보세요. 문장 퀴즈로 쓰임을 확인하면 다음 복습으로 이어집니다.</Text></View>
      </View>
    </View>
  </>;
}

function ProgressBar({ ratio }: { ratio: number }) {
  const percent = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }} style={{ height: 7, borderRadius: 5, backgroundColor: colors.line, overflow: "hidden" }}><View style={{ height: "100%", width: `${percent}%`, borderRadius: 5, backgroundColor: colors.accent }} /></View>;
}
