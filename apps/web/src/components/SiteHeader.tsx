import type { ReactNode } from "react";
import { Wordmark } from "./Wordmark";
import styles from "./SiteHeader.module.css";

/** Quiet navigation (§2 principle 08): the surname is the hero, not the chrome. */
export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className={styles.header}>
      <Wordmark />
      <div className={styles.end}>
        {children}
        <span className={styles.preview}>Preview</span>
      </div>
    </header>
  );
}
