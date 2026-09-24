"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

/**
 * The browser members this island uses, declared rather than widening the
 * repository's `lib: ["ES2022"]` (the same convention as `share-button.tsx`).
 * `fetch`, `AbortController` and `URLSearchParams` come from the Node types.
 */
declare const location: { assign(url: string): void } | undefined;
interface InputLike {
  readonly value: string;
}

interface Item {
  readonly display_name: string;
  readonly path: string | null;
}

export interface ComboboxLabels {
  readonly placeholder: string;
  /** Screen-reader announcement, e.g. "Podpowiedzi: 5". */
  readonly available: string;
}

/** Wait this long after the last keystroke before asking. */
const PAUSE_MS = 200;
const MIN_LENGTH = 2;

/**
 * The search input, with suggest-as-you-type (`docs/contracts/surname-prefix.md`).
 *
 * The WAI-ARIA 1.2 combobox pattern: the input owns a listbox, arrow keys move
 * the active option, Enter opens it, Escape closes the list. With no option
 * active, Enter submits the form exactly as before — and without JavaScript
 * this is the same plain `GET` input it replaced, so nothing depends on it.
 *
 * A suggestion is only ever a link to a surname's page (or to the ordinary
 * search when it has no page). Nothing is filled in or resolved on the
 * reader's behalf. A failed, refused (429) or stale request shows nothing.
 */
export function SurnameCombobox({
  lang,
  defaultValue,
  labels,
}: {
  lang: "pl" | "en";
  defaultValue: string;
  labels: ComboboxLabels;
}) {
  const listId = `${useId().replace(/:/g, "")}-list`;
  const [value, setValue] = useState(defaultValue);
  const [items, setItems] = useState<readonly Item[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = value.trim();
    // Too short: ask nothing. What is shown is filtered in render below, so the
    // effect never sets state synchronously.
    if ([...q].length < MIN_LENGTH) {
      controller.current?.abort();
      return;
    }
    const timer = setTimeout(() => {
      controller.current?.abort();
      const current = new AbortController();
      controller.current = current;
      const params = new URLSearchParams({ q });
      if (lang === "en") params.set("lang", "en");
      fetch(`/api/v1/surname-prefix?${params.toString()}`, { signal: current.signal })
        .then((r) => (r.ok ? (r.json() as Promise<{ status?: string; items?: Item[] }>) : null))
        .then((body) => {
          if (current.signal.aborted) return;
          setItems(body?.status === "SUGGESTIONS" && Array.isArray(body.items) ? body.items : []);
          setActive(-1);
        })
        .catch(() => {
          if (!current.signal.aborted) setItems([]);
        });
    }, PAUSE_MS);
    return () => clearTimeout(timer);
  }, [value, lang]);

  const hrefOf = (item: Item) =>
    item.path ??
    `/?${new URLSearchParams({ surname: item.display_name, ...(lang === "en" ? { lang } : {}) }).toString()}`;

  const shown = [...value.trim()].length >= MIN_LENGTH ? items : [];
  const expanded = open && shown.length > 0;

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && shown.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % shown.length);
    } else if (event.key === "ArrowUp" && shown.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? shown.length - 1 : i - 1));
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (event.key === "Enter" && expanded && active >= 0) {
      const item = shown[active];
      if (item) {
        event.preventDefault();
        location?.assign(hrefOf(item));
      }
    }
  }

  return (
    <div className="combobox">
      <input
        id="surname"
        name="surname"
        type="text"
        value={value}
        onChange={(e) => {
          setValue((e.target as unknown as InputLike).value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={labels.placeholder}
        autoComplete="off"
        spellCheck={false}
        autoCapitalize="characters"
        enterKeyHint="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${String(active)}` : undefined}
      />
      <ul id={listId} role="listbox" className="combobox-list" hidden={!expanded}>
        {shown.map((item, i) => (
          <li
            key={`${item.display_name}-${String(i)}`}
            id={`${listId}-${String(i)}`}
            role="option"
            aria-selected={i === active}
            className={i === active ? "is-active" : undefined}
            // Keep focus in the input so blur does not close the list before the click lands.
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setActive(i)}
          >
            <a href={hrefOf(item)} tabIndex={-1}>
              {item.display_name}
            </a>
          </li>
        ))}
      </ul>
      <p className="visually-hidden" aria-live="polite">
        {expanded ? `${labels.available} ${String(shown.length)}` : ""}
      </p>
    </div>
  );
}
