import { sampleReportResponse } from "../../../lib/report-sample-route.js";

/** `/en/sample-report.pdf`: the invented sample of the full report (TASK-172). Never indexed. */

export async function GET(): Promise<Response> {
  return sampleReportResponse("en");
}
