# English Companion

## Study And Quiz
- The home screen lists units with word, started and due counts, and offers a review of started words whose review date has arrived.
- The study screen shows one word at a time with its meaning and an example sentence.
- The quiz screen shows the word, a scratch memo field, then four sentences that all use the word. The learner chooses the sentence that uses the word in the intended sense. Sentence order is shuffled per session.
- Only words with a usage quiz are quizzed. Results are saved only when the learner presses save on the result screen.
- Content is empty until it is added later; the home screen then explains that no words exist yet.
- Design: [English Companion Design](../../design/app/10-english-companion.md#screens-and-flow)

## Quiz Scratch Memo
- One single-line text field sits between the word and the sentences.
- Its text is never sent, stored or included in results. Every question starts with an empty field, including when returning to a previous question.
- Design: [Quiz Scratch Memo](../../design/app/10-english-companion.md#quiz-scratch-memo)

## Progress
- A pass raises the review stage by one and schedules the next review after 1, 2, 4, 7, 15 or 30 days; the last stage keeps 30 days. A fail resets the stage to 0 and schedules the review for the next day.
- Dates use the account calendar from the server clock, never the device date.
- Design: [Progress And API](../../design/app/10-english-companion.md#progress-and-api)

## Accounts
- The web and Android apps use the existing platform account. Web sign-in is shared with the other jace-s apps in the same browser. Direct web entry shows the login dialog with password and Google sign-in; Android uses password sign-in.
- Accounts without app permission, or with a temporary password, see a message and a link to the main page.

## Account Screen
- The home header shows the username and an account button. The account screen shows the name, username, email with its verification state, sign-in method (username and password, or Google only), join date and last sign-in. Missing values show "none".
- Profile and password changes stay on the main site My Page, linked from the screen.
- Sign out ends the platform session and returns to the login screen. On the web the other jace-s apps and the main site in the same browser are signed out too. A failed sign out keeps the session and shows a retry message.
- Design: [Account Screen](../../design/app/10-english-companion.md#account-screen)

## Example
- Input: A unit with the word "run" whose intended sense is "operate"; the learner types a note and picks "She runs a small bakery downtown."
- Steps: Check the answer, move to the next question, finish and save.
- Expected result: The answer passes, the next question shows an empty memo, and the save request contains only `{id: "run", result: "PASS"}`.
