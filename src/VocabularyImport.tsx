import React, { useContext, useRef, useState } from 'react';
import { View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { ActionDropdown } from './ActionDropdown';
import { importWordsFromClipboard, importWordsJson, type WordImportOutcome } from './bookImport';
import { WORDS_PER_DAY } from './domain/dashboard';
import { buildEnglishImportPrompt } from './englishImport';
import type { LibraryApi, LibraryBook } from './readingWords';
import { Btn, Empty, Input, Sheet, T, Theme } from './ui';

type ImportResult = { bookId: string; added: number; updated: number; setsAdded: number };
type View_ =
  | { kind: 'list' }
  | { kind: 'import'; book: LibraryBook }
  | { kind: 'words'; book: LibraryBook }
  | { kind: 'rename'; book: LibraryBook };

const DEFAULT_VOCABULARY_ID = 'example-words';
const dayCountOf = (wordsCount: number) => (wordsCount > 0 ? Math.ceil(wordsCount / WORDS_PER_DAY) : 0);

/** Manage English vocabularies and import word batches via clipboard or direct JSON input. */
export function VocabularyImport({
  api,
  books,
  usedExamples,
  notify,
  onReload,
  onSelectBook,
  onImportComplete,
  onClose,
}: {
  api: LibraryApi;
  books: LibraryBook[];
  usedExamples: Record<string, string[]>;
  notify: (text: string, tone?: string) => void;
  onReload: () => Promise<void>;
  onSelectBook: (bookId: string) => void;
  onImportComplete: (title: string, detail: string) => void;
  onClose: () => void;
}) {
  const c = useContext(Theme);
  const [view, setView] = useState<View_>({ kind: 'list' });
  const [title, setTitle] = useState('');
  const [payload, setPayload] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmWordId, setConfirmWordId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const activeBookIdRef = useRef('');
  const summaryRef = useRef<{ title: string; created: boolean; added: number; setsAdded: number } | null>(null);

  const run = async (work: () => Promise<void>) => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    try {
      await work();
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : '처리하지 못했습니다.');
    } finally {
      working.current = false;
      setBusy(false);
    }
  };

  const openImport = (book: LibraryBook) => {
    activeBookIdRef.current = book.id;
    setResult(null);
    setError('');
    setPayload('');
    setManualOpen(false);
    setView({ kind: 'import', book });
  };

  const handleCreateBook = () => {
    const trimmed = title.trim();
    if (!trimmed || working.current) return;
    setTitle('');
    setConfirmDeleteId(null);
    openImport({ id: '', title: trimmed, kind: 'vocabulary', body: '', words: [] });
  };

  const safeClose = () => {
    if (working.current) return;
    const summary = summaryRef.current;
    if (summary && (summary.added > 0 || summary.setsAdded > 0)) {
      const detail = [
        summary.title,
        summary.added ? `새 단어 ${summary.added}개` : '',
        summary.setsAdded ? `새 문제 ${summary.setsAdded}세트` : '',
      ].filter(Boolean).join(' · ');
      onImportComplete(summary.created ? '단어장 추가 완료' : '단어 가져오기 완료', detail);
    }
    onClose();
  };

  const resolveBook = (book: LibraryBook) => books.find((entry) => entry.id === book.id) ?? book;

  const submitBatch = async (raw: string, bookTitle: string) => {
    const targetId = activeBookIdRef.current;
    const response = await api<{ result: ImportResult }>(
      'library/import',
      targetId ? { bookId: targetId, payload: raw } : { title: bookTitle, payload: raw },
    );
    return response.result;
  };

  const applyImportOutcome = async (outcome: WordImportOutcome<ImportResult>, bookTitle: string) => {
    if (!outcome.ok) {
      setError(outcome.error);
      setPayload(outcome.text);
      if (outcome.openManual) setManualOpen(true);
      return;
    }
    const created = !activeBookIdRef.current;
    activeBookIdRef.current = outcome.result.bookId;
    const prev = summaryRef.current;
    summaryRef.current = {
      title: bookTitle,
      created: prev?.title === bookTitle ? prev.created || created : created,
      added: (prev?.title === bookTitle ? prev.added : 0) + outcome.result.added,
      setsAdded: (prev?.title === bookTitle ? prev.setsAdded : 0) + outcome.result.setsAdded,
    };
    setError('');
    setResult(outcome.result);
    setPayload(outcome.text);
    await onReload();
    if (created) onSelectBook(outcome.result.bookId);
  };

  if (view.kind === 'import') {
    const activeId = activeBookIdRef.current || view.book.id;
    const currentBook = (activeId ? books.find((entry) => entry.id === activeId) : undefined) ?? view.book;
    return (
      <Sheet title={`${currentBook.title} · 단어 가져오기`} onClose={safeClose}>
        <View style={{ gap: 10 }}>
          <T size={13} tone="muted">프롬프트를 복사해 외부 AI에 단어 목록을 보낸 뒤, 출력된 JSON을 복사하고 클립보드에서 가져오기를 누르세요.</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Btn
              title="프롬프트 복사"
              disabled={busy}
              onPress={() => void Clipboard.setStringAsync(buildEnglishImportPrompt(currentBook, usedExamples)).then(
                () => notify('단어장 프롬프트 복사 완료'),
                (cause) => setError(cause instanceof Error && cause.message ? cause.message : '프롬프트를 복사하지 못했습니다.'),
              )}
              testID="copy-vocab-prompt"
            />
            <Btn
              variant="primary"
              title={busy ? '가져오는 중…' : '클립보드에서 가져오기'}
              disabled={busy}
              onPress={() => void run(async () => {
                setError('');
                setResult(null);
                const outcome = await importWordsFromClipboard(
                  () => Clipboard.getStringAsync(),
                  payload,
                  (raw) => submitBatch(raw, currentBook.title),
                );
                await applyImportOutcome(outcome, currentBook.title);
              })}
              testID="import-vocab-clipboard"
            />
            <Btn
              title="JSON 직접 입력"
              selected={manualOpen}
              disabled={busy}
              onPress={() => setManualOpen((open) => !open)}
              testID="toggle-vocab-manual"
            />
            <Btn
              title="목록으로"
              disabled={busy}
              onPress={() => {
                setResult(null);
                setError('');
                setPayload('');
                setManualOpen(false);
                setView({ kind: 'list' });
              }}
              testID="back-to-vocab-list"
            />
          </View>
          {manualOpen && (
            <View style={{ gap: 10 }}>
              <Input
                multiline
                label="단어 JSON"
                placeholder='{ "format": "jace-s.english-words", ... }'
                value={payload}
                onChangeText={(value) => { setPayload(value); setError(''); }}
                testID="personal-import"
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn
                  variant="primary"
                  title={busy ? '가져오는 중…' : '가져오기'}
                  disabled={busy || !payload.trim()}
                  onPress={() => void run(async () => {
                    setError('');
                    setResult(null);
                    const outcome = await importWordsJson(
                      payload,
                      (raw) => submitBatch(raw, currentBook.title),
                    );
                    await applyImportOutcome(outcome, currentBook.title);
                  })}
                  testID="personal-import-submit"
                />
              </View>
            </View>
          )}
          <T size={12} tone="dim">같은 단어장에 이미 있는 단어는 새로 만들지 않고 새 문제 세트만 보충합니다. 내 메모는 바뀌지 않습니다.</T>
          {!!error && <T tone="error">{error}</T>}
          {result && (
            <View style={{ gap: 6, padding: 12, borderWidth: 1, borderColor: c.goodLine, borderRadius: 10, backgroundColor: c.goodSoft }}>
              <T weight="700" tone="good">
                {result.added}개 추가 · 새 Day {dayCountOf(result.added)}개{result.updated > 0 ? ` · 기존 ${result.updated}개 제외/보충(새 문제 ${result.setsAdded}세트)` : ''}
              </T>
              <T size={12.5} tone="muted">이어서 다음 묶음 JSON을 복사한 뒤 클립보드에서 가져오기를 누르세요.</T>
            </View>
          )}
        </View>
      </Sheet>
    );
  }

  if (view.kind === 'words') {
    const current = resolveBook(view.book);
    const cannotRemoveLast = current.words.length <= 1;
    return (
      <Sheet title={`${current.title} · 단어`} onClose={safeClose}>
        <View style={{ gap: 8 }}>
          {current.words.length === 0 ? (
            <Empty>단어가 없습니다.</Empty>
          ) : (
            current.words.map((word) => {
              const confirming = confirmWordId === word.id;
              return (
                <View key={word.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderWidth: 1, borderColor: c.border, borderRadius: 10 }}>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <T size={16} weight="700" numberOfLines={1}>{word.word}</T>
                    <T size={13} tone="muted" numberOfLines={1}>{word.meaning}</T>
                  </View>
                  {confirming ? (
                    <View style={{ flexDirection: 'row', gap: 6, flexShrink: 0 }}>
                      <Btn
                        variant="danger"
                        title="정말 삭제"
                        disabled={busy || cannotRemoveLast}
                        onPress={() => void run(async () => {
                          setError('');
                          const remaining = current.words.filter((entry) => entry.id !== word.id);
                          await api('library/save', { id: current.id, kind: 'vocabulary', title: current.title, body: current.body, words: remaining });
                          setConfirmWordId(null);
                          await onReload();
                        })}
                      />
                      <Btn title="취소" disabled={busy} onPress={() => setConfirmWordId(null)} />
                    </View>
                  ) : (
                    <Btn
                      variant="ghost"
                      title="삭제"
                      disabled={busy || cannotRemoveLast}
                      onPress={() => setConfirmWordId(word.id)}
                    />
                  )}
                </View>
              );
            })
          )}
          {cannotRemoveLast && <T size={12.2} tone="dim">단어장에는 최소 1개의 단어가 있어야 합니다. 전체 삭제는 목록에서 진행하세요.</T>}
          {!!error && <T tone="error">{error}</T>}
          <View style={{ flexDirection: 'row' }}>
            <Btn title="목록으로" disabled={busy} onPress={() => { setConfirmWordId(null); setError(''); setView({ kind: 'list' }); }} />
          </View>
        </View>
      </Sheet>
    );
  }

  if (view.kind === 'rename') {
    return (
      <Sheet title="단어장 이름 바꾸기" onClose={safeClose}>
        <View style={{ gap: 10 }}>
          <Input label="단어장 이름" value={title} onChangeText={setTitle} placeholder={view.book.title} />
          {!!error && <T tone="error">{error}</T>}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn
              variant="primary"
              title="저장"
              disabled={busy || !title.trim()}
              onPress={() => void run(async () => {
                setError('');
                await api('library/save', {
                  id: view.book.id,
                  kind: 'vocabulary',
                  title: title.trim(),
                  body: view.book.body,
                  words: view.book.words,
                });
                setTitle('');
                await onReload();
                setView({ kind: 'list' });
              })}
            />
            <Btn title="취소" disabled={busy} onPress={() => { setTitle(''); setError(''); setView({ kind: 'list' }); }} />
          </View>
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet title="단어장 관리" onClose={safeClose}>
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <View style={{ flex: 1, gap: 8 }}>
            <Input
              label="새 단어장 이름"
              value={title}
              onChangeText={setTitle}
              placeholder="새 단어장 이름"
              testID="personal-book-title"
              onSubmit={handleCreateBook}
            />
          </View>
          <Btn
            variant="primary"
            title="새 단어장 추가"
            disabled={busy || !title.trim()}
            onPress={handleCreateBook}
            testID="create-personal-book"
          />
        </View>
        {!!error && <T tone="error">{error}</T>}
        {books.length === 0 ? (
          <Empty>아직 단어장이 없습니다.</Empty>
        ) : (
          books.map((book) => {
            const isDefault = book.id === DEFAULT_VOCABULARY_ID;
            const confirming = confirmDeleteId === book.id;
            return (
              <View key={book.id} style={{ gap: 8, padding: 12, borderWidth: 1, borderColor: c.border, borderRadius: 10, backgroundColor: c.panel }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <T weight="700" numberOfLines={1}>{book.title}</T>
                    <T size={12.2} tone="dim">단어 {book.words.length}개 · Day {dayCountOf(book.words.length)}개{isDefault ? ' · 기본 단어장' : ''}</T>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <Btn title="단어 가져오기" disabled={busy} onPress={() => openImport(book)} testID={`import-vocab-${book.id}`} />
                    <ActionDropdown
                      label="⋯"
                      accessibilityLabel={`${book.title} 더보기 메뉴`}
                      disabled={busy}
                      testID={`vocab-more-${book.id}`}
                      actions={[
                        { key: 'rename', title: '이름 바꾸기', onPress: () => { setTitle(book.title); setError(''); setConfirmDeleteId(null); setView({ kind: 'rename', book }); } },
                        { key: 'words', title: '단어 관리', onPress: () => { setError(''); setConfirmWordId(null); setView({ kind: 'words', book }); } },
                        { key: 'delete', title: '삭제', disabled: isDefault, onPress: () => { setError(''); setConfirmDeleteId(book.id); } },
                      ]}
                    />
                  </View>
                </View>
                {confirming && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 6, borderTopWidth: 1, borderColor: c.borderSoft }}>
                    <T size={12.5} tone="muted" style={{ flex: 1 }}>삭제한 단어장은 복구할 수 없습니다.</T>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Btn
                        variant="danger"
                        title="정말 삭제"
                        disabled={busy}
                        onPress={() => void run(async () => {
                          setError('');
                          await api('library/delete', { id: book.id });
                          setConfirmDeleteId(null);
                          await onReload();
                        })}
                      />
                      <Btn title="취소" disabled={busy} onPress={() => setConfirmDeleteId(null)} />
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    </Sheet>
  );
}
