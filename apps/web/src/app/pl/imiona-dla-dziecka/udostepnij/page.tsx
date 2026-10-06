import type { Metadata } from "next";
import { BabyShareRoute, babyShareMetadata } from "../../../../lib/baby-names-share-page.js";

/**
 * `/pl/imiona-dla-dziecka/udostepnij?imie={imię}&sex=boys|girls` — the share
 * sheet for one sex's cards (TASK-152). A 404 unless `BABY_NAMES_ENABLED` is
 * `1` and accounts are on. Never indexed; `private, no-store` is set by the
 * middleware.
 */

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return babyShareMetadata("pl");
}

interface Props {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default function Page({ searchParams }: Props) {
  return BabyShareRoute({ lang: "pl", searchParams });
}
