import type { Metadata } from "next";
import { headers } from "next/headers";
import { permanentRedirect } from "next/navigation";
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
  return metadataFor(await answerSlug(slug, null, "pl"), "pl", slug);
}

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const h = await headers();
  const answer = await answerSlug(
    slug,
    referrerPath(h.get("referer"), requestOrigin(h.get("host"))),
    "pl",
  );
  // A retired address is a redirect, not a page (ADR-0010 §2). `permanentRedirect`
  // answers 308, which search engines treat as a permanent move exactly as they
  // treat 301, and which — unlike 301 — cannot be rewritten to a GET by an
  // intermediary. It throws, so nothing below runs.
  if (answer.kind === "MOVED") {
    permanentRedirect(`/pl/nazwisko/${encodeURIComponent(answer.current_slug)}`);
  }
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
