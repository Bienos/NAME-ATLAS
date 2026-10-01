import { UI } from "../lib/messages.js";
import { SiteShell } from "../lib/site-shell.js";
import { SearchForm } from "../lib/search-form.js";

/**
 * Any address this site has no page for (TASK-052). Polish, the document's
 * default (`layout.tsx`); the header switches to the English home page. The
 * search is the way on, as on every answer.
 */
export default function NotFound() {
  const t = UI.pl;
  return (
    <SiteShell lang="pl" otherPath="/?lang=en" world={{ mode: "quiet" }} mainClassName="reading">
      <h1 className="page-title">{t.notFoundHeading}</h1>
      <p className="page-lede">{t.notFoundBody}</p>
      <SearchForm lang="pl" query="" />
    </SiteShell>
  );
}
