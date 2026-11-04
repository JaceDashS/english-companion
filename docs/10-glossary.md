# Glossary

## Unit
- Definition: An ordered group of words studied together
- Code: `EnglishUnit`, `units[]` in `src/content/words.json`

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
- Definition: The screen opened from the home header that shows the signed-in platform account and signs out
- Code: `AccountScreen`, `EnglishClient.account`, `Account`
- Avoid: "My Page", which is the main site page where profile changes happen
