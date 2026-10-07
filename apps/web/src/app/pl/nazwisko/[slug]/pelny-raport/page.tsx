import type { Metadata } from "next";
import { REPORT_INSIDE_METADATA, reportInsidePage } from "../../../../../lib/report-inside-page.js";

/** `/pl/nazwisko/{slug}/pelny-raport?imie={imię}`: what the full report holds (TASK-166). Never indexed. */

export const dynamic = "force-dynamic";

export const metadata: Metadata = REPORT_INSIDE_METADATA;

interface Props {
  readonly params: Promise<{ slug: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({ params, searchParams }: Props) {
  return reportInsidePage("pl", (await params).slug, await searchParams);
}
