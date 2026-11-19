import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { BookSelect } from './BookSelect';
import { Btn, Input, Sheet, T } from './ui';
import { buildEnglishImportPrompt } from './englishImport';
import type { LibraryApi, LibraryBook } from './readingWords';

const NEW = '__new__';
type ImportResult = { bookId: string; added: number; updated: number; setsAdded: number };

/** Add words to a vocabulary, or to a new one, from generated JSON validated on the server. */
export function VocabularyImport({ api, books, bookId, usedExamples, onClose, onSaved }: { api: LibraryApi; books: LibraryBook[]; bookId: string; usedExamples: Record<string, string[]>; onClose: () => void; onSaved: (result: ImportResult, created: boolean, title: string) => void }) {
  const [target, setTarget] = useState(books.some(book => book.id === bookId) ? bookId : NEW);
  const [title, setTitle] = useState('');
  const [payload, setPayload] = useState('');
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [message, setMessage] = useState('');
  const book = books.find(entry => entry.id === target);
  const run = async (work: () => Promise<void>) => {
    if (working.current) return;
    working.current = true;
    setBusy(true); setMessage('');
    try { await work(); } catch (error) { setMessage(error instanceof Error ? error.message : '처리하지 못했습니다.'); }
    finally { working.current = false; setBusy(false); }
  };
  return <Sheet title="단어 추가" onClose={() => { if (!working.current) onClose(); }}><View style={{ gap: 12 }}>
    <T size={13} tone="muted">1. 프롬프트를 복사해 외부 AI에 보냅니다. 2. 단어 목록을 형식 없이 보냅니다. 3. AI 응답의 JSON 코드 블록 내용을 복사해 붙여 넣습니다. 남은 단어가 있으면 AI에게 ‘다음’이라고 입력합니다.</T>
    <BookSelect label="넣을 단어장" books={[...books.map(entry => ({ id: entry.id, title: entry.title })), { id: NEW, title: '새 단어장 만들기' }]} value={target} onChange={setTarget} />
    {target === NEW && <Input label="새 단어장 이름" value={title} onChangeText={setTitle} placeholder="단어장 이름" />}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Btn title="프롬프트 복사" disabled={busy} onPress={() => void run(async () => { await Clipboard.setStringAsync(buildEnglishImportPrompt(book ?? { id: '', title: title || '새 단어장', kind: 'vocabulary', body: '', words: [] }, usedExamples)); setMessage('프롬프트를 복사했습니다.'); })} />
      <Btn title="클립보드에서 붙여넣기" disabled={busy} onPress={() => void run(async () => setPayload(await Clipboard.getStringAsync()))} />
    </View>
    <Input multiline label="단어 JSON" placeholder='{ "format": "jace-s.english-words", ... }' value={payload} onChangeText={setPayload} />
    <T size={12} tone="dim">같은 단어장에 이미 있는 단어는 새로 만들지 않고 새 문제 세트만 보충합니다. 내 메모는 바뀌지 않습니다.</T>
    <Btn variant="primary" title={busy ? '처리 중…' : '추가하기'} disabled={busy || !payload.trim() || (target === NEW && !title.trim())} onPress={() => void run(async () => {
      const created = target === NEW;
      const { result } = await api<{ result: ImportResult }>('library/import', created ? { title: title.trim(), payload } : { bookId: target, payload });
      onSaved(result, created, created ? title.trim() : book?.title ?? '');
    })} />
    {!!message && <T>{message}</T>}
  </View></Sheet>;
}
