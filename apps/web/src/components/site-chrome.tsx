import Link from "next/link";
import styles from "./site-chrome.module.css";

function Mark() {
  return (
    <svg className={styles.mark} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="13" />
      <ellipse cx="16" cy="16" rx="6" ry="13" />
      <path d="M3 16h26M5.5 9h21M5.5 23h21" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.wordmark}>
          <Mark />
          Name Atlas
        </Link>
        <nav aria-label="Main">
          <ul className={styles.nav}>
            <li>
              <Link href="/#picture">The data</Link>
            </li>
            <li>
              <Link href="/#rundown">How it works</Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.footerLead}>
          <Mark />
          Name Atlas works at the level of the surname. It never identifies your ancestors or your
          family.
        </p>
        <p className={styles.footerNote}>
          <Link href="/#source">Where our numbers come from</Link>
        </p>
      </div>
    </footer>
  );
}
