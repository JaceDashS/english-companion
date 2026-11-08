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

## Resize And Study
- Input: An authenticated test account with sample content, desktop and compact viewports.
- Steps: Navigate home and settings, begin study, resize or rotate, use the existing quiz and return controls, and scroll to the bottom.
- Expected result: State remains intact, desktop columns and compact tabs stay usable, text is readable, no horizontal page overflow or background seams appear, and account and study actions retain their existing API behavior.
- Observed 2026-11-09 in Chrome with local synthetic account and progress responses: the empty-content dashboard with zero counters, disabled review action and mint styling; account navigation on desktop and at 390x844. The 915x412 landscape layout kept bottom navigation, and a 1280x800 view used top navigation. Page width matched viewport width after reflow. Desktop appearance was visually inspected and captured. The bundled content is intentionally empty, so a populated vocabulary UI walkthrough was not performed. Web and Android JavaScript exports passed, along with 21 regressions and type checking.
- Limit: Synthetic browser responses do not verify production persistence. Android JavaScript exports do not establish APK or physical-device behavior.
