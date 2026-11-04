# Development

## Run
- `npm ci`, then `npm run web` for the browser or `npm run android` for a device. Set `EXPO_PUBLIC_EC_API_ORIGIN` to use a different API.

## Add Content
Edit `src/content/words.json`. Keep word IDs stable after release, because progress is stored by ID.

```json
{ "version": 1, "units": [{ "id": "unit-1", "title": "Unit 1", "words": [
  { "id": "run", "word": "run", "meaning": "달리다; 운영하다", "example": "She runs a small bakery.",
    "quiz": { "sentences": ["He runs every morning.", "She runs a small bakery.", "The river runs through the city.", "My nose is running."], "answer": 1 } }
] }] }
```

Run `npm test` afterwards; invalid content fails "bundled content is valid and starts empty" with the invalid path.

## Build
- Web: `npm run export:web` writes `dist/`. The platform builds the container from this repository's `Dockerfile`.
- Android: `npm run build:android` (Java 21 and Android SDK) writes `dist-android/english-companion-android.apk`.

Example: add one unit, run the tests, export the web build and open it through a static server.
