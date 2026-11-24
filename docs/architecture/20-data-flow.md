# Data Flow

The common Expo screens display product word content with account progress from the platform. Progress changes use the authenticated English Companion endpoints. The platform also owns notices and account permissions.

```mermaid
flowchart LR
    A[Expo screens] --> B[Product word content]
    A[Expo screens] --> C[Authenticated client]
    C[Authenticated client] --> D[Platform progress API]
```

See [Architecture Overview](10-overview.md).
