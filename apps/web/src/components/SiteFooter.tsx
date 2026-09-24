import { PESEL_RESOURCE_ROLES, PESEL_SOURCE_REGISTRY } from "@name-atlas/sources/pesel";
import { formatIsoDate } from "../lib/format";
import styles from "./SiteFooter.module.css";

/**
 * States the atlas's scope in plain words: the one source it draws on today,
 * with its date (ARCHITECTURE.md §10 invariant 5), and the product promise
 * that it describes surnames, never a particular family (PRODUCT.md §3).
 * Values come from the PESEL registry, so they cannot drift from what the
 * importer accepts.
 */
export function SiteFooter() {
  const dates = [
    ...new Set(PESEL_RESOURCE_ROLES.map((role) => PESEL_SOURCE_REGISTRY.resources[role].data_date)),
  ];

  return (
    <footer className={styles.footer}>
      <p className={styles.source}>
        <span className={styles.key}>Source</span>
        <span>
          PESEL register, {PESEL_SOURCE_REGISTRY.source.publisher} — national lists of current
          surnames of living persons, as of {dates.map(formatIsoDate).join(" and ")}.
        </span>
      </p>
      <p className={styles.promise}>
        Name Atlas describes surnames, never individual families. This is a preview: every figure is
        real and dated, and anything we can&rsquo;t support yet is left blank.
      </p>
    </footer>
  );
}
