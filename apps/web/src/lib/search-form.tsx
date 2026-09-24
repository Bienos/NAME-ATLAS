import { UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { SurnameCombobox } from "./surname-combobox.js";

/**
 * The search form, one component for `/` and the canonical pages (TASK-023 §2.6).
 *
 * A plain `GET` form. It is on every result page, which is what makes a second
 * search one keystroke away rather than a trip to the homepage. `id="surname"`
 * is the target of the "search another surname" control.
 */
export function SearchForm({ lang, query }: { lang: Lang; query: string }) {
  const t = UI[lang];
  return (
    <form className="search" action="/" method="get" role="search">
      <label htmlFor="surname">{t.searchLabel}</label>
      <SurnameCombobox
        lang={lang}
        defaultValue={query}
        labels={{ placeholder: t.searchPlaceholder, available: t.suggestionsAvailable }}
      />
      {lang === "en" ? <input type="hidden" name="lang" value="en" /> : null}
      <button type="submit">{t.searchAction}</button>
    </form>
  );
}
