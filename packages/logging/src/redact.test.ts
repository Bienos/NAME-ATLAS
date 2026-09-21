import { describe, expect, it } from "vitest";
import { REDACTED, redact, scrubCredentials } from "./redact.js";

/** TASK-019. Each rule here is a thing that must never reach a log file. */

describe("scrubCredentials", () => {
  it("removes the credentials from a connection string and keeps the host", () => {
    expect(scrubCredentials("postgres://atlas:atlas@localhost:5432/name_atlas_dev")).toBe(
      `postgres://${REDACTED}@localhost:5432/name_atlas_dev`,
    );
  });

  it("scrubs a connection string buried in an error message", () => {
    // This is how a password actually reaches a log: inside pg's own message,
    // not in a field somebody named "password".
    const message =
      'connection to server at "localhost" failed for postgres://atlas:hunter2@localhost:5432/db';
    expect(scrubCredentials(message)).not.toContain("hunter2");
    expect(scrubCredentials(message)).toContain("localhost:5432/db");
  });

  it("scrubs every occurrence, not just the first", () => {
    const two = "a://u:p@h1 and b://u2:p2@h2";
    const out = scrubCredentials(two);
    expect(out).not.toContain(":p@");
    expect(out).not.toContain(":p2@");
  });

  it("leaves a URL without credentials alone", () => {
    const url = "https://api.dane.gov.pl/resources/1148808/csv";
    expect(scrubCredentials(url)).toBe(url);
  });

  it("leaves ordinary prose alone", () => {
    expect(scrubCredentials("NOWAK resolved EXACT in 7 ms")).toBe("NOWAK resolved EXACT in 7 ms");
  });
});

describe("redact by field name", () => {
  it("redacts a secret-named field whatever its type", () => {
    const out = redact({
      password: "hunter2",
      api_key: 12_345,
      authorization: ["Bearer x"],
      cookie: { session: "abc" },
      DATABASE_URL: "postgres://u:p@h/db",
      email: "someone@example.com",
    }) as Record<string, unknown>;
    for (const key of ["password", "api_key", "authorization", "cookie", "DATABASE_URL", "email"]) {
      expect(out[key]).toBe(REDACTED);
    }
  });

  it("matches case-insensitively and as a substring", () => {
    const out = redact({
      userPassword: "x",
      REFRESH_TOKEN: "y",
      billing_email_address: "z",
    }) as Record<string, unknown>;
    expect(Object.values(out)).toEqual([REDACTED, REDACTED, REDACTED]);
  });

  it("keeps a published source URL, which is not a secret and is useful", () => {
    const out = redact({ source_url: "https://api.dane.gov.pl/resources/1148808/csv" }) as Record<
      string,
      unknown
    >;
    expect(out["source_url"]).toBe("https://api.dane.gov.pl/resources/1148808/csv");
  });

  it("redacts nested fields", () => {
    const out = redact({ db: { config: { password: "x", host: "localhost" } } }) as {
      db: { config: Record<string, unknown> };
    };
    expect(out.db.config["password"]).toBe(REDACTED);
    expect(out.db.config["host"]).toBe("localhost");
  });
});

describe("redact of errors and awkward values", () => {
  it("reduces an Error to name, message and a scrubbed stack", () => {
    const error = new Error("failed for postgres://u:secret@h/db");
    const out = redact(error) as Record<string, unknown>;
    expect(out["name"]).toBe("Error");
    expect(String(out["message"])).not.toContain("secret");
    expect(String(out["stack"] ?? "")).not.toContain("secret");
  });

  it("replaces a cycle rather than throwing", () => {
    const cyclic: Record<string, unknown> = { name: "x" };
    cyclic["self"] = cyclic;
    const out = redact(cyclic) as Record<string, unknown>;
    expect(out["name"]).toBe("x");
    expect(out["self"]).toBe("[circular]");
  });

  it("caps depth rather than recursing forever", () => {
    let deep: unknown = "bottom";
    for (let i = 0; i < 12; i += 1) deep = { deep };
    expect(JSON.stringify(redact(deep))).toContain("[depth limit]");
  });

  it("passes through primitives untouched", () => {
    expect(redact(42)).toBe(42);
    expect(redact(true)).toBe(true);
    expect(redact(null)).toBeNull();
    expect(redact(undefined)).toBeUndefined();
  });

  it("scrubs strings inside arrays", () => {
    const out = redact(["postgres://u:p@h/db"]) as string[];
    expect(out[0]).not.toContain(":p@");
  });
});
