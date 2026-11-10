# Responsive Layout

## Requirements
- Use the same Expo React Native screens in browser and Android. Keep platform session and storage adapters.
- Automatic desktop layout requires available width at least 1024 and the shorter available dimension at least 600 logical pixels. Existing manual phone and PC preferences remain explicit overrides.
- Restore Japanese ink and sakura colors, desktop top navigation, dashboard columns and phone bottom tabs. Restore Certificate midnight and orange colors, desktop rail and phone bottom tabs. English uses the Japanese layout and parts with its own Library palette: deep green-black with brass, ivy and sky accents, and a parchment light theme.
- Keep navigation, account actions, study, quizzes, source writes and saved progress functional. Rotation and window resizing must not reset study state.
- Background colors cover the viewport and scrolling content without a repeating gradient or visible rectangular seam.
- Only mobile forms add a book dropdown above today, Unit and progress. Desktop keeps its existing controls and complete Unit list. Resizing back to mobile retains the selected book during the current signed-in app session.
- Design: [Responsive Layout](../../design/app/30-responsive-layout.md)

## Example
- Input: A tablet with 1280 by 800 available logical pixels and a phone with 915 by 412.
- Steps: Open home, then rotate or resize the available window.
- Expected result: The tablet uses desktop layout, the landscape phone stays compact, and the active tab and study state survive resizing.

## Browser Control Theme
- Match browser scrollbars and system color scheme to the current dark or light palette, including nested scrolling panels. Keep desktop composition and native scroll behavior unchanged.
- In mobile book dropdowns, place the decorative chevron 14 pixels from the right and reserve 40 pixels of right padding for long titles. Keep the real select semantics and keyboard interaction.
- Example input: A long book title in the light theme. Steps: Open mobile home and switch the theme. Expected result: The arrow stays inset and scrollbar colors follow the active palette without changing book selection.
