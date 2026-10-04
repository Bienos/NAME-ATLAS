import type { Metadata } from "next";
import { STUDIO_METADATA, studioPage } from "../../../../../lib/share-studio.js";

/** `/pl/nazwisko/{slug}/udostepnij?card={card}`: the share studio (TASK-093, ADR-0034). Never indexed. */

export const dynamic = "force-dynamic";

export const metadata: Metadata = STUDIO_METADATA;

interface Props {
  readonly params: Promise<{ slug: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({ params, searchParams }: Props) {
  return studioPage("pl", (await params).slug, await searchParams);
}
