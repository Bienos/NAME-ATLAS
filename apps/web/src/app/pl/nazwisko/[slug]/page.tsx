import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  answerSlug,
  CanonicalSurnamePage,
  metadataFor,
  parseIntent,
  referrerPath,
  requestOrigin,
} from "../../../../lib/surname-page.js";

/** `/pl/nazwisko/{slug}` — the canonical Polish surname page (ADR-0009). */

export const dynamic = "force-dynamic";

interface Props {
  readonly params: Promise<{ slug: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return metadataFor(await answerSlug(slug, null), "pl", slug);
}

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const h = await headers();
  const answer = await answerSlug(
    slug,
    referrerPath(h.get("referer"), requestOrigin(h.get("host"))),
  );
  const intentParam = query["intent"];
  const intent = parseIntent(Array.isArray(intentParam) ? intentParam[0] : intentParam);
  return (
    <CanonicalSurnamePage
      answer={answer}
      lang="pl"
      slug={slug}
      intent={intent}
      origin={requestOrigin(h.get("host"))}
    />
  );
}
