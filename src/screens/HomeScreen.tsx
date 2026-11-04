import React from "react";
import { Text, View } from "react-native";
import type { Progress } from "../api/types";
import type { EnglishUnit, EnglishWord } from "../content/content";
import { dueWords, summarizeUnit } from "../domain/study";
import { Button, styles } from "../ui";

/** Unit list with progress counts and a review entry for words whose review date has arrived. */
export function HomeScreen({
  units,
  progress,
  today,
  onStudy,
  onReview,
}: {
  units: EnglishUnit[];
  progress: Progress;
  today: string;
  onStudy: (unit: EnglishUnit) => void;
  onReview: (words: EnglishWord[]) => void;
}) {
  const due = dueWords(units, progress, today);
  if (!units.length) {
    return (
      <View style={styles.card}>
        <Text style={styles.heading}>아직 단어가 없습니다.</Text>
        <Text style={styles.muted}>학습 내용이 추가되면 여기에 단원이 표시됩니다.</Text>
      </View>
    );
  }
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.heading}>오늘 복습</Text>
        <Text style={styles.text}>{due.length ? `복습할 단어 ${due.length}개` : "오늘 복습할 단어가 없습니다."}</Text>
        <Button title="복습 시작" variant="primary" disabled={!due.length} onPress={() => onReview(due)} testID="review-start" />
      </View>
      {units.map((unit) => {
        const summary = summarizeUnit(unit, progress, today);
        return (
          <View key={unit.id} style={styles.card}>
            <Text style={styles.heading}>{unit.title}</Text>
            <Text style={styles.muted}>
              단어 {summary.total}개 · 학습 {summary.started}개 · 복습 대기 {summary.due}개
            </Text>
            <Button title="학습하기" disabled={!unit.words.length} onPress={() => onStudy(unit)} />
          </View>
        );
      })}
    </>
  );
}
