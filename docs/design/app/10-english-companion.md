# English Companion Design

- Spec: [English Companion](../../specs/app/10-english-companion.md)
- Architecture: [Overview](../../architecture/10-overview.md#single-screen-codebase)
- All scenarios: [English Companion Scenarios](../../testing/scenarios/app/10-english-companion.md#english-companion-scenarios)

## Screens And Flow
- Input: Validated units, the account progress map and the account date.
- Output: Rendered screens; graded results passed to the save call.
- Code: `src/App.tsx` (gate and view state), `src/screens/HomeScreen.tsx`, `StudyScreen.tsx`, `QuizScreen.tsx`, `ResultScreen.tsx`, `LoginScreen.tsx`; helpers `summarizeUnit`, `dueWords`, `quizWords`, `sentenceOrder` and `grade` in `src/domain/study.ts`.
- Steps: `restore` → `bootstrap` (permission and clock) → `progress` → home. Study → quiz of `quizWords` → result → `saveResults` merges the returned entries into the progress map.
- Scenario: Unit with two quizzed words → study both → answer both → save → home shows two started words.

## Quiz Scratch Memo
- Input: Text typed on a quiz question.
- Output: Nothing persisted; the value lives only in component state.
- Code: `QuizMemo` in `src/screens/QuizScreen.tsx`, rendered with `key={word.id}` so it remounts empty whenever the question changes.

## Account Screen
- Input: `EnglishClient`, busy and error state from `App`, and back, logout and expired callbacks.
- Output: Account details, a My Page link, a sign-out button and a back button.
- Code: `src/screens/AccountScreen.tsx` exports `AccountScreen`; `src/api/client.ts` `EnglishClient.account()` reads `/auth/session` and returns `Account` (`src/api/types.ts`) with `hasLocalPassword` defaulting to true when absent. `src/App.tsx` opens it from the header `open-account` button as the `account` view and reuses the existing `logout`.
- A 401 while loading returns to the login screen with the session-ended notice.
- Scenario: A Google-only account opens the account screen and sees "Google 전용", then signs out and lands on the login screen.

## Content
- Input: `src/content/words.json` (`{version: 1, units: [...]}`).
- Output: `EnglishUnit[]`, or a `ContentError` naming the invalid path.
- Code: `parseContent` in `src/content/content.ts`. Word IDs match `^[a-z0-9][a-z0-9-]{0,63}$` and are unique across units; a quiz has exactly four sentences and an `answer` index from 0 to 3.

## Progress And API
- Input: Graded results `{id, result}`.
- Output: Updated progress entries `{stage, due, lastResult, updatedAt}`.
- Code: `EnglishClient` in `src/api/client.ts` calls `/auth/session`, `/auth/login`, `/auth/google/*`, `/app-access/english`, `/auth/clock`, `/companions/english/progress` and `/companions/english/save-results`. Requests are serialized and a 401 clears local credentials. Writes send `x-companion-user` so results cannot be saved to a different account after an account change.
- Transports: `createNativeTransport` in `src/api/transport.ts` captures the `session` and `csrf` cookies into `expo-secure-store` and sends them explicitly. `createBrowserTransport` in `src/api/transport.web.ts` uses `credentials: "include"` and the CSRF token returned in response bodies. Metro selects the `.web.ts` file for the web build.
- The server applies review intervals on its own account date.

## Platform Components
- `src/components/GoogleButton.web.tsx` renders Google Identity Services into the DOM element of a React Native Web `View`; the native `GoogleButton.tsx` renders nothing.
- `src/components/Notices.tsx` reads `/health` and `/notices` and shows dismissible titles, or an outage message when the API is unreachable and no notice exists.

## Android Native Build
- Input: Expo configuration and installed Android SDK and JDK.
- Output: Generated Android projects and `dist-android/english-companion-android.apk`.
- Code: `scripts/build-android.mjs` and `plugins/with-short-cmake-path.cjs`.
- The config plugin adds a root Gradle rule for application and library Android plugins. During DSL finalization each project receives a separate `.cxx/<project-name>` staging directory and `CMAKE_OBJECT_PATH_MAX=250`, including Expo modules compiled from source. This keeps CMake outputs outside the deeply nested dependency directories without modifying dependencies.
- Reference: [CMake object path limit](https://cmake.org/cmake/help/v3.22/variable/CMAKE_OBJECT_PATH_MAX.html) describes the hashing of object paths above the configured limit.
- Scenario: Build under a nested Windows checkout with Expo modules compiled from source. Both the app and Expo libraries use the short staging paths and the release APK is copied only after Gradle succeeds.
- Guide: [Build](../../guides/10-development.md#build)
- All scenarios: [Windows Native Build](../../testing/scenarios/app/10-english-companion.md#windows-native-build)
