# API contracts

BBFerm has two boundaries:

1. Browser → TanStack Start BFF, using Start server functions and server routes.
2. TanStack Start / collector → internal Fastify Store API.

The browser must never call Store directly. Store is loopback-only and is not a public API.

## Browser-facing BFF

Use Start server functions for UI operations:
- Read status, devices, batches, recipes, and measurements.
- Create/update recipes and batches.
- Add brew events and manual measurements.
- Assign Tilt devices to batches.

Use Start server routes for conventional HTTP endpoints where useful, such as `GET /api/health` or future external integrations.

## Internal Store API

Prefix: `/internal/v1`. Bind to loopback only or a permission-protected Unix socket. Require a service credential or equivalent local authentication.

| Method | Path | Caller | Purpose |
|---|---|---|---|
| GET | `/internal/v1/health` | Start, collector | Readiness/liveness |
| GET | `/internal/v1/status` | Start | DB/schema status |
| POST | `/internal/v1/measurements` | Collector | Idempotent Tilt ingestion |
| GET | `/internal/v1/measurements/latest` | Start | Latest readings |
| GET | `/internal/v1/measurements` | Start | Bounded history query |
| GET/POST | `/internal/v1/devices` | Start | Device management |
| GET/POST | `/internal/v1/batches` | Start | Batch operations |
| GET/PATCH | `/internal/v1/batches/{id}` | Start | Batch detail/update |
| GET/POST | `/internal/v1/recipes` | Start | Recipe operations |
| POST | `/internal/v1/events` | Start | Brew event creation |
| POST | `/internal/v1/measurements/manual` | Start | Manual measurement |

Use stable DTOs and runtime validation at every boundary. Do not expose raw SQL rows or arbitrary query endpoints.

## Measurement payload

Illustrative shape only; the final raw payload depends on the Tilt decoder:

```json
{
  "id": "uuid",
  "deviceId": "uuid",
  "source": "tilt",
  "receivedAt": "2026-11-21T17:00:00.000Z",
  "rawGravity": 1.042,
  "gravity": 1.042,
  "rawTemperature": 68,
  "temperatureC": 20,
  "rawPayload": {},
  "qualityFlags": []
}
```

Use a stable measurement ID as an idempotency key so collector retries cannot create duplicate records. Preserve raw observations and normalized values. Record receive time in UTC; do not imply the Tilt supplied a precise observation timestamp if it did not.

## Query and error conventions

Time-series requests must be bounded with `from`, `to`, `limit`, and/or cursor pagination. Reject unbounded reads. Use a stable error envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request is invalid.",
    "requestId": "..."
  }
}
```

Never return stack traces, SQL, filesystem paths, internal hostnames, or secrets to the browser.

## Security

- Authenticate browser sessions at the Start BFF.
- Use `HttpOnly`, `Secure`, appropriately `SameSite` session cookies.
- Protect state-changing requests against CSRF.
- Keep Start-to-Store and collector-to-Store credentials separate.
- Store secrets outside the repository and outside client-exposed environment variables.
