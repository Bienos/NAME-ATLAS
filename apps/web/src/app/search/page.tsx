import type { Metadata } from "next";
import Link from "next/link";
import { RundownOutline } from "../../components/rundown-outline";
import { SearchForm } from "../../components/search-form";
import { SiteFooter, SiteHeader } from "../../components/site-chrome";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Search — Name Atlas",
  robots: { index: false, follow: true },
};

interface SearchPageProps {
  readonly searchParams: Promise<{ surname?: string | string[] }>;
}

/**
 * Where the search form lands (tasks/WEB-000-landing-page.md §3). Surname
 * resolution and the profile belong to WEB-001, so this page resolves
 * nothing and states no fact about the input: it shows the input exactly as
 * typed and says plainly that the rundown is not open yet.
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { surname } = await searchParams;
  const typed = Array.isArray(surname) ? surname[0] : surname;
  const hasInput = typed !== undefined && typed.trim() !== "";

  return (
    <>
      <SiteHeader />
      <main className={styles.main}>
        <div className={styles.container}>
          {hasInput ? (
            <>
              <header className={styles.head}>
                <p className={styles.eyebrow}>Rundown</p>
                <h1 className={styles.title}>{typed}</h1>
              </header>
              <div className={styles.notice} role="status">
                <h2 className={styles.noticeTitle}>Surname pages aren’t open yet</h2>
                <p>
                  We’re building the rundown now, and we won’t show you a guess in the meantime.
                  When it opens, this page will cover these five chapters for the surname you typed.
                </p>
              </div>
              <div className={styles.grid}>
                <RundownOutline />
                <aside className={styles.again}>
                  <h2 className={styles.againTitle}>Try another spelling</h2>
                  <SearchForm id="search-again" defaultValue={typed} size="compact" />
                  <p className={styles.back}>
                    <Link href="/">Back to the national picture</Link>
                  </p>
                </aside>
              </div>
            </>
          ) : (
            <header className={styles.head}>
              <p className={styles.eyebrow}>Search</p>
              <h1 className={styles.title}>Start with a surname</h1>
              <p className={styles.lede}>Type it the way you write it. Polish letters welcome.</p>
              <div className={styles.emptyForm}>
                <SearchForm id="search-empty" />
              </div>
            </header>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
