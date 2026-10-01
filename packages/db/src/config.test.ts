import { describe, expect, it } from "vitest";
import { loadAccountsDbConfig, loadDbConfig, MissingDatabaseUrlError } from "./config.js";

describe("loadDbConfig", () => {
  it("reads DATABASE_URL from the given environment map", () => {
    const config = loadDbConfig({
      DATABASE_URL: "postgres://user:pass@localhost:5432/name_atlas",
    });
    expect(config.databaseUrl).toBe("postgres://user:pass@localhost:5432/name_atlas");
  });

  it("throws MissingDatabaseUrlError when DATABASE_URL is unset", () => {
    expect(() => loadDbConfig({})).toThrow(MissingDatabaseUrlError);
  });

  it("throws MissingDatabaseUrlError when DATABASE_URL is empty", () => {
    expect(() => loadDbConfig({ DATABASE_URL: "  " })).toThrow(MissingDatabaseUrlError);
  });
});

describe("loadAccountsDbConfig (TASK-061)", () => {
  it("reads ACCOUNTS_DATABASE_URL, trimmed", () => {
    expect(
      loadAccountsDbConfig({ ACCOUNTS_DATABASE_URL: " postgres://app@localhost:6432/name_atlas " }),
    ).toEqual({ databaseUrl: "postgres://app@localhost:6432/name_atlas" });
  });

  it("is null, meaning accounts are off, when it is unset or blank", () => {
    expect(loadAccountsDbConfig({})).toBeNull();
    expect(loadAccountsDbConfig({ ACCOUNTS_DATABASE_URL: "   " })).toBeNull();
  });

  it("never falls back to DATABASE_URL, whose role is read-only and must not reach accounts", () => {
    expect(
      loadAccountsDbConfig({ DATABASE_URL: "postgres://web@localhost:6432/name_atlas" }),
    ).toBeNull();
  });
});
