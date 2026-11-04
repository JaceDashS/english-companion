import React, { useState } from "react";
import { Text, View } from "react-native";
import type { EnglishUnit } from "../content/content";
import { quizWords } from "../domain/study";
import { Button, styles } from "../ui";

/** Word cards with meaning and example, one at a time, followed by the unit's usage quiz. */
export function StudyScreen({ unit, onQuiz, onBack }: { unit: EnglishUnit; onQuiz: () => void; onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const word = unit.words[index];
  const last = index === unit.words.length - 1;
  const canQuiz = quizWords(unit.words).length > 0;
  return (
    <>
      <View style={styles.row}>
        <Button title="목록" variant="ghost" onPress={onBack} />
        <Text style={styles.heading}>{unit.title}</Text>
      </View>
      <Text style={styles.muted}>
        학습 {index + 1} / {unit.words.length}
      </Text>
      <View style={styles.card}>
        <Text selectable style={styles.title}>
          {word.word}
        </Text>
        <Text selectable style={styles.text}>
          {word.meaning}
        </Text>
        <Text selectable style={[styles.text, { fontStyle: "italic" }]}>
          {word.example}
        </Text>
      </View>
      <View style={styles.row}>
        <Button title="이전" disabled={index === 0} onPress={() => setIndex((i) => i - 1)} />
        {last ? (
          <Button title={canQuiz ? "문제 풀기" : "목록으로"} variant="primary" onPress={canQuiz ? onQuiz : onBack} testID="study-quiz" />
        ) : (
          <Button title="다음" variant="primary" onPress={() => setIndex((i) => i + 1)} testID="study-next" />
        )}
      </View>
    </>
  );
}
