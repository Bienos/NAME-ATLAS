import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isReportVersionId, readReportVersion } from "@name-atlas/truth";
import { db } from "./db.js";
import type { Lang } from "./messages.js";
import { reportPreviewEnabled } from "./report-config.js";
import { ReportPage, toReportPreview } from "./report-view.js";

/**
 * The report preview's page (TASK-120): `/pl/raport/{id}` and `/en/report/{id}`.
 * A 404 unless `REPORT_PREVIEW_ENABLED` is `1`, for an id that is not a stored
 * version, and for a version whose payload is not a report's. Never indexed;
 * `private, no-store` is set by the middleware. It only reads.
 */

export const REPORT_METADATA: Metadata = {
  title: "Name Atlas",
  robots: { index: false, follow: false },
};

export function reportMetadata(): Metadata {
  return reportPreviewEnabled() ? REPORT_METADATA : {};
}

export async function reportPage(lang: Lang, id: string) {
  if (!reportPreviewEnabled() || !isReportVersionId(id)) notFound();
  const stored = await readReportVersion(db(), id);
  const preview = stored === null ? null : toReportPreview(stored);
  if (preview === null) notFound();
  return <ReportPage preview={preview} lang={lang} />;
}
