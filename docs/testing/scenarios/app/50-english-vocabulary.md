# English Vocabulary Scenarios

- Spec: [Requirements](../../../specs/app/50-english-vocabulary.md)
- Design: [Implementation](../../../design/app/50-english-vocabulary.md)

## Unique Questions
- Input: Multiple structurally different question sets and a provided study example.
- Steps: Request a quiz twice, retry the first request, then exhaust the pool and reload.
- Expected result: Different new sets, identical idempotent retry, no reuse of study sentences, and persisted exhaustion.

## Root Groups
- Input: Several words sharing a root and one word with two roots.
- Steps: Save and reload materials, then select either root.
- Expected result: Matching words from all materials appear, with no guessed roots or duplicated personal notes.

## Import Protection
- Input: Existing progress and a personal example, followed by a replenishment import.
- Steps: Import valid new sets; then try malformed or repeated sentences, duplicate patterns and another account book ID.
- Expected result: Valid sets append without resetting IDs, progress, personal examples or history; invalid imports change nothing.

## Automated Coverage
- Platform scripts/test-english-companion.ts verifies persisted roots, eight-set import, concurrent distinct reservations, idempotency-key conflicts, cache-reload exhaustion, replenishment, stable IDs, retained personal examples, duplicate patterns/sentences, account ownership and CSRF.
- Product tests/domain.test.ts verifies cross-material root grouping and prompt context, alongside decomposition compatibility. Existing API client tests cover account-bound requests.

## Long Term Replenishment
- Input: A word whose active eight-set pool has been exhausted.
- Steps: Import and consume eight new sets in each of nine cycles.
- Expected result: More than 64 lifetime sets can be studied; consumed active sets are pruned but their examples remain blocked permanently. Unused active sets retain the 64-set safety cap.
- Test: Platform scripts/test-english-companion.ts long term refill scenario.

## Browser Verification
- Input: Real English web export, an isolated account/API database, and desktop and 390x844 mobile viewports.
- Steps: Copy the prompt and read the clipboard, import two words with eight sets each, browse their root, write a personal example, study and grade a quiz, open a new session, exhaust all sets, then replenish through the import screen.
- Expected result: Correct prompt contents, persisted root groups and personal example, distinct new-session choices, a usable mobile exhaustion message and fresh choices after replenishment.
- Verification: Headless Edge passed 2026-11-14. API requests used real handlers with an isolated injected test session. No live account data or AI provider was used; native APK launch was not tested.

## Study Sentence And Target Validation
- Input: A problem choice copied from a multi-sentence provided paragraph, or a different word that merely contains the target spelling.
- Steps: Import the generated payload.
- Expected result: Both imports fail before persistence; punctuation, case and line formatting do not make a previously provided sentence new.
- Test: Platform scripts/test-english-companion.ts repeatsStudy and wrongTarget cases.
