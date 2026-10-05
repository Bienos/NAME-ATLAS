import { describe, expect, it } from "vitest";
import {
  isReportPath,
  REPORT_CACHE_CONTROL,
  REPORT_PREVIEW_ENV,
  reportPath,
  reportPreviewEnabled,
} from "./report-config.js";

/** TASK-120 AC-1: the preview is dark unless the variable is exactly `1`. */
describe("reportPreviewEnabled", () => {
  it("is on only when REPORT_PREVIEW_ENABLED is exactly 1", () => {
    expect(REPORT_PREVIEW_ENV).toBe("REPORT_PREVIEW_ENABLED");
    expect(reportPreviewEnabled({ REPORT_PREVIEW_ENABLED: "1" })).toBe(true);
    for (const value of [undefined, "", "0", "true", "yes", " 1", "1 ", "01"]) {
      expect(reportPreviewEnabled({ REPORT_PREVIEW_ENABLED: value }), String(value)).toBe(false);
    }
    expect(reportPreviewEnabled({})).toBe(false);
  });
});

describe("the preview's paths and cache header", () => {
  it("knows a version's address in both languages, and nothing else", () => {
    const id = "01920000-0000-7000-8000-000000000001";
    expect(reportPath(id, "pl")).toBe(`/pl/raport/${id}`);
    expect(reportPath(id, "en")).toBe(`/en/report/${id}`);
    expect(isReportPath(`/pl/raport/${id}`)).toBe(true);
    expect(isReportPath(`/en/report/${id}`)).toBe(true);
    for (const path of ["/pl/raport", "/pl/raport/", "/en/reports/x", "/pl/raporty/x", "/"]) {
      expect(isReportPath(path), path).toBe(false);
    }
  });

  it("is private and never stored", () => {
    expect(REPORT_CACHE_CONTROL).toBe("private, no-store");
  });
});
