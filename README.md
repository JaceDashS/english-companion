# English Companion

Product repository for the English vocabulary companion. One Expo React Native codebase builds both the web app served at `https://english.jace-s.com` and the Android app. Login, permissions and progress use the platform API at `https://api.jace-s.com`; word content ships with the app in `src/content/words.json`.

- [Documentation](docs/00-index.md)
- Install: `npm ci`; type check: `npm run typecheck`; tests: `npm test`
- Web: `npm run web` for development, `npm run export:web` for the static build in `dist/`
- Android: `npm run build:android` after configuring Java and the Android SDK; the APK is written to `dist-android/`

Example: clone this repository on its own, run `npm ci`, `npm run typecheck` and `npm test`. None of them needs the platform or another product repository.
