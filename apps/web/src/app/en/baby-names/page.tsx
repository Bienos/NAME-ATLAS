import type { Metadata } from "next";
import { BabyNamesRoute, babyNamesMetadata } from "../../../lib/baby-names-page.js";

/**
 * `/en/baby-names?name={first name}` — first names given to children by year (TASK-141,
 * D-044). A 404 unless `BABY_NAMES_ENABLED` is `1` and accounts are on. Never
 * indexed; `private, no-store` is set by the middleware.
 */

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return babyNamesMetadata("en");
}

interface Props {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default function Page({ searchParams }: Props) {
  return BabyNamesRoute({ lang: "en", searchParams });
}
