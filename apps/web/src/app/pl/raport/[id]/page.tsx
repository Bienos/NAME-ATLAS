import type { Metadata } from "next";
import { reportMetadata, reportPage } from "../../../../lib/report-page.js";

/** `/pl/raport/{id}`: the report preview (TASK-120). A 404 unless `REPORT_PREVIEW_ENABLED` is `1`. Never indexed. */

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return reportMetadata();
}

interface Props {
  readonly params: Promise<{ id: string }>;
}

export default async function Page({ params }: Props) {
  return reportPage("pl", (await params).id);
}
