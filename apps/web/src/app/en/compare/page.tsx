import type { Metadata } from "next";
import {
  COMPARISON_METADATA,
  ComparisonView,
  firstParam,
  loadComparison,
} from "../../../lib/compare-page.js";

/** `/en/compare?a={slug}&b={slug}` — surname comparison (TASK-025). Never indexed. */

export const dynamic = "force-dynamic";

export const metadata: Metadata = COMPARISON_METADATA;

interface Props {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  const { a, b } = await loadComparison(firstParam(params["a"]), firstParam(params["b"]));
  return <ComparisonView a={a} b={b} lang="en" />;
}
