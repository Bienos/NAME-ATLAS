import type { CSSProperties } from "react";
import { formatCount } from "../lib/format";
import type { PublishedCount } from "../lib/national-overview";
import styles from "./count-bars.module.css";

interface CountBarsProps {
  readonly rows: readonly PublishedCount[];
  /** Shared across every list on the page, so bars compare across lists. */
  readonly scaleMax: number;
}

/**
 * One list's published counts as a single-series bar chart. The ordered
 * list is the table view: every value is printed at its bar's tip, so the
 * bar itself is decoration and hidden from assistive technology.
 */
export function CountBars({ rows, scaleMax }: CountBarsProps) {
  return (
    <ol className={styles.list}>
      {rows.map((row, i) => (
        <li key={row.surname} className={styles.row}>
          <span className={styles.position}>{i + 1}</span>
          <span className={styles.surname}>{row.surname}</span>
          <span className={styles.track}>
            <span
              className={styles.bar}
              style={{ "--ratio": row.count / scaleMax } as CSSProperties}
              aria-hidden="true"
            />
            <span className={styles.value}>{formatCount(row.count)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
