# Glossary

## Unit
- Definition: An ordered group of words studied together
- Code: `EnglishUnit`, `books[].units[]` in `src/content/words.json`; legacy `units[]` is also accepted

## Book
- Definition: A named group of English units selectable in mobile forms. Desktop keeps the full unit list.
- Code: `EnglishBook`, `parseBooks`, `BookSelect`
- Notes: Book selection does not namespace or rewrite the word IDs used by account progress.

## Word
- Definition: A study entry with the word, its meaning, an example sentence and an optional usage quiz. Its ID is the key for account progress and must not change after publication
- Code: `EnglishWord`, `id`

## Usage Quiz
- Definition: Four sentences that all use the word; exactly one uses it in the intended sense
- Code: `UsageQuiz`, `sentences`, `answer`
- Avoid: "choices" for the sentences in documents; use "sentences"

## Quiz Scratch Memo
- Definition: A one-line, never-saved text field on a quiz question that resets when the question changes
- Code: `QuizMemo`

## Review Stage
- Definition: Number of consecutive passes, which selects the next review interval
- Code: `stage`, platform `ENGLISH_REVIEW_INTERVALS`

## Transport
- Definition: Platform-specific HTTP layer; the web build uses browser cookies, the native build keeps the session in encrypted storage
- Code: `Transport`, `src/api/transport.ts`, `src/api/transport.web.ts`

## Account Screen
- Definition: The account card on the settings tab that shows the signed-in platform account and signs out
- Code: `SettingsScreen`, `EnglishClient.account`, `Account`

## Unit Row
- Definition: Per-unit study summary used by the dashboard; a unit plays the role of a Japanese Companion Day
- Code: `UnitRow`, `buildUnitRows`, `buildQueue` (`src/domain/dashboard.ts`)
- Avoid: calling it "Day" in English Companion screens; use "Unit"
- Avoid: "My Page", which is the main site page where profile changes happen

## Native Google Challenge

A one-use server nonce bound to the Android Google account picker token. Code: nativeGoogleChallenge, nativeGoogleLogin and signInWithNativeGoogle. Separate from the browser cookie challenge.

## Desktop Layout
- Definition: The wide composition with desktop navigation and dashboard columns, automatically enabled at width 1024 and short side 600 logical pixels or above. Existing explicit PC preferences override auto.
- Code: `isDesktopLayout`. Logical pixels are layout units, not physical display pixels.

## Reading Book
- Definition: Prose material read without a required quiz; every word can open its study dictionary and personal note.
- Code: LibraryBook kind book, ReadingLibrary, ReaderText.

## Vocabulary Material
- Definition: A collection of words used by the existing study and quiz screens.
- Code: LibraryBook kind vocabulary; existing Japanese personal textbooks.

## Personal Word Note
- Definition: One account-owned note shared by all occurrences of the same word within a language.
- Code: Japanese japanese_memos, English reading library notes.

## English Decomposition
- Definition: Provided example text for an English word, separate from learner-written examples in the personal note.
- Code: EnglishWord.decomposition, LibraryWord.decomposition.
- Notes: Japanese decomposition continues to mean kanji analysis.

## Etymological Root
- Definition: An explicitly registered historical root linking related English words, not a guessed spelling fragment or inflection family.
- Code: LibraryWord.roots, EnglishWord.roots, groupWordsByRoot.

## Usage Question Pool
- Definition: Imported four-choice question sets with distinct sentence patterns. Reserved choices are never reused for a new session under the same account.
- Code: LibraryWord.quizzes, usedExamples, reserveEnglishQuiz.
