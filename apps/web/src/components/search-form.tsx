import styles from "./search-form.module.css";

interface SearchFormProps {
  /** Unique per page, so two forms never share an input id. */
  readonly id: string;
  readonly defaultValue?: string;
  readonly size?: "hero" | "compact";
}

/**
 * A plain GET form: works without JavaScript, and sends the surname exactly
 * as typed. Resolution happens behind `/search`, never here.
 */
export function SearchForm({ id, defaultValue, size = "hero" }: SearchFormProps) {
  return (
    <form action="/search" method="get" role="search" className={styles.form} data-size={size}>
      <label htmlFor={id} className={styles.label}>
        Your surname
      </label>
      <div className={styles.field}>
        <input
          id={id}
          name="surname"
          type="text"
          required
          defaultValue={defaultValue}
          placeholder="e.g. Kowalczyk"
          autoComplete="family-name"
          autoCapitalize="words"
          spellCheck={false}
          enterKeyHint="search"
          className={styles.input}
        />
        <button type="submit" className={styles.button}>
          Open rundown
          <svg viewBox="0 0 20 20" aria-hidden="true" className={styles.arrow}>
            <path d="M4 10h11M11 5l5 5-5 5" />
          </svg>
        </button>
      </div>
    </form>
  );
}
