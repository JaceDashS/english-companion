# English Companion Verification

## English Companion Scenarios
- Design: [English Companion Design](../../../design/app/10-english-companion.md#screens-and-flow)

### Empty Content
- Input: The bundled content with no units.
- Steps: Sign in.
- Expected result: Home says no words exist yet.
- Test: `tests/domain.test.ts` → "bundled content is valid and starts empty".

### Usage Quiz Pass
- Input: Word "run" with four sentences; the intended sense is the bakery sentence.
- Steps: Pick the bakery sentence.
- Expected result: The choice is graded at once: "정답입니다." with the meaning, the bakery sentence marked correct and the other choices locked.
- Test: `tests/domain.test.ts` → "grading compares the original sentence index"; browser check.

### Memo Clears On Question Change
- Input: A note typed on question 1.
- Steps: Move to question 2, then back to question 1.
- Expected result: Both show an empty memo; the save request never contains the note.
- Test: browser check (`quiz-memo`).

### Save Binds To Account
- Input: Results for the signed-in account.
- Steps: Press save.
- Expected result: The request carries the account ID in `x-companion-user` and the CSRF token; home counts update.
- Test: `tests/api.test.ts` → "client clears the session on 401 and binds writes to the signed-in account".

### Session Ends
- Input: Any request returns 401.
- Steps: Continue using the app.
- Expected result: Local credentials are cleared and the login screen appears.
- Test: `tests/api.test.ts`.

### No Permission
- Input: An account without `app:use` on `app:english`.
- Steps: Sign in.
- Expected result: A permission message with a main page link.
- Test: `tests/api.test.ts` → "bootstrap refuses accounts without app permission".

### Content Validation
- Input: Duplicate word IDs, three sentences, an answer of 4, or a non-string meaning.
- Steps: Parse the content.
- Expected result: `ContentError` for each.
- Test: `tests/domain.test.ts` → "content parsing keeps fields and rejects invalid shapes".

### Dashboard From Progress
- Input: Unit A with words a (stage 6) and b (failed, due today), Unit B with c started and d unstarted, Unit C unstarted; account date 2026-11-09.
- Steps: Build unit rows, the queue and stage buckets.
- Expected result: Unit A is a review card with one due word and one wrong answer, Unit B is the single learning card, the buckets count three unstarted words, one at stage 2 and one at stage 6, and recent dates read "오늘", "어제" or "n일 전".
- Test: `tests/domain.test.ts` → "dashboard rows map units with due reviews, the next new unit, stage buckets and recent dates".

### Account Details And Sign Out
- Input: Signed-in Google-only account with an unverified email and no last sign-in time.
- Steps: Open the settings tab at 1280 px and 360 px, read the rows, press sign out, then reload.
- Expected result: Name, username, "tester@example.com (인증 전)", "Google 전용" and "없음" show without horizontal scroll; sign out sends one CSRF-protected logout and the login screen stays after reload.
- Test: `tests/api.test.ts` "account reads session details and treats a missing password flag as a password account"; mocked Edge walkthrough of the web export.

### Windows Native Build
- Input: A nested Windows checkout, JDK 17, Android SDK, and Expo modules compiled from source.
- Steps: Set `ANDROID_HOME`, run `npm run build:android`, and inspect the generated CMake staging directories and APK manifest.
- Expected result: Application and library CMake outputs use separate `.cxx/<project-name>` directories; the build completes and produces an APK with package `com.jaces.englishcompanion` and both arm64-v8a and x86_64 native libraries.
- Design: [Android Native Build](../../../design/app/10-english-companion.md#android-native-build)
- Verified 2026-11-05: Gradle 9.4.1 with Microsoft JDK 17.0.18 built the APK successfully. `aapt dump badging` confirmed package `com.jaces.englishcompanion`, version 0.1.0, min SDK 24, target SDK 36, arm64-v8a and x86_64. `apksigner verify --print-certs` passed with the Android Debug certificate. APK size 38,283,557 bytes, SHA256 `b67cf38b9f253e7b6c5135f4eb7e472ecd3e2e5a0fc3b9247a8eadcfd2c3b182`. This is artifact validation; device launch and real account sign-in are not verified.

## Native Google Contracts

- Design: [Native Google Implementation](../../../design/app/10-english-companion.md#native-google-implementation)
- Test: `tests/api.test.ts`.
- Input: Mock provider success, cancellation, retry, disabled configuration or a stale callback.
- Steps: Run native orchestration and transport with a fresh challenge and observe exchanges and stored cookies.
- Expected result: Success exchanges once with matching nonce and remember value; cancellation and stale callbacks never exchange; retry obtains a new nonce; disabled config never opens the provider. Session and CSRF credentials use existing encrypted storage and logout protections.
- Validation boundary: Type checks, local client tests and web export do not prove Android compilation, Console registration, physical account selection or real Google login. APK creation is deferred.
