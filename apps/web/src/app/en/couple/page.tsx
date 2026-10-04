import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { COUPLE_METADATA, CouplePicker, CoupleView, loadCouple } from "../../../lib/couple-page.js";
import { coupleReportEnabled } from "../../../lib/couple-config.js";
import { couplePath } from "../../../lib/couple-view.js";
import { comparisonRequest } from "../../../lib/compare-request.js";

/**
 * `/en/couple?a={slug}&b={slug}` — the couple report (TASK-100, ADR-0035). A 404
 * unless `COUPLE_REPORT_ENABLED` is `1`. Never indexed; `private, no-store`
 * is set by the middleware.
 */

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return coupleReportEnabled() ? COUPLE_METADATA : {};
}

interface Props {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({ searchParams }: Props) {
  if (!coupleReportEnabled()) notFound();
  const request = comparisonRequest(await searchParams, "en", couplePath);
  // Typed surnames become addresses first, as on the comparison; `redirect` throws.
  if (request.kind === "REDIRECT") redirect(request.to);
  if (request.kind === "PICK") {
    return (
      <CouplePicker lang="en" first={request.first} second={request.second} error={request.error} />
    );
  }
  const { a, b, names } = await loadCouple(request.a, request.b, "en");
  return <CoupleView a={a} b={b} names={names} lang="en" />;
}
