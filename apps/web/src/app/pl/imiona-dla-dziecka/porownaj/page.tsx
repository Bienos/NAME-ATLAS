import type { Metadata } from "next";
import { BabyCompareRoute, babyCompareMetadata } from "../../../../lib/baby-names-compare-page.js";

/**
 * `/pl/imiona-dla-dziecka/porownaj?a={imię}&b={imię}&sex=boys|girls` — two
 * first names of one sex side by side, part of the 8,99 zł view (TASK-158,
 * D-044). A 404 unless `BABY_NAMES_ENABLED` is `1` and accounts are on. Never
 * indexed; `private, no-store` is set by the middleware.
 */

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return babyCompareMetadata("pl");
}

interface Props {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default function Page({ searchParams }: Props) {
  return BabyCompareRoute({ lang: "pl", searchParams });
}
