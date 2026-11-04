# English Companion Scenarios

## English Companion Scenarios
- Design: [English Companion Design](../../../design/app/10-english-companion.md#screens-and-flow)

### Empty Content
- Input: The bundled content with no units.
- Steps: Sign in.
- Expected result: Home says no words exist yet.
- Test: `tests/domain.test.ts` → "bundled content is valid and starts empty".

### Usage Quiz Pass
- Input: Word "run" with four sentences; the intended sense is the bakery sentence.
- Steps: Pick the bakery sentence and check.
- Expected result: "정답입니다." with the correct sentence and meaning.
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

### Account Details And Sign Out
- Input: Signed-in Google-only account with an unverified email and no last sign-in time.
- Steps: Press the header account button at 1280 px and 360 px, read the rows, press sign out, then reload.
- Expected result: Name, username, "tester@example.com (인증 전)", "Google 전용" and "없음" show without horizontal scroll; sign out sends one CSRF-protected logout and the login screen stays after reload.
- Test: `tests/api.test.ts` "account reads session details and treats a missing password flag as a password account"; mocked Edge walkthrough of the web export.
