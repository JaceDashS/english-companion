import React from "react";
import { Text, View } from "react-native";
import type { StudyResult } from "../api/types";
import { Button, styles } from "../ui";

/** Session score and an explicit save that writes progress to the account. */
export function ResultScreen({
  results,
  busy,
  error,
  onSave,
  onDiscard,
}: {
  results: Record<string, StudyResult>;
  busy: boolean;
  error: string;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const values = Object.values(results);
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>학습 결과</Text>
      <Text style={styles.text}>
        정답 {values.filter((r) => r === "PASS").length} / {values.length}
      </Text>
      <Text style={styles.muted}>저장을 누르면 계정의 진도와 복습 일정에 반영됩니다.</Text>
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <Button title={busy ? "저장 중…" : "결과 저장"} variant="primary" disabled={busy} onPress={onSave} testID="result-save" />
      <Button title="저장하지 않고 목록으로" variant="ghost" disabled={busy} onPress={onDiscard} />
    </View>
  );
}
