import { describe, expect, it } from "vitest";
import { loadDbConfig, MissingDatabaseUrlError } from "./config.js";

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
