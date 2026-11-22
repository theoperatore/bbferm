# @bbferm/store-schema

The published schema for Store's internal API (`/internal/v1`). Store owns it.
The web BFF and the collector depend on it. Store itself never depends on its consumers.

- Depends only on `zod` and `@bbferm/domain`, so consumers never pull in Fastify or the SQLite driver.
- Keep `/internal/v1` backward compatible. Consumers deploy independently.
  Adding optional response fields is safe because Zod strips unknown keys.
  Removing or renaming fields requires `/internal/v2`.
