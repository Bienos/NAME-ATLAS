import { formatDate, partitionLabel, terminate, UI } from "./messages.js";
import type { Lang } from "./messages.js";

export interface CommonList {
  readonly comparability_group: string;
  /** The ranked universe's dane.gov.pl resource id, from the claim (`mostCommonSurnames`). */
  readonly external_record_id: string | null;
  readonly snapshot_date: string | null;
  readonly items: readonly {
    readonly display_name: string;
    readonly rank: number;
    readonly path: string;
  }[];
}

/**
 * The home page's most common surnames — one list per rank universe, rendered
 * from `CURRENT_RANK` claims as `mostCommonSurnames` returns them. The ranks are
 * the claims' own; nothing is counted or ordered here. The male and female
 * lists are side by side and never merged.
 *
 * No lists, no section: a database with no derived rank claims shows nothing
 * rather than a list computed some other way.
 */
export function CommonSurnames({ lists, lang }: { lists: readonly CommonList[]; lang: Lang }) {
  const t = UI[lang];
  const shown = lists.filter((l) => l.items.length > 0);
  if (shown.length === 0) return null;
  const date = shown[0]?.snapshot_date ?? null;
  return (
    <section id="common" className="common">
      <h3>{t.commonHeading}</h3>
      <p className="caveat">
        {date === null
          ? t.commonNoteUndated
          : terminate(`${t.commonNote} ${formatDate(date, lang)}`)}
      </p>
      <div className="common-lists">
        {shown.map((list) => (
          <div key={list.comparability_group}>
            <h4>{partitionLabel(list.comparability_group, lang) ?? list.comparability_group}</h4>
            <ol>
              {list.items.map((item) => (
                <li key={`${item.display_name}-${String(item.rank)}`}>
                  <span className="common-rank">{item.rank}.</span>{" "}
                  <a href={item.path}>{item.display_name}</a>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
