import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CHECKOUT_WAIT_MS,
  CONNECTION_TIMEOUT_MS,
  db,
  MAX_CONNECTIONS_PER_INSTANCE,
  resetDbForTests,
} from "./db.js";

/**
 * TASK-029 — one pool per process.
 *
 * The defect this replaces was measurable but invisible to every existing test:
 * each route created a pool and destroyed it in a `finally`, so 60 concurrent
 * requests held 59 PostgreSQL connections. Nothing failed, nothing was slow
 * enough to notice, and `max_connections` is 100.
 *
 * So the assertion is identity — the *same* handle comes back — because that is
 * the property that was wrong. A test that merely checked "a handle is
 * returned" passed happily throughout.
 */
describe("the shared database handle", () => {
  const previous = process.env["DATABASE_URL"];

  beforeEach(() => {
    resetDbForTests();
    // A syntactically valid URL that is never connected to: `db()` builds the
    // pool lazily and `pg` does not dial until a query runs.
    process.env["DATABASE_URL"] = "postgres://user:pass@127.0.0.1:1/never_connected";
  });

  afterEach(() => {
    resetDbForTests();
    if (previous === undefined) delete process.env["DATABASE_URL"];
    else process.env["DATABASE_URL"] = previous;
  });

  it("returns the very same handle across calls", () => {
    expect(db()).toBe(db());
  });

  it("returns the same handle to different callers in one process", () => {
    // Six call sites used to build six pools per request between them.
    const handles = Array.from({ length: 6 }, () => db());
    expect(new Set(handles).size).toBe(1);
  });

  it("caps connections per instance well below pg's default of ten", () => {
    // On serverless the connections in flight are max × instances, so ten
    // instances at the default would exhaust a 100-connection database alone.
    expect(MAX_CONNECTIONS_PER_INSTANCE).toBeLessThanOrEqual(2);
    expect(MAX_CONNECTIONS_PER_INSTANCE).toBeGreaterThan(0);
  });

  it("waits longer for a busy connection than for a new one to open (TASK-132)", () => {
    // Opening fails fast when the database is unreachable; a query behind two
    // slow ones on the instance's connections waits its turn instead of failing
    // at the opening's limit, as a directory page did on production (TASK-130).
    expect(CONNECTION_TIMEOUT_MS).toBe(5_000);
    expect(CHECKOUT_WAIT_MS).toBeGreaterThan(CONNECTION_TIMEOUT_MS);
  });

  it("builds nothing until it is asked, so a build needs no DATABASE_URL", () => {
    resetDbForTests();
    delete process.env["DATABASE_URL"];
    // Importing the module must not have thrown; only calling it may.
    expect(() => db()).toThrow(/DATABASE_URL/u);
  });
});
