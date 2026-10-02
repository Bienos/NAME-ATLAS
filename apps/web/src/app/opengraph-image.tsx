import { renderSitePreview } from "../lib/site-preview.js";
import { siteOrigin } from "../lib/surname-page.js";

export const alt = "Name Atlas — Każde nazwisko gdzieś się zaczęło. Sprawdź swoje nazwisko.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const origin = siteOrigin();
  return renderSitePreview(origin === null ? "Name Atlas" : new URL(origin).hostname);
}
