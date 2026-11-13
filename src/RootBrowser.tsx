import React, { useState } from 'react';
import { View } from 'react-native';
import { Btn, Card, T } from './ui';
import { WordLookup } from './ReadingLibrary';
import { groupWordsByRoot } from './englishImport';
import type { LibraryApi, LibraryWord } from './readingWords';

/** Browse stored etymological roots across books without inferring roots from spelling. */
export function RootBrowser({ api, words }: { api: LibraryApi; words: LibraryWord[] }) {
  const groups = groupWordsByRoot(words);
  const [root, setRoot] = useState<string | null>(null);
  const [word, setWord] = useState<string | null>(null);
  return <Card title="어근별 단어" hint={`${groups.size}개 어근`}><View style={{ gap: 10 }}>
    {groups.size ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{[...groups].map(([key, entries]) => <Btn key={key} title={`${key} · ${entries.length}`} selected={root === key} onPress={() => setRoot(root === key ? null : key)} />)}</View> : <T tone="muted">등록된 어근이 없습니다. 가져오기 또는 편집에서 어근을 추가하세요.</T>}
    {root && <View style={{ gap: 6 }}>{(groups.get(root) ?? []).map(entry => <Btn key={entry.word} title={`${entry.word} · ${entry.meaning}`} onPress={() => setWord(entry.word)} />)}</View>}
    {word && <WordLookup key={word} api={api} word={word} onClose={() => setWord(null)} />}
  </View></Card>;
}
