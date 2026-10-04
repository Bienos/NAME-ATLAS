import type { ReactNode } from "react";
import type { SurnameResultResponse } from "@name-atlas/contracts";
import { formatDate, formatInteger, partitionLabel, UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { Bearers, Change, Distribution, Localities, Meaning, Population } from "./result-view.js";
import { SiteShell } from "./site-shell.js";
import { ComparePicker } from "./compare-view.js";
import type { ComparisonSide, PickerCopy } from "./compare-view.js";
import { comparisonPath } from "./compare-request.js";
import { COUPLE_PATHS } from "./couple-config.js";
import type { NameRow } from "./couple.js";

/**
 * The couple report (TASK-100, ADR-0035): "Wasze nazwiska razem".
 *
 * Two surnames' existing facts side by side, in ADR-0035 §2.2's order: the
 * names a couple could carry, where each name lives, how common each is and
 * its change, what each means, then famous bearers and localities of the same
 * name. Each side is the surname page's own chapter for that surname, rendered
 * as that page renders it. Nothing is computed from the two together: no
 * score, no overlap, no shared region, no figure of the pair (§2.3).
 *
 * Dark behind `COUPLE_REPORT_ENABLED`, `noindex`, `private, no-store`, and in
 * no sitemap; the routes and the middleware hold those.
 */

/** `/pl/para?a=…&b=…` or `/en/couple?a=…&b=…`, the slugs URL-encoded. */
export function couplePath(a: string, b: string, lang: Lang): string {
  return `${COUPLE_PATHS[lang]}?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`;
}

/** The comparison's picker, with the couple's address and words. */
export function CouplePicker({
  lang,
  first,
  second,
  error,
}: {
  lang: Lang;
  first: string;
  second: string;
  error: boolean;
}) {
  const t = UI[lang];
  const copy: PickerCopy = {
    action: COUPLE_PATHS[lang],
    otherPath: COUPLE_PATHS[lang === "pl" ? "en" : "pl"],
    heading: t.coupleHeading,
    intro: t.coupleIntro,
    submit: t.coupleAction,
  };
  return <ComparePicker lang={lang} first={first} second={second} error={error} copy={copy} />;
}

/** As the comparison bounds it: the slug is from the query string. */
function displayFor(side: ComparisonSide): string {
  if (side.display !== null) return side.display;
  const slug = side.slug.trim();
  if (slug === "") return "—";
  return slug.length > 40 ? `${slug.slice(0, 40)}…` : slug;
}

/** The names list: one row per list a name is on, or one row saying it is not on one. */
function Names({ rows, lang }: { rows: readonly NameRow[]; lang: Lang }) {
  const t = UI[lang];
  return (
    <section id="couple-names" className="couple-part">
      <h3>{t.coupleNamesHeading}</h3>
      <p className="note">{t.coupleNamesNote}</p>
      <div className="table-scroll" tabIndex={0} role="region" aria-label={t.coupleNamesHeading}>
        <table className="couple-names">
          <thead>
            <tr>
              <th scope="col">{t.searchLabel}</th>
              <th scope="col">{t.countColumn}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} data-kind={row.kind}>
                <th scope="row">{row.name}</th>
                <td>
                  {row.kind === "LISTED" ? (
                    <ul className="couple-counts">
                      {row.counts.map((count) => {
                        const label = partitionLabel(count.group, lang);
                        return (
                          <li key={`${String(count.group)}-${count.snapshot_date}`}>
                            {formatInteger(count.count, lang)}
                            {label === null ? "" : ` (${label})`}
                            {", "}
                            {formatDate(count.snapshot_date, lang)}
                          </li>
                        );
                      })}
                    </ul>
                  ) : row.kind === "NOT_LISTED" ? (
                    <span className="absent">{t.coupleNotListed}</span>
                  ) : (
                    <span className="absent">{t.noFigures}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** One part of the report: its heading, then each surname's own chapter, side by side. */
function Part({
  id,
  heading,
  sides,
}: {
  id: string;
  heading: string;
  sides: readonly { readonly name: string; readonly body: ReactNode }[];
}) {
  return (
    <section id={id} className="couple-part">
      <h3>{heading}</h3>
      <div className="couple-sides">
        {sides.map((side, index) => (
          <div className="couple-side" key={`${side.name}-${String(index)}`}>
            <h4>{side.name}</h4>
            {side.body}
          </div>
        ))}
      </div>
    </section>
  );
}

/** What a side shows where its result has no such section. */
function Nothing({ lang }: { lang: Lang }) {
  return <p className="absent">{UI[lang].noFigures}</p>;
}

export function CoupleView({
  a,
  b,
  names,
  lang,
}: {
  a: ComparisonSide;
  b: ComparisonSide;
  /** One register lookup per name the couple could carry (`couple.ts`). */
  names: readonly NameRow[];
  lang: Lang;
}) {
  const t = UI[lang];
  const resolved =
    a.response !== null &&
    b.response !== null &&
    a.response.status === "RESOLVED" &&
    b.response.status === "RESOLVED" &&
    a.response.surname !== null &&
    b.response.surname !== null;
  const sides: readonly (readonly [string, string, SurnameResultResponse | null])[] = [
    ["a", displayFor(a), a.response],
    ["b", displayFor(b), b.response],
  ];
  const each = (
    body: (key: string, name: string, response: SurnameResultResponse) => ReactNode,
  ): { name: string; body: ReactNode }[] =>
    sides.map(([key, name, response]) => ({
      name,
      body: response === null ? <Nothing lang={lang} /> : body(key, name, response),
    }));

  return (
    <SiteShell
      lang={lang}
      otherPath={couplePath(a.slug, b.slug, lang === "pl" ? "en" : "pl")}
      world={{ mode: "quiet" }}
      search={{ query: "" }}
      mainClassName="compare couple"
    >
      <h1 className="page-title">{t.coupleHeading}</h1>
      <h2 className="surname compare-heading">
        {displayFor(a)}
        <span className="versus"> &amp; </span>
        {displayFor(b)}
      </h2>
      <p className="warning">{t.coupleNote}</p>

      {!resolved ? (
        <section>
          <h3>{t.unresolvedHeading}</h3>
          <p className="absent">
            {[a, b]
              .filter((side) => side.response === null || side.response.status !== "RESOLVED")
              .map((side) => displayFor(side))
              .join(", ")}
            {" — "}
            {t.slugUnknownBody}
          </p>
        </section>
      ) : (
        <>
          <Names rows={names} lang={lang} />

          <Part
            id="couple-map"
            heading={t.coupleWhereHeading}
            sides={each((key, name, response) =>
              response.distribution === null ? (
                <Nothing lang={lang} />
              ) : (
                <Distribution
                  section={response.distribution}
                  surname={name}
                  number={2}
                  next={null}
                  lang={lang}
                  anchor={`map-${key}`}
                />
              ),
            )}
          />

          <Part
            id="couple-count"
            heading={t.coupleCommonHeading}
            sides={each((key, name, response) => (
              <>
                {response.population === null ? (
                  <Nothing lang={lang} />
                ) : (
                  <Population
                    section={response.population}
                    surname={name}
                    number={3}
                    next={null}
                    lang={lang}
                    anchor={`count-${key}`}
                  />
                )}
                {/* Hidden where there is no claim, as on the surname page. */}
                {response.change === null || response.change.state === "UNAVAILABLE" ? null : (
                  <Change
                    section={response.change}
                    surname={name}
                    number={3}
                    next={null}
                    lang={lang}
                    anchor={`change-${key}`}
                  />
                )}
              </>
            ))}
          />

          <Part
            id="couple-meaning"
            heading={t.coupleMeaningHeading}
            sides={each((key, _name, response) =>
              response.meaning === null ? (
                <Nothing lang={lang} />
              ) : (
                <Meaning
                  section={response.meaning}
                  number={4}
                  next={null}
                  lang={lang}
                  anchor={`meaning-${key}`}
                />
              ),
            )}
          />

          <Part
            id="couple-bearers"
            heading={t.coupleBearersHeading}
            sides={each((key, name, response) => {
              const { bearers, localities } = response;
              return (
                <>
                  {bearers === null ? (
                    <Nothing lang={lang} />
                  ) : (
                    <Bearers
                      section={bearers}
                      surname={name}
                      number={5}
                      next={null}
                      lang={lang}
                      anchor={`bearers-${key}`}
                    />
                  )}
                  {/* Shown only when a locality matches, as on the surname page. */}
                  {localities === null ||
                  localities.state !== "READY" ||
                  localities.places.length === 0 ? null : (
                    <Localities
                      section={localities}
                      surname={name}
                      number={5}
                      next={null}
                      lang={lang}
                      anchor={`places-${key}`}
                    />
                  )}
                </>
              );
            })}
          />
        </>
      )}

      <p className="again couple-links">
        {[a, b].map((side) =>
          side.path === null || side.display === null ? null : (
            <a key={side.slug} href={side.path}>
              {side.display}
            </a>
          ),
        )}
        <a href={comparisonPath(a.slug, b.slug, lang)}>{t.coupleCompareLink}</a>
      </p>
    </SiteShell>
  );
}
