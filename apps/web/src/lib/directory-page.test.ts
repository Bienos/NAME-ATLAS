import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type * as Seo from "@name-atlas/seo";
import { directoryCount, directoryEntries, directoryLetters } from "@name-atlas/seo";
import {
  DirectoryLetterView,
  directoryMetadata,
  DirectoryRootView,
  loadDirectoryLetter,
  parseDirectoryPath,
} from "./directory-page.js";
import type { LetterPage } from "./directory-page.js";
import { SiteFooter } from "./site-footer.js";

/** TASK-129: the alphabetical surname directory. */

vi.mock("./db.js", () => ({ db: vi.fn(() => ({})) }));
vi.mock("./seo-surface.js", () => ({ seoBlockedProfileIds: vi.fn(async () => []) }));
vi.mock("@name-atlas/seo", async (importOriginal) => ({
  ...(await importOriginal<typeof Seo>()),
  directoryLetters: vi.fn(async () => ["k", "ł", "inne"]),
  directoryCount: vi.fn(async () => 1201),
  directoryEntries: vi.fn(async () => [
    { surname_id: "a", slug: "kowalska", display_name: "KOWALSKA" },
    { surname_id: "b", slug: "kowalski", display_name: "KOWALSKI" },
  ]),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("parseDirectoryPath", () => {
  it("reads the root, a letter and a later page", () => {
    expect(parseDirectoryPath(undefined)).toEqual({ kind: "ROOT" });
    expect(parseDirectoryPath([])).toEqual({ kind: "ROOT" });
    expect(parseDirectoryPath(["k"])).toEqual({ kind: "LETTER", letter: "k", page: 1 });
    expect(parseDirectoryPath(["k", "2"])).toEqual({ kind: "LETTER", letter: "k", page: 2 });
    expect(parseDirectoryPath(["inne", "3"])).toEqual({ kind: "LETTER", letter: "inne", page: 3 });
  });

  it("reads a Polish letter whether or not the segment arrives encoded", () => {
    expect(parseDirectoryPath(["%C5%82"])).toEqual({ kind: "LETTER", letter: "ł", page: 1 });
    expect(parseDirectoryPath(["ł"])).toEqual({ kind: "LETTER", letter: "ł", page: 1 });
  });

  it("redirects the other spellings of a page to its one address", () => {
    expect(parseDirectoryPath(["k", "1"])).toEqual({ kind: "REDIRECT", to: "/pl/nazwiska/k" });
    expect(parseDirectoryPath(["K"])).toEqual({ kind: "REDIRECT", to: "/pl/nazwiska/k" });
    expect(parseDirectoryPath(["K", "2"])).toEqual({ kind: "REDIRECT", to: "/pl/nazwiska/k/2" });
    expect(parseDirectoryPath(["%C5%81"])).toEqual({ kind: "REDIRECT", to: "/pl/nazwiska/%C5%82" });
    expect(parseDirectoryPath(["INNE"])).toEqual({ kind: "REDIRECT", to: "/pl/nazwiska/inne" });
    // "ś" as "s" and a combining acute is the same letter.
    expect(parseDirectoryPath(["ś"])).toEqual({ kind: "REDIRECT", to: "/pl/nazwiska/%C5%9B" });
  });

  it("finds nothing at any other address", () => {
    for (const segments of [
      ["kk"],
      ["1"],
      ["k", "0"],
      ["k", "01"],
      ["k", "x"],
      ["k", "2", "3"],
      ["%"],
    ]) {
      expect(parseDirectoryPath(segments), segments.join("/")).toEqual({ kind: "NOT_FOUND" });
    }
  });
});

describe("loadDirectoryLetter", () => {
  it("reads one page of 500 at its offset and counts the pages", async () => {
    const data = await loadDirectoryLetter("k", 3);
    expect(vi.mocked(directoryEntries)).toHaveBeenCalledWith({}, "pl", "k", {
      seoBlockedProfileIds: [],
      limit: 500,
      offset: 1000,
    });
    expect(vi.mocked(directoryCount)).toHaveBeenCalledWith({}, "pl", "k", {
      seoBlockedProfileIds: [],
    });
    expect(data.pages).toBe(3);
    expect(data.letters).toEqual(["k", "ł", "inne"]);
  });

  it("asks the database one query at a time (TASK-130)", async () => {
    // The pool has two connections per instance and waits 5 s for one; on
    // production three at once timed out on `inne`.
    let open = 0;
    let most = 0;
    const query =
      <T>(value: T) =>
      async (): Promise<T> => {
        open += 1;
        most = Math.max(most, open);
        await new Promise((resolve) => setTimeout(resolve, 5));
        open -= 1;
        return value;
      };
    vi.mocked(directoryLetters).mockImplementationOnce(query(["k" as const]));
    vi.mocked(directoryCount).mockImplementationOnce(query(1201));
    vi.mocked(directoryEntries).mockImplementationOnce(query([]));
    await loadDirectoryLetter("k", 1);
    expect(vi.mocked(directoryEntries)).toHaveBeenCalledTimes(1);
    expect(most).toBe(1);
  });

  it("does not read entries for a page past the last", async () => {
    const data = await loadDirectoryLetter("k", 4);
    expect(vi.mocked(directoryEntries)).not.toHaveBeenCalled();
    expect(data).toMatchObject({ count: 1201, pages: 3, entries: [] });
  });
});

describe("directoryMetadata", () => {
  it("is the page's own canonical and indexable when indexing is on", async () => {
    vi.stubEnv("SITE_ORIGIN", "https://name-atlas.pl");
    vi.stubEnv("SEO_INDEXING_ENABLED", "true");
    const root = await directoryMetadata({ kind: "ROOT" });
    expect(root.title).toBe("Nazwiska od A do Ż | Name Atlas");
    expect(root.alternates?.canonical).toBe("https://name-atlas.pl/pl/nazwiska");
    expect(root.robots).toEqual({ index: true, follow: true });
    const page = await directoryMetadata({ kind: "LETTER", letter: "k", page: 2 });
    expect(page.title).toBe("Nazwiska na literę K, strona 2 | Name Atlas");
    expect(page.description).toBe(
      "Nazwiska na literę K w Name Atlas: 1\u00a0201. Przy każdym: ile osób je nosi i gdzie w Polsce występuje.",
    );
    expect(page.alternates?.canonical).toBe("https://name-atlas.pl/pl/nazwiska/k/2");
    expect(page.robots).toEqual({ index: true, follow: true });
  });

  it("is noindex, follow while indexing is off, and when the directory is empty", async () => {
    vi.stubEnv("SEO_INDEXING_ENABLED", "");
    expect((await directoryMetadata({ kind: "LETTER", letter: "k", page: 1 })).robots).toEqual({
      index: false,
      follow: true,
    });
    vi.stubEnv("SEO_INDEXING_ENABLED", "true");
    vi.mocked(directoryLetters).mockResolvedValueOnce([]);
    expect((await directoryMetadata({ kind: "ROOT" })).robots).toEqual({
      index: false,
      follow: true,
    });
  });

  it("names nothing for a page past the last, which the page answers with a 404", async () => {
    expect(await directoryMetadata({ kind: "LETTER", letter: "k", page: 9 })).toEqual({});
  });
});

const PAGE: LetterPage = {
  letters: ["k", "ł", "inne"],
  count: 1201,
  pages: 3,
  entries: [
    { surname_id: "a", slug: "kowalska", display_name: "KOWALSKA" },
    { surname_id: "b", slug: "kowalski", display_name: "KOWALSKI" },
  ],
};

describe("the directory's pages", () => {
  it("list each surname as a plain link to its page, with the letters and the pages", () => {
    vi.stubEnv("SITE_ORIGIN", "");
    const html = renderToStaticMarkup(
      createElement(DirectoryLetterView, { letter: "k", page: 2, data: PAGE }),
    );
    expect(html).toContain('<h1 class="page-title">Nazwiska na literę K</h1>');
    // The count grouped with a no-break space, as `formatInteger` writes it.
    expect(html).toContain("1\u00a0201 nazwisk. Strona 2 z 3: od KOWALSKA do KOWALSKI.");
    expect(html).toContain('<li><a href="/pl/nazwisko/kowalska">KOWALSKA</a></li>');
    expect(html).toContain('<li><a href="/pl/nazwisko/kowalski">KOWALSKI</a></li>');
    expect(html).toContain('<a href="/pl/nazwiska/k" aria-current="true">K</a>');
    expect(html).toContain('<a href="/pl/nazwiska/%C5%82">Ł</a>');
    expect(html).toContain('<a href="/pl/nazwiska/inne">Inne</a>');
    expect(html).toContain('<li><a href="/pl/nazwiska/k">1</a></li>');
    expect(html).toContain('<li><span aria-current="page">2</span></li>');
    expect(html).toContain('<li><a href="/pl/nazwiska/k/3">3</a></li>');
    expect(html).toMatch(
      /<nav class="breadcrumbs" aria-label="Ścieżka nawigacyjna"><ol><li><a href="\/">Name Atlas<\/a><\/li><li><a href="\/pl\/nazwiska">Nazwiska<\/a><\/li><li><a href="\/pl\/nazwiska\/k">Nazwiska na literę K<\/a><\/li><li aria-current="page">Strona 2<\/li><\/ol><\/nav>/u,
    );
    // No JSON-LD without the canonical origin.
    expect(html).not.toContain("application/ld+json");
  });

  it("describe a letter page as a CollectionPage with its breadcrumb", () => {
    vi.stubEnv("SITE_ORIGIN", "https://name-atlas.pl");
    const html = renderToStaticMarkup(
      createElement(DirectoryLetterView, { letter: "k", page: 1, data: { ...PAGE, pages: 1 } }),
    );
    const script = /<script type="application\/ld\+json">(.*?)<\/script>/u.exec(html)?.[1];
    const graph = (JSON.parse(script ?? "{}") as { "@graph": Record<string, unknown>[] })["@graph"];
    expect(graph[0]).toMatchObject({
      "@type": "CollectionPage",
      url: "https://name-atlas.pl/pl/nazwiska/k",
      name: "Nazwiska na literę K",
      inLanguage: "pl",
    });
    expect(graph[1]?.["itemListElement"]).toHaveLength(3);
    // One page: no page links.
    expect(html).not.toContain("directory-pages");
  });

  it("open on the letters", () => {
    const html = renderToStaticMarkup(
      createElement(DirectoryRootView, { letters: ["a", "ż", "inne"] }),
    );
    expect(html).toContain('<h1 class="page-title">Nazwiska od A do Ż</h1>');
    expect(html).toContain('<a href="/pl/nazwiska/a">A</a>');
    expect(html).toContain('<a href="/pl/nazwiska/%C5%BC">Ż</a>');
    expect(html).toContain('<a href="/pl/nazwiska/inne">Inne</a>');
    expect(html).not.toMatch(/directory-letters.*aria-current/u);
  });

  it("are linked from the Polish footer, and only from it", () => {
    expect(renderToStaticMarkup(createElement(SiteFooter, { lang: "pl" }))).toContain(
      '<a href="/pl/nazwiska">Nazwiska A–Ż</a>',
    );
    expect(renderToStaticMarkup(createElement(SiteFooter, { lang: "en" }))).not.toContain(
      "/pl/nazwiska",
    );
  });
});
