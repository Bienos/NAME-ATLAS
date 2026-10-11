import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  COMPARISON_METADATA,
  ComparePicker,
  ComparisonView,
  coupleLinks,
  loadComparison,
} from "../../../lib/compare-page.js";
import { comparisonRequest } from "../../../lib/compare-request.js";
import { fullNameCompareHref } from "../../../lib/full-name-compare-page.js";
import { siteOrigin } from "../../../lib/surname-page.js";

/** `/pl/porownaj?a={slug}&b={slug}` — surname comparison (TASK-025). Never indexed. */

export const dynamic = "force-dynamic";

export const metadata: Metadata = COMPARISON_METADATA;

interface Props {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({ searchParams }: Props) {
  const request = comparisonRequest(await searchParams, "pl");
  // Typed surnames become addresses first (TASK-052); `redirect` throws.
  if (request.kind === "REDIRECT") redirect(request.to);
  if (request.kind === "PICK") {
    return (
      <ComparePicker
        lang="pl"
        first={request.first}
        second={request.second}
        error={request.error}
        fullNamesHref={fullNameCompareHref("pl")}
        couples={coupleLinks()}
      />
    );
  }
  const { a, b } = await loadComparison(request.a, request.b, "pl");
  return (
    <ComparisonView
      a={a}
      b={b}
      lang="pl"
      origin={siteOrigin()}
      fullNamesHref={fullNameCompareHref("pl")}
      couples={coupleLinks()}
    />
  );
}
