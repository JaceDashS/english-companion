import React, { useState } from 'react';
import { View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Btn, Input, Sheet, T } from './ui';
import { buildEnglishImportPrompt } from './englishImport';
import type { LibraryApi, LibraryBook } from './readingWords';

/** Copy a generator prompt and validate the generated JSON on the server before adding any data. */
export function VocabularyImport({ api, book, usedExamples, onClose, onSaved }: { api: LibraryApi; book: LibraryBook; usedExamples: Record<string, string[]>; onClose: () => void; onSaved: () => void }) {
  const [payload, setPayload] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const run = async (work: () => Promise<void>) => {
    if (busy) return; setBusy(true); setMessage('');
    try { await work(); } catch (error) { setMessage(error instanceof Error ? error.message : '처리하지 못했습니다.'); }
    finally { setBusy(false); }
  };
  return <Sheet title={`${book.title} · 단어와 문제 가져오기`} onClose={() => { if (!busy) onClose(); }}><View style={{ gap: 12 }}>
    <T>프롬프트를 복사해 AI에 보낸 뒤 단어 목록을 보내세요. 받은 결과를 붙여 넣으면 단어·어근·제공 예문·문제 세트를 함께 가져옵니다.</T>
    <T size={12} tone="dim">보충할 때도 같은 버튼을 사용하세요. 이미 쓴 문제 예문은 다시 출제하지 않습니다. 내 예문은 변경되지 않습니다.</T>
    <Btn title="프롬프트 복사" disabled={busy} onPress={() => void run(async () => { await Clipboard.setStringAsync(buildEnglishImportPrompt(book, usedExamples)); setMessage('프롬프트를 복사했습니다.'); })} />
    <Btn title="클립보드에서 붙여넣기" disabled={busy} onPress={() => void run(async () => setPayload(await Clipboard.getStringAsync()))} />
    <Input multiline label="AI 결과 붙여넣기" placeholder="받은 JSON을 붙여 넣으세요." value={payload} onChangeText={setPayload} />
    <Btn title={busy ? '처리 중…' : '가져오기'} disabled={busy || !payload.trim()} onPress={() => void run(async () => {
      const { result } = await api<{ result: { added: number; updated: number; setsAdded: number } }>('library/import', { bookId: book.id, payload });
      setMessage(`새 단어 ${result.added}개 · 기존 단어 ${result.updated}개 · 새 문제 ${result.setsAdded}세트`); setPayload(''); onSaved();
    })} />
    {!!message && <T>{message}</T>}
  </View></Sheet>;
}
