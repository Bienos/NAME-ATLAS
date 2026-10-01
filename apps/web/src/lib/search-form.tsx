import { UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { SurnameCombobox } from "./surname-combobox.js";

/**
 * The search form, one component for `/` and every other page (TASK-023 §2.6;
 * the dusk pill since TASK-052).
 *
 * A plain `GET` form. It is on every result page, in the header, which is what
 * makes a second search one keystroke away rather than a trip to the homepage.
 * `id="surname"` is the target of the "search another surname" control, so a
 * page renders one form only. `variant` sets the size: the landing's hero pill
 * or the header's compact one.
 */
export function SearchForm({
  lang,
  query,
  variant = "hero",
}: {
  lang: Lang;
  query: string;
  variant?: "hero" | "compact";
}) {
  const t = UI[lang];
  return (
    <form className={`search search-${variant}`} action="/" method="get" role="search">
      <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
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
