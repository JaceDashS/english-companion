# Test Strategy

- Unit tests (`npm test`): content validation, study helpers, both transports and the client with fake `fetch` responses. Test data is synthetic; no real accounts or credentials.
- Type check (`npm run typecheck`) and web export (`npm run export:web`) run in CI.
- Browser checks run the exported web build against a local mock API (login, study, quiz memo, save) at desktop and 390px widths. They are run manually and are not part of CI.
- The platform repository tests the progress API, migration and permissions.

Example: a change to `transport.web.ts` must keep "browser transport uses cookies and the csrf token from response bodies" passing.
