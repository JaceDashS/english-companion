import type { LibraryBook, LibraryWord } from './readingWords';

/** Build a self-contained generator prompt; generated text never populates the learner's own note. */
export function buildEnglishImportPrompt(book: LibraryBook, usedExamples: Record<string, string[]> = {}): string {
  return `너는 영어 어휘 학습 자료 편집자다. 먼저 이 메시지에는 "단어 목록을 보내 주세요."라고만 답해라.
그다음 내가 보내는 자유 형식 단어 목록을 아래 규격의 JSON 하나로 출력해라. 설명이나 코드 블록을 붙이지 마라.
format은 "jace-s.english-words", version은 1, words는 배열이다. 한 번에 최대 20단어를 작성한다.
각 단어는 {"word":"단어","meaning":"한국어 대표 뜻","decomposition":"제공 학습 예문 2~4개를 줄바꿈으로 구분","roots":["확실한 어원 어근"],"quizzes":[{"pattern":"문장 구조 이름","sentences":["보기 1","보기 2","보기 3","보기 4"],"answer":0}]} 구조다.

규칙:
1. word는 사전형, meaning은 목표 의미다. 메모, memo, note는 절대 생성하지 마라. 학습자가 직접 쓰는 예문 영역이다.
2. roots는 소문자 어원 어근이다. 단순 활용형이나 철자가 비슷한 단어를 같은 어근이라고 추측하지 마라. 어원을 확신할 수 없으면 []로 둬라. 여러 어근이면 모두 적는다.
3. decomposition의 예문은 서로 다른 상황과 문장 구조로 자연스럽게 쓰고 줄바꿈으로 구분한다.
4. 단어마다 quizzes를 정확히 8세트 작성한다. 각 세트의 pattern은 서로 달라야 한다. 능동, 수동, 의문, 부정, 조건, 관계절, 간접화법, 대조, 조동사, 대화 등에서 다양하게 선택한다. 시제나 주어 이름만 바꾸는 반복은 금지한다.
5. 각 세트는 sentences 4개와 0~3인 answer 하나를 가진다. 보기 모두 해당 단어를 포함하되 목표 의미·문맥·어법·연어상 가장 적절한 문장은 정확히 하나여야 한다. 오답은 그럴듯하지만 명확한 용법 오류가 있어야 한다. 의미상 모두 맞는 보기, 상식만 다른 보기, 애매한 정답은 금지한다.
6. 네 보기의 길이와 난도를 비슷하게 하고 정답 위치를 골고루 분산한다. 기술, 일상, 대화, 업무, 자연, 관계 등 다양한 맥락과 패턴을 사용한다.
7. 모든 문제 예문은 decomposition의 예문, 다른 세트의 예문, 아래 기존 예문과 달라야 한다. 어순·상황·구조도 바꿔라. 대소문자나 문장부호만 바꾼 것은 새 예문이 아니다.
8. 같은 단어는 한 번만 넣고 한국어 뜻과 어원을 지어내지 마라. 추가 생성이면 기존 학습 정보와 같은 목표 의미를 유지한다.

현재 단어장과 이미 사용하거나 제공한 예문 참고:
${JSON.stringify({ title: book.title, words: book.words.map(word => ({ word: word.word, meaning: word.meaning, roots: word.roots ?? [], decomposition: word.decomposition ?? word.example, existingSentences: (word.quizzes ?? (word.quiz ? [word.quiz] : [])).flatMap(q => q.sentences) })), usedExamples }, null, 2)}`;
}

/** Group all registered occurrences by their stored etymological root, deduplicating the same spelling. */
export function groupWordsByRoot(words: LibraryWord[]): Map<string, LibraryWord[]> {
  const groups = new Map<string, LibraryWord[]>();
  for (const word of words) for (const root of word.roots ?? []) {
    const key = root.normalize('NFKC').trim().toLowerCase();
    if (!key) continue;
    const group = groups.get(key) ?? [];
    if (!group.some(old => old.word.normalize('NFKC').toLowerCase() === word.word.normalize('NFKC').toLowerCase())) group.push(word);
    groups.set(key, group);
  }
  return new Map([...groups].sort(([a], [b]) => a.localeCompare(b)));
}
