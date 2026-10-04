import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import PlPage, { generateMetadata as plMetadata } from "../app/pl/para/page.js";
import EnPage, { generateMetadata as enMetadata } from "../app/en/couple/page.js";
import { middleware } from "../middleware.js";
import { UI } from "./messages.js";

/**
 * TASK-100 AC-1 and AC-5: both pages are a 404 unless the flag is `1`; on,
 * they answer (here: the picker, which needs no database); they are `noindex`
 * and `private, no-store`.
 */

const PAGES = [
  { lang: "pl", Page: PlPage, metadata: plMetadata, path: "/pl/para" },
  { lang: "en", Page: EnPage, metadata: enMetadata, path: "/en/couple" },
] as const;

const NO_QUERY = { searchParams: Promise.resolve({}) };

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the couple report's pages", () => {
  it("answer 404 with the flag unset or not exactly 1", async () => {
    for (const value of [undefined, "0", "true"]) {
      if (value === undefined) vi.stubEnv("COUPLE_REPORT_ENABLED", undefined);
      else vi.stubEnv("COUPLE_REPORT_ENABLED", value);
      for (const { lang, Page, metadata } of PAGES) {
        await expect(Page(NO_QUERY), `${lang} ${String(value)}`).rejects.toMatchObject({
          digest: expect.stringContaining("404") as unknown,
        });
        expect(metadata(), lang).toEqual({});
      }
    }
  });

  it("answer with the flag 1, noindex", async () => {
    vi.stubEnv("COUPLE_REPORT_ENABLED", "1");
    for (const { lang, Page, metadata } of PAGES) {
      const html = renderToStaticMarkup((await Page(NO_QUERY)) as ReactElement);
      expect(html, lang).toContain(UI[lang].coupleHeading);
      expect(metadata().robots, lang).toEqual({ index: false, follow: false });
    }
  });

  it("turn typed surnames into the couple's own address", async () => {
    vi.stubEnv("COUPLE_REPORT_ENABLED", "1");
    await expect(
      PlPage({ searchParams: Promise.resolve({ qa: "Nowak", qb: "Kowalski" }) }),
    ).rejects.toMatchObject({
      digest: expect.stringContaining("/pl/para?a=nowak&b=kowalski") as unknown,
    });
  });

  it("are sent private, no-store, on or off; the comparison is not touched", () => {
    for (const { path } of PAGES) {
      const response = middleware(
        new NextRequest(`https://name-atlas.pl${path}?a=nowak&b=kowalski`),
      );
      expect(response.headers.get("cache-control"), path).toBe("private, no-store");
    }
    const compare = middleware(
      new NextRequest("https://name-atlas.pl/pl/porownaj?a=nowak&b=kowalski"),
    );
    expect(compare.headers.get("cache-control")).toBeNull();
  });
});
