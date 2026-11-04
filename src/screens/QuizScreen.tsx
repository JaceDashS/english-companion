import React, { useState } from "react";
import { Text, View } from "react-native";
import type { StudyResult } from "../api/types";
import type { EnglishWord } from "../content/content";
import { grade, sentenceOrder } from "../domain/study";
import { Button, colors, Field, styles } from "../ui";

/** One-line scratch memo for the current question; never saved and recreated empty for each question. */
function QuizMemo() {
  const [memo, setMemo] = useState("");
  return <Field label="메모 (저장되지 않음)" value={memo} onChangeText={setMemo} spellCheck={false} testID="quiz-memo" />;
}

/**
 * Usage quiz: the word, a scratch memo, then four sentences using the word. The learner picks the sentence
 * that uses it in the intended sense. Results are reported once every word has been answered.
 */
export function QuizScreen({ title, words, onFinish, onBack }: { title: string; words: EnglishWord[]; onFinish: (results: Record<string, StudyResult>) => void; onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const [orders] = useState(() => Object.fromEntries(words.map((word) => [word.id, sentenceOrder()])));
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Record<string, StudyResult>>({});
  const word = words[index];
  const quiz = word.quiz!;
  const result = results[word.id];
  const last = index === words.length - 1;

  return (
    <>
      <View style={styles.row}>
        <Button title="목록" variant="ghost" onPress={onBack} />
        <Text style={styles.heading}>{title}</Text>
      </View>
      <Text style={styles.muted}>
        문제 {index + 1} / {words.length}
      </Text>
      <View style={styles.card}>
        <Text selectable style={styles.title}>
          {word.word}
        </Text>
        <Text style={styles.muted}>알맞은 의미로 쓰인 문장을 고르세요.</Text>
        <QuizMemo key={word.id} />
        {orders[word.id].map((original, position) => (
          <Button
            key={original}
            title={`${position + 1}. ${quiz.sentences[original]}`}
            selected={chosen[word.id] === original}
            disabled={!!result}
            onPress={() => setChosen((prev) => ({ ...prev, [word.id]: original }))}
            testID={`quiz-choice-${position}`}
          />
        ))}
        {result ? (
          <View style={{ gap: 6 }}>
            <Text style={[styles.heading, { color: result === "PASS" ? colors.pass : colors.fail }]}>{result === "PASS" ? "정답입니다." : "오답입니다."}</Text>
            <Text selectable style={styles.text}>
              정답: {quiz.sentences[quiz.answer]}
            </Text>
            <Text selectable style={styles.muted}>
              뜻: {word.meaning}
            </Text>
          </View>
        ) : (
          <Button
            title="정답 확인"
            variant="primary"
            disabled={chosen[word.id] === undefined}
            onPress={() => setResults((prev) => ({ ...prev, [word.id]: grade(word, chosen[word.id]) }))}
            testID="quiz-check"
          />
        )}
      </View>
      <View style={styles.row}>
        <Button title="이전" disabled={index === 0} onPress={() => setIndex((i) => i - 1)} />
        {last ? (
          <Button title="결과 보기" variant="primary" disabled={Object.keys(results).length !== words.length} onPress={() => onFinish(results)} testID="quiz-finish" />
        ) : (
          <Button title="다음" variant="primary" disabled={!result} onPress={() => setIndex((i) => i + 1)} testID="quiz-next" />
        )}
      </View>
    </>
  );
}
