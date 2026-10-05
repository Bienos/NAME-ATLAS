import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import PlPage, { generateMetadata as plMetadata } from "../app/pl/raport/[id]/page.js";
import EnPage, { generateMetadata as enMetadata } from "../app/en/report/[id]/page.js";
import { middleware } from "../middleware.js";

/**
 * TASK-120 AC-1: both pages are a 404 unless the flag is `1`, and for an
 * address that is not a version's id, without reaching the database; with
 * the flag they are `noindex`; they are always `private, no-store`.
 */

const ID = "01920000-0000-7000-8000-000000000001";
const PAGES = [
  { lang: "pl", Page: PlPage, metadata: plMetadata, path: `/pl/raport/${ID}` },
  { lang: "en", Page: EnPage, metadata: enMetadata, path: `/en/report/${ID}` },
] as const;

afterEach(() => {
  vi.unstubAllEnvs();
});

const NOT_FOUND = { digest: expect.stringContaining("404") as unknown };

describe("the report preview's pages", () => {
  it("answer 404 with the flag unset or not exactly 1", async () => {
    for (const value of [undefined, "0", "true"]) {
      vi.stubEnv("REPORT_PREVIEW_ENABLED", value);
      for (const { lang, Page, metadata } of PAGES) {
        await expect(Page({ params: Promise.resolve({ id: ID }) }), lang).rejects.toMatchObject(
          NOT_FOUND,
        );
        expect(metadata(), lang).toEqual({});
      }
    }
  });

  it("answer 404 for an address that is not a version's id, and are noindex", async () => {
    vi.stubEnv("REPORT_PREVIEW_ENABLED", "1");
    vi.stubEnv("DATABASE_URL", undefined);
    for (const { lang, Page, metadata } of PAGES) {
      for (const id of ["nowak", "01920000-0000-7000-8000-00000000000Z", ""]) {
        await expect(
          Page({ params: Promise.resolve({ id }) }),
          `${lang} ${id}`,
        ).rejects.toMatchObject(NOT_FOUND);
      }
      expect(metadata().robots, lang).toEqual({ index: false, follow: false });
    }
  });

  it("are sent private, no-store; a surname page is not touched", () => {
    for (const { path } of PAGES) {
      const response = middleware(new NextRequest(`https://name-atlas.pl${path}`));
      expect(response.headers.get("cache-control"), path).toBe("private, no-store");
    }
    const surname = middleware(new NextRequest("https://name-atlas.pl/pl/nazwisko/nowak"));
    expect(surname.headers.get("cache-control")).toBeNull();
  });
});
