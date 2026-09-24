import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LookupProgress } from "../../../components/LookupProgress";
import { NameDisplay } from "../../../components/NameDisplay";
import { SiteFooter } from "../../../components/SiteFooter";
import { SiteHeader } from "../../../components/SiteHeader";
import { SurnameFindings } from "../../../components/SurnameFindings";
import { NAME_PARAM, readNameParam } from "../../../lib/search";
import styles from "./page.module.css";

/**
 * Surname results — visual system §39 screen 02. The surname, exactly as
 * typed, is the hero and renders at once; what the atlas holds streams in
 * beneath it when the lookup settles.
 *
 * This is a lookup page keyed by the raw input, not the canonical, indexable
 * surname page (`/en/surname/{slug}`, docs/canonical/21), so it is never
 * indexed.
 */

interface SurnamePageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: SurnamePageProps): Promise<Metadata> {
  const raw = readNameParam((await searchParams)[NAME_PARAM]);
  return {
    title: raw ? raw.normalize("NFC") : "Surname",
    robots: { index: false, follow: false },
  };
}

export default async function SurnamePage({ searchParams }: SurnamePageProps) {
  const raw = readNameParam((await searchParams)[NAME_PARAM]);
  if (raw === null || raw.trim() === "") {
    redirect("/");
  }

  return (
    <div className={styles.page}>
      <SiteHeader>
        <Link href="/" className={styles.newSearch}>
          <span aria-hidden="true">←</span>
          New search
        </Link>
      </SiteHeader>
      <main id="main" className={styles.main}>
        <p className={styles.eyebrow}>Surname</p>
        <div className={styles.hero}>
          <NameDisplay name={raw.normalize("NFC")} />
        </div>
        <Suspense key={raw} fallback={<LookupProgress />}>
          <SurnameFindings raw={raw} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
