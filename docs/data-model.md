# Domain model and data retention

The model should represent brewing concepts independently of SQLite tables. Use UUIDs for stable identifiers and UTC timestamps for persisted times. Store temperatures in Celsius internally and convert for display. Preserve both raw sensor values and normalized/corrected values.

## Core entities

### Recipe

A reusable brewing specification.

Suggested fields:

- `id`
- `name`
- `style`
- `batchVolumeL`
- `ingredients` (structured list)
- `mashSteps` (structured list)
- `targetOg`
- `targetFg`
- `targetAbv`
- `notes`
- `createdAt`
- `updatedAt`

Keep ingredient quantities and units explicit. Avoid encoding the entire recipe as an opaque text blob.

### Batch

A specific brew made from a recipe (or an ad hoc recipe).

Suggested fields:

- `id`
- `recipeId` (nullable for ad hoc batches)
- `name`
- `status`: planned, brewing, fermenting, conditioning, packaged, archived
- `brewDate`
- `pitchedAt`
- `actualOg`
- `actualFg`
- `fermenterId` (optional)
- `notes`
- `createdAt`
- `updatedAt`

### Measurement

An observation from a Tilt or manual entry. Measurements are append-only.

Suggested fields:

- `id`
- `batchId` (nullable until assigned)
- `deviceId` (nullable for manual readings)
- `source`: tilt, manual, future_pressure_sensor
- `observedAt` (nullable if the sensor does not provide a trustworthy sample timestamp)
- `receivedAt` (when the collector received the BLE packet)
- `rawGravity`
- `gravity` (normalized/corrected value)
- `rawTemperature`
- `temperatureC`
- `rawPayload` (compact JSON or encoded advertisement fields)
- `qualityFlags` (structured flags)
- `createdAt`

Do not pretend the Tilt packet contains a precise sample timestamp if it does not. The collector receive timestamp is the reliable timestamp for the event.

### Device

A physical or logical measurement source.

Suggested fields:

- `id`
- `type`: tilt, manual, future_sensor
- `name`
- `tiltColor` (nullable)
- `enabled`
- `lastSeenAt`
- `calibration` (structured calibration metadata)
- `createdAt`
- `updatedAt`

### Brew event

A note or action associated with a batch.

Suggested fields:

- `id`
- `batchId`
- `occurredAt`
- `type` (pitch, dry_hop, gravity_check, temperature_change, transfer, package, note, etc.)
- `notes`
- `data` (optional structured JSON)
- `createdAt`

### Idempotency record

For retry-safe commands, persist idempotency keys and their result/resource identifiers. This is particularly important for offline PWA command replay and collector retries.

## Data rules

1. Measurements are immutable observations. Corrections create a separate corrected value or calibration record; do not erase raw data.
2. All persisted timestamps are UTC ISO-8601 or integer epoch values with a documented convention.
3. Distinguish `observedAt` from `receivedAt`.
4. Store raw sensor payloads in a bounded, versioned representation for debugging.
5. Use explicit units in API contracts and field names.
6. Gravity should have a documented representation (for example, specific gravity as a decimal such as `1.048`).
7. Validate plausible ranges, but retain suspicious readings with quality flags when useful for diagnostics rather than silently discarding them.
8. A device can exist without an assigned batch. Batch assignment should be explicit and time-aware if a Tilt is reused between batches.
9. Index common query paths, especially `(batchId, receivedAt)` and `(deviceId, receivedAt)`.
10. Define a retention/roll-up strategy before the database becomes large. Raw readings are small, but long-term charts can use downsampled aggregates.

## Batch/device assignment

A Tilt may be moved between fermenters or batches. Avoid relying only on a mutable `batchId` field on the device. Consider a `device_assignments` table with:

- `id`
- `deviceId`
- `batchId`
- `startedAt`
- `endedAt` (nullable)

At ingestion time, resolve the active assignment and associate the measurement with the correct batch. If no assignment exists, store the reading as unassigned and surface it for operator action.

## Suggested initial SQLite tables

- `recipes`
- `batches`
- `devices`
- `device_assignments`
- `measurements`
- `brew_events`
- `idempotency_keys`
- `schema_migrations`

Use foreign keys and explicit indexes. Add constraints for required fields and known enum values. Keep schema migrations small and reversible where possible.

## Future-proofing without overengineering

Do not introduce a generic event-sourcing framework. Append-only measurements plus ordinary relational entities are sufficient. Keep raw sensor payloads and calibration metadata so future algorithms can reinterpret old readings if needed.
