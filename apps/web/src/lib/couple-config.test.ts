import { describe, expect, it } from "vitest";
import {
  COUPLE_CACHE_CONTROL,
  COUPLE_REPORT_ENV,
  coupleReportEnabled,
  isCouplePath,
} from "./couple-config.js";

/** TASK-100 §3.1: the couple report is dark unless the variable is exactly `1`. */
describe("coupleReportEnabled", () => {
  it("is on only when COUPLE_REPORT_ENABLED is exactly 1", () => {
    expect(COUPLE_REPORT_ENV).toBe("COUPLE_REPORT_ENABLED");
    expect(coupleReportEnabled({ COUPLE_REPORT_ENABLED: "1" })).toBe(true);
    for (const value of [undefined, "", "0", "true", "yes", " 1", "1 ", "01"]) {
      expect(coupleReportEnabled({ COUPLE_REPORT_ENABLED: value }), String(value)).toBe(false);
    }
    expect(coupleReportEnabled({})).toBe(false);
  });
});

describe("the couple report's paths and cache header", () => {
  it("knows its two pages and nothing else", () => {
    expect(isCouplePath("/pl/para")).toBe(true);
    expect(isCouplePath("/en/couple")).toBe(true);
    for (const path of ["/pl/porownaj", "/en/compare", "/pl/para/x", "/pl/parafia", "/"]) {
      expect(isCouplePath(path), path).toBe(false);
    }
  });

  it("is private and never stored", () => {
    expect(COUPLE_CACHE_CONTROL).toBe("private, no-store");
  });
});
