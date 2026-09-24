import Link from "next/link";
import styles from "./Wordmark.module.css";

/**
 * Wordmark + Atlas Point (visual system §9, "Recommended logo system"): a
 * point crossing a short axis, derived from the Atlas Thread. Not a location
 * pin.
 */
export function Wordmark() {
  return (
    <Link href="/" className={styles.wordmark} aria-label="Name Atlas — home">
      <svg
        className={styles.point}
        viewBox="0 0 20 20"
        width="20"
        height="20"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M10 1.5v17M1.5 10h17" stroke="currentColor" strokeWidth="1.25" />
        <circle cx="10" cy="10" r="3.75" fill="var(--color-brand-atlas)" />
      </svg>
      <span className={styles.name}>Name Atlas</span>
    </Link>
  );
}
