import type { ReactNode } from "react";
import { surnameHref } from "../lib/search";
import { NameSearch } from "./NameSearch";
import styles from "./LookupMessage.module.css";

/**
 * Every answer that is not a finding (visual system §22 "never: Error"):
 * plain words about what happened, and a way on. `searchAgain` offers the
 * field pre-filled with exactly what was typed; `retry` repeats the same
 * lookup, for outages.
 */
interface LookupMessageProps {
  readonly title: string;
  readonly children?: ReactNode;
  readonly raw: string;
  readonly searchAgain?: boolean;
  readonly retry?: boolean;
}

export function LookupMessage({ title, children, raw, searchAgain, retry }: LookupMessageProps) {
  return (
    <section className={styles.message} aria-labelledby="lookup-message-title">
      <h2 id="lookup-message-title" className={styles.title}>
        {title}
      </h2>
      {children ? <div className={styles.body}>{children}</div> : null}
      {retry ? (
        <a className={styles.retry} href={surnameHref(raw)}>
          Try again
          <span aria-hidden="true"> →</span>
        </a>
      ) : null}
      {searchAgain ? (
        <div className={styles.search}>
          <NameSearch variant="compact" initialValue={raw} label="Try another spelling" />
        </div>
      ) : null}
    </section>
  );
}
