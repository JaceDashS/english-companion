# Responsive Layout Scenarios

- Design: [Responsive Layout](../../../design/app/30-responsive-layout.md)

## Automatic Layout Boundary
- Input: Portrait phone 390x844, landscape phones 915x412 and 1280x450, tablet 1280x800, portrait tablet 800x1280, desktop 1440x900, boundary 1024x600, nearby 1023x800 and 1024x599.
- Steps: Evaluate automatic layout using available logical dimensions.
- Expected result: Desktop only for 1280x800, 1440x900 and 1024x600; all others compact.
- Test: `tests/domain.test.ts` responsive layout excludes landscape phones but admits wide tablets and desktop windows.

## Manual Preference
- Input: Phone preference on a large window, PC preference on a small window.
- Steps: Evaluate the explicit preference with the same layout policy.
- Expected result: Manual preferences override automatic detection where the product exposes the setting.
- Test: The same boundary regression verifies explicit policy overrides.

## Japanese Layout With Library Palette
- Input: Temporary preview content (six units of six words, not committed) and seeded progress on a synthetic API.
- Steps: Capture today, Unit, study, quiz, settings and the light theme at 1440x900 and 390x844, next to the Japanese Companion captures.
- Expected result: The same layout and parts as Japanese Companion with the brass, ivy and sky palette.
- Observed 2026-11-09: Matched; review cards opened quiz-only sessions, choices graded at once and the light theme switched to parchment.

## Resize And Study
- Input: An authenticated test account with sample content, desktop and compact viewports.
- Steps: Navigate home and settings, begin study, resize or rotate, use the existing quiz and return controls, and scroll to the bottom.
- Expected result: State remains intact, desktop columns and compact tabs stay usable, text is readable, no horizontal page overflow or background seams appear, and account and study actions retain their existing API behavior.
- Observed 2026-11-09 in Chrome with local synthetic account and progress responses: the empty-content dashboard with zero counters, disabled review action and mint styling; account navigation on desktop and at 390x844. The 915x412 landscape layout kept bottom navigation, and a 1280x800 view used top navigation. Page width matched viewport width after reflow. Desktop appearance was visually inspected and captured. The bundled content is intentionally empty, so a populated vocabulary UI walkthrough was not performed. Web and Android JavaScript exports passed, along with 21 regressions and type checking.
- Limit: Synthetic browser responses do not verify production persistence. Android JavaScript exports do not establish APK or physical-device behavior.

## Mobile Book Dropdown
- Input: Two synthetic books with different units, a long second title, and 390x844 and 1440x900 viewports.
- Steps: Select the second mobile book, inspect the Unit list and page width, then resize to desktop.
- Expected result: Mobile shows only Second Book Unit with no horizontal overflow. Desktop has no dropdown and lists both units. Selection survives tab and study navigation through App state, but resets after logout, account change or full reload.
- Verified 2026-11-10: A local harness using the actual BookSelect and HomeScreen switched from First Book Unit to Second Book Unit. Page width remained 390 pixels with the long title. At 1440x900 there were zero selects and both original Unit cards. Account persistence, authenticated navigation and physical Android behavior were not exercised by this harness.
- Validation: Type checking, 24 regressions including catalog compatibility and identity checks, and web and Android JavaScript exports passed. Android export required running outside the Windows sandbox after Hermes compilation failed within it; no code change was needed for that retry.
