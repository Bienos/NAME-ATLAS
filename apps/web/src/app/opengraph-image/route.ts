import { renderSitePreview } from "../../lib/site-preview.js";
import { siteOrigin } from "../../lib/surname-page.js";

// Keep previously shared root-image URLs working; landing metadata uses the public JPEG.
export const dynamic = "force-static";

export function GET() {
  const origin = siteOrigin();
  return renderSitePreview(origin === null ? "Name Atlas" : new URL(origin).hostname);
}
