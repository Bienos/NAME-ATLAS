import type { Metadata } from "next";
import {
  FullNameCompareRoute,
  fullNameCompareMetadata,
} from "../../../../lib/full-name-compare-page.js";

/**
 * `/en/compare/full-name?f1=…&s1=…` — first names and surnames of two to four people side
 * by side (TASK-155, D-049). A 404 unless `FULL_NAME_COMPARE_ENABLED` is `1`
 * and accounts are on. Never indexed; `private, no-store` is set by the middleware.
 */

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return fullNameCompareMetadata("en");
}

interface Props {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default function Page({ searchParams }: Props) {
  return FullNameCompareRoute({ lang: "en", searchParams });
}
