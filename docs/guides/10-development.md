# Development

## Run
- `npm ci`, then `npm run web` for the browser or `npm run android` for a device. Set `EXPO_PUBLIC_EC_API_ORIGIN` to use a different API.

## Add Content
Edit `src/content/words.json`. Keep word IDs stable after release, because progress is stored by ID.

Group units under named books. Keep book and Unit IDs unique across the catalog too. Mobile selects one book; PC continues showing all units. Legacy flat units remain accepted as the default book, but do not supply books and units at the same top level.

```json
{ "version": 1, "books": [{ "id": "basic", "title": "Basic English", "units": [{ "id": "unit-1", "title": "Unit 1", "words": [
  { "id": "run", "word": "run", "meaning": "달리다; 운영하다", "example": "She runs a small bakery.",
    "quiz": { "sentences": ["He runs every morning.", "She runs a small bakery.", "The river runs through the city.", "My nose is running."], "answer": 1 } }
] }] }] }
```

Run `npm test` afterwards; invalid content fails "bundled content is valid and starts empty" with the invalid path.

## Build
- Web: `npm run export:web` writes `dist/`. The platform builds the container from this repository's `Dockerfile`.
- Android: `npm run build:android` (JDK 17 and Android SDK, with `ANDROID_HOME` pointing to the SDK) writes `dist-android/english-companion-android.apk`. On Windows, the usual SDK location is `%LOCALAPPDATA%/Android/Sdk`.
- The generated project uses separate short CMake staging directories for the app and Android libraries. This includes Expo modules built from source, which otherwise can exceed Windows tool path limits in a nested checkout. See [Android Native Build](../design/app/10-english-companion.md#android-native-build).
- The generated release variant uses Expo's Android debug signing key for local installation. Store distribution requires a separately configured release key.

Example: add one unit, run the tests, export the web build and open it through a static server.
