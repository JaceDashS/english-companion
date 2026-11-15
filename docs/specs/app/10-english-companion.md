# English Companion

## Study And Quiz
- The app follows the Japanese Companion layout: today, Unit, progress and settings tabs (top bar on PC, header and bottom tabs on phones). A unit plays the role of a Japanese Day.
- Today shows four stats (today's review units, today's new unit, started units, words to revisit), a queue, the word count per review stage and recent units. The queue lists units with due quiz words as review cards and the first unit that still has unstarted words as a learning card.
- The Unit tab searches units, filters to units with wrong answers and shows the learned share of each unit. The progress tab shows completed units, learned words and the average review stage.
- A session opens full screen. Study shows one word at a time with its meaning and example (both can be hidden). The quiz shows the word, a scratch memo field, then four sentences that all use the word; choosing a sentence grades it at once and shows the meaning. Sentence order is shuffled per session. A review session from the queue quizzes only the unit's due words.
- Only words with a usage quiz are quizzed. Final quiz Next immediately updates local progress and returns home when all answers are correct, or opens study for failed words before returning home. Delivery uses an account-scoped persistent FIFO queue with exponential backoff (1 second up to 60 seconds), without blocking navigation. The same operation ID is reused across retries and reloads. Pending results remain visible; permanent server rejections require an explicit retry.
- Bundled content starts empty. The account library supplies a short original example story and a small example vocabulary material; personal materials can be added. See [Reading Books](40-reading-books.md).
- Content supports named books containing units. The mobile book dropdown scopes its queue, counters, Unit list, progress and due badge to the selected book. Desktop continues showing all units without a new control. Book selection survives tab and study navigation within the app session, resets on account changes or logout, and defaults to the first book after reload.
- Preserve existing word IDs and account progress; the legacy flat unit format remains supported as the default book. Book IDs, unit IDs and word IDs must each be unique across the catalog.
- Theme (dark or light) and layout mode (auto, phone, PC) are stored on the device only.
- Design: [English Companion Design](../../design/app/10-english-companion.md#screens-and-flow)

## Quiz Scratch Memo
- One single-line text field sits between the word and the sentences.
- Its text is never sent, stored or included in results. Every question starts with an empty field, including when returning to a previous question.
- Design: [Quiz Scratch Memo](../../design/app/10-english-companion.md#quiz-scratch-memo)

## Progress
- A pass raises the review stage by one and schedules the next review after 1, 2, 4, 7, 15 or 30 days; the last stage keeps 30 days. A fail lowers the stage by one, with a minimum of 0, and schedules the review for the day after the quiz.
- Dates use the account calendar from the server clock, never the device date.
- Design: [Progress And API](../../design/app/10-english-companion.md#progress-and-api)

## Accounts
- The web and Android apps use the existing platform account. Web sign-in is shared with the other jace-s apps in the same browser. Direct web entry shows the login dialog with password and Google sign-in; Android uses password sign-in.
- Accounts without app permission, or with a temporary password, see a message and a link to the main page.

## Account Screen
- The settings tab shows the account card with the name, username, email with its verification state, sign-in method (username and password, or Google only), join date and last sign-in. Missing values show "none".
- Profile and password changes stay on the main site My Page, linked from the screen.
- Sign out ends the platform session and returns to the login screen. On the web the other jace-s apps and the main site in the same browser are signed out too. A failed sign out keeps the session and shows a retry message.
- Design: [Account Screen](../../design/app/10-english-companion.md#account-screen)

## Example
- Input: A unit with the word "run" whose intended sense is "operate"; the learner types a note and picks "She runs a small bakery downtown."
- Steps: Check the answer, move to the next question, finish and save.
- Expected result: The answer passes, the next question shows an empty memo, and the save request contains only `{id: "run", result: "PASS"}`.

## Android Google Account Picker

Android login must use the official Google account picker and the same account/session as web login. Cancellation creates no session; retry obtains a fresh native challenge. Browser GIS authentication stays separate. APK packaging and physical picker validation are deferred until mobile web testing is complete.

Example input: User cancels the Android picker. Steps: Open login, choose Google, cancel. Expected result: Login remains available without a credential exchange.

- Design: [Companion authentication](../../design/app/10-english-companion.md#native-google-implementation)

The quiz scratch field is labelled 풀이 메모 and remains temporary; learner-written examples are stored separately through 내 예문.
