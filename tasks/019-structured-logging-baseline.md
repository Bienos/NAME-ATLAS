# TASK-019 — structured logging baseline

- **Status:** IMPLEMENTED 2026-09-21.
- **Milestone:** M2, and its last item. Its description names "request IDs; structured logs; basic
  observability".
- **Canonical basis:** `ARCHITECTURE.md` §9 and ADR-0001 (structured logs and request IDs from the
  first backend, OpenTelemetry progressively); `docs/canonical/19` §84 (no permanent payload logging)
  and §85 (cookies, authorisation, email and source secrets redacted).

## 1. Goal

Every service writes one JSON line per event, carrying a correlation ID, with secrets removed before
anything is written. Replaces `console.error` with a request id, which was enough for one developer
and is not a baseline.

## 2. In scope

1. **`packages/logging`** — `createLogger({ service, correlationId?, level?, base? })` returning
   `debug`/`info`/`warn`/`error`/`child`. One JSON object per line: timestamp, level, service, event,
   correlationId, then fields. Level from `LOG_LEVEL`, default `info`.
2. **Redaction before writing**, two independent defences because there are two dangers: a field
   *named* after a secret, and a secret *inside a string that is not*. A connection string reaches a
   log through `pg`'s own error message far more often than through a field called `password`, so
   every string value is scrubbed of `scheme://user:pass@` as well.
3. **Logging never throws.** A value JSON cannot serialise produces a line about that failure, not an
   exception in the caller's request.
4. **Wired into `apps/web` (page and route handler), `apps/admin`, `apps/worker`.** The worker's own
   duplicate logger is deleted.
5. **The request id a client sees is the correlation ID.** The error envelope's `request_id` and the
   `x-request-id` header are the same value the log lines carry, so a user quoting an id maps to
   exactly those lines.

## 3. What is deliberately not logged

**The visitor's surname query.** `docs/canonical/19` §85 requires request content redacted by default,
and a search term with a timestamp is the visitor's, not the register's. The public app logs the
*outcome* — resolution status, each section's state, duration — which is what diagnosis needs.

The admin inspector **does** log the canonical key it inspected: that is a surname from the public
register chosen by a staff member, and knowing which surname an inspection covered is the point of the
line.

## 4. Out of scope

OpenTelemetry, traces, spans, metrics, a log shipper, an error-tracking vendor (`docs/canonical/19`
§85 makes one a processor and requires vendor review), sampling, log rotation, and request logging
middleware. ADR-0001 has observability arriving progressively; this is the first step, not the last.

## 5. Acceptance criteria

- **AC-1** Every line is one JSON object with timestamp, level, service, event and correlationId.
- **AC-2** A logger given an inbound correlation ID reuses it; without one it generates a UUIDv7.
- **AC-3** A field named after a secret is replaced, case-insensitively and recursively.
- **AC-4** A connection string is scrubbed wherever it appears, including inside an `Error` message
  and stack, and the host survives.
- **AC-5** A published source URL is **not** redacted; it is useful and is not a secret.
- **AC-6** Logging a hostile value (throwing getter, `BigInt`, cycle, deep nesting) does not throw.
- **AC-7** Lines below the level threshold are dropped.
- **AC-8** No `console.log`/`console.error` remains in any app's non-test source.
- **AC-9** Against a running app with a credentialled `DATABASE_URL`, the password appears **zero**
  times in the log while the failure is still reported.

## 6. Verification

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
TEST_DATABASE_URL=… pnpm test:integration && pnpm build
# AC-9, by running:
DATABASE_URL=postgres://atlas:SUPERSECRETPW@localhost:5999/nope pnpm --filter web run start
```

## 7. Do not

- Do not log the visitor's query, a request body, a cookie or an authorisation header.
- Do not let a logging failure propagate into a request.
- Do not add a vendor without the review `docs/canonical/19` §85 requires.
