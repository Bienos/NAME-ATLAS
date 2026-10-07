import type { Metadata } from "next";
import { CoupleNamesRoute, coupleNamesMetadata } from "../../../lib/couple-names-page.js";

/**
 * `/pl/imiona-pary?a={imię}&b={imię}` — two first names' meanings for a couple
 * (TASK-156, ADR-0047). A 404 unless `COUPLE_NAMES_ENABLED` is `1` and
 * accounts are on. Never indexed; `private, no-store` is set by the middleware.
 */

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return coupleNamesMetadata("pl");
}

interface Props {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default function Page({ searchParams }: Props) {
  return CoupleNamesRoute({ lang: "pl", searchParams });
}
