import type { Metadata } from "next";
import { BabyNamesListRoute, babyNamesListMetadata } from "../../../../lib/baby-names-list-page.js";

/**
 * `/en/baby-names/list?sex=girls&year={year}` — the whole list of first names given to children by year
 * (TASK-146, D-047). A 404 unless `BABY_NAMES_ENABLED` is `1` and accounts are on.
 * Never indexed; `private, no-store` is set by the middleware.
 */

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return babyNamesListMetadata("en");
}

interface Props {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default function Page({ searchParams }: Props) {
  return BabyNamesListRoute({ lang: "en", searchParams });
}
