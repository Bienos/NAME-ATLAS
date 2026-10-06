import { cache } from "react";
import type { Metadata } from "next";
import {
  DIRECTORY_PAGE_SIZE,
  directoryCount,
  directoryEntries,
  directoryLetters,
  isDirectoryLetter,
} from "@name-atlas/seo";
import type { DirectoryEntry, DirectoryLetter } from "@name-atlas/seo";
import { db } from "./db.js";
import { seoBlockedProfileIds } from "./seo-surface.js";
import { indexingEnabled, siteOrigin } from "./seo.js";
import { SiteShell } from "./site-shell.js";
import { Breadcrumbs } from "./breadcrumbs.js";
import { DIRECTORY_PATH, directoryLetterPath } from "./site-links.js";
import { pageSlug, pathForSlug } from "./slug.js";
import { jsonLd, SITE_NAME, surnamePageGraph } from "./structured-data.js";
import type { Crumb } from "./structured-data.js";
import {
  DIRECTORY_HEADING,
  DIRECTORY_LEDE,
  DIRECTORY_LETTERS_LABEL,
  DIRECTORY_NAME,
  DIRECTORY_PAGES_LABEL,
  letterDescription,
  letterHeading,
  letterLabel,
  letterLede,
  letterPageName,
  letterTitle,
} from "./directory-text.js";

/**
 * The alphabetical surname directory (TASK-129; `docs/canonical/21` §111–§114):
 * `/pl/nazwiska`, `/pl/nazwiska/k`, `/pl/nazwiska/k/2`.
 *
 * It lists what the sitemap lists, through the same query (`@name-atlas/seo`'s
 * `directory.ts`), as ordinary links in server-rendered HTML, so a crawler
 * reaches each of those surname pages from the footer through the letter and
 * its page (§237). Each page is its own canonical, and indexable when indexing
 * is on and it lists something (§114).
 */

/** What an address under `/pl/nazwiska` asks for. */
export type DirectoryRequest =
  | { readonly kind: "ROOT" }
  | { readonly kind: "LETTER"; readonly letter: DirectoryLetter; readonly page: number }
  | { readonly kind: "REDIRECT"; readonly to: string }
  | { readonly kind: "NOT_FOUND" };

const NOT_FOUND: DirectoryRequest = { kind: "NOT_FOUND" };

/**
 * The route's segments, read. One address per page: `/K` and `/k/1` are
 * redirects to `/k`; anything else that is not a letter and a page number from
 * 2 is not found. Each segment is decoded once, as `pageSlug` explains.
 */
export function parseDirectoryPath(segments: readonly string[] | undefined): DirectoryRequest {
  if (segments === undefined || segments.length === 0) return { kind: "ROOT" };
  if (segments.length > 2) return NOT_FOUND;
  const [rawLetter = "", rawPage] = segments;
  const asked = pageSlug(rawLetter);
  const letter = asked.normalize("NFC").toLocaleLowerCase("pl");
  if (!isDirectoryLetter(letter)) return NOT_FOUND;
  if (rawPage !== undefined && !/^[1-9][0-9]{0,5}$/u.test(rawPage)) return NOT_FOUND;
  const page = rawPage === undefined ? 1 : Number(rawPage);
  if (letter !== asked || rawPage === "1") {
    return { kind: "REDIRECT", to: directoryLetterPath(letter, page) };
  }
  return { kind: "LETTER", letter, page };
}

export interface LetterPage {
  readonly letters: readonly DirectoryLetter[];
  readonly count: number;
  readonly pages: number;
  readonly entries: readonly DirectoryEntry[];
}

// `cache`: the metadata and the page read the same rows once per render.
const blockedProfiles = cache(() => seoBlockedProfileIds(db()));

export const loadDirectoryLetters = cache(async (): Promise<readonly DirectoryLetter[]> =>
  directoryLetters(db(), "pl", { seoBlockedProfileIds: await blockedProfiles() }),
);

/**
 * One query at a time (TASK-130). The pool holds two connections per instance
 * and waits at most 5 s for one (`db.ts`). Three at once left the third waiting
 * while the other two ran, and on production `inne`'s count, which reads every
 * listed surname, outlasted that wait: the page answered 500.
 */
export const loadDirectoryLetter = cache(
  async (letter: DirectoryLetter, page: number): Promise<LetterPage> => {
    const options = { seoBlockedProfileIds: await blockedProfiles() };
    const letters = await loadDirectoryLetters();
    const count = await directoryCount(db(), "pl", letter, options);
    const offset = (page - 1) * DIRECTORY_PAGE_SIZE;
    // A page past the last lists nothing, and is a 404 without asking.
    const entries =
      offset < count
        ? await directoryEntries(db(), "pl", letter, {
            ...options,
            limit: DIRECTORY_PAGE_SIZE,
            offset,
          })
        : [];
    return { letters, count, pages: Math.ceil(count / DIRECTORY_PAGE_SIZE), entries };
  },
);

/** A directory page's own canonical, and `index` only when indexing is on and it lists something. */
function directoryPageMetadata(
  path: string,
  title: string,
  description: string,
  listed: boolean,
): Metadata {
  const origin = siteOrigin();
  const canonical = origin === null ? path : `${origin}${path}`;
  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: listed && indexingEnabled(), follow: true },
    openGraph: { title, description, url: canonical, type: "website", locale: "pl_PL" },
  };
}

export async function directoryMetadata(request: DirectoryRequest): Promise<Metadata> {
  if (request.kind === "ROOT") {
    const letters = await loadDirectoryLetters();
    return directoryPageMetadata(
      DIRECTORY_PATH,
      `${DIRECTORY_HEADING} | ${SITE_NAME}`,
      DIRECTORY_LEDE,
      letters.length > 0,
    );
  }
  if (request.kind !== "LETTER") return {};
  const data = await loadDirectoryLetter(request.letter, request.page);
  // An empty page is a 404, which the page itself answers.
  if (data.entries.length === 0) return {};
  return directoryPageMetadata(
    directoryLetterPath(request.letter, request.page),
    letterTitle(request.letter, request.page),
    letterDescription(request.letter, data.count),
    true,
  );
}

const ROOT_CRUMBS: readonly Crumb[] = [
  { name: SITE_NAME, path: "/" },
  { name: DIRECTORY_NAME, path: DIRECTORY_PATH },
];

function letterCrumbs(letter: DirectoryLetter, page: number): readonly Crumb[] {
  const first = { name: letterHeading(letter), path: directoryLetterPath(letter) };
  return page > 1
    ? [
        ...ROOT_CRUMBS,
        first,
        { name: `Strona ${String(page)}`, path: directoryLetterPath(letter, page) },
      ]
    : [...ROOT_CRUMBS, first];
}

/** The page's `CollectionPage` and breadcrumb, only where the canonical origin is known. */
function Graph(props: {
  path: string;
  name: string;
  description: string;
  crumbs: readonly Crumb[];
}) {
  const origin = siteOrigin();
  if (origin === null) return null;
  const graph = jsonLd(surnamePageGraph({ ...props, origin, lang: "pl", type: "CollectionPage" }));
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: graph }} />;
}

function LetterNav({
  letters,
  current,
}: {
  letters: readonly DirectoryLetter[];
  current: DirectoryLetter | null;
}) {
  return (
    <nav className="directory-letters" aria-label={DIRECTORY_LETTERS_LABEL}>
      <ul>
        {letters.map((letter) => (
          <li key={letter}>
            <a
              href={directoryLetterPath(letter)}
              aria-current={letter === current ? "true" : undefined}
            >
              {letterLabel(letter)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function PageNav({
  letter,
  page,
  pages,
}: {
  letter: DirectoryLetter;
  page: number;
  pages: number;
}) {
  return (
    <nav className="directory-pages" aria-label={DIRECTORY_PAGES_LABEL}>
      <ol>
        {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
          <li key={n}>
            {n === page ? (
              <span aria-current="page">{n}</span>
            ) : (
              <a href={directoryLetterPath(letter, n)}>{n}</a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function DirectoryRootView({ letters }: { letters: readonly DirectoryLetter[] }) {
  return (
    <SiteShell
      lang="pl"
      otherPath="/?lang=en"
      world={{ mode: "quiet" }}
      mainClassName="reading directory"
    >
      <Breadcrumbs crumbs={ROOT_CRUMBS} lang="pl" />
      <Graph
        path={DIRECTORY_PATH}
        name={DIRECTORY_HEADING}
        description={DIRECTORY_LEDE}
        crumbs={ROOT_CRUMBS}
      />
      <h1 className="page-title">{DIRECTORY_HEADING}</h1>
      <p className="page-lede">{DIRECTORY_LEDE}</p>
      <LetterNav letters={letters} current={null} />
    </SiteShell>
  );
}

export function DirectoryLetterView({
  letter,
  page,
  data,
}: {
  letter: DirectoryLetter;
  page: number;
  data: LetterPage;
}) {
  const path = directoryLetterPath(letter, page);
  const crumbs = letterCrumbs(letter, page);
  const first = data.entries[0]?.display_name ?? "";
  const last = data.entries[data.entries.length - 1]?.display_name ?? "";
  return (
    <SiteShell
      lang="pl"
      otherPath="/?lang=en"
      world={{ mode: "quiet" }}
      mainClassName="reading directory"
    >
      <Breadcrumbs crumbs={crumbs} lang="pl" />
      <Graph
        path={path}
        name={letterPageName(letter, page)}
        description={letterDescription(letter, data.count)}
        crumbs={crumbs}
      />
      <h1 className="page-title">{letterHeading(letter)}</h1>
      <p className="page-lede">{letterLede(data.count, page, data.pages, first, last)}</p>
      <LetterNav letters={data.letters} current={letter} />
      <ul className="directory-list">
        {data.entries.flatMap((entry) => {
          const href = pathForSlug(entry.slug, "pl");
          return href === null
            ? []
            : [
                <li key={entry.surname_id}>
                  <a href={href}>{entry.display_name}</a>
                </li>,
              ];
        })}
      </ul>
      {data.pages > 1 ? <PageNav letter={letter} page={page} pages={data.pages} /> : null}
    </SiteShell>
  );
}
