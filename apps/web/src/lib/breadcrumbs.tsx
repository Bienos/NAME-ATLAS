import { UI } from "./messages.js";
import type { Lang } from "./messages.js";
import type { Crumb } from "./structured-data.js";

/**
 * A visible breadcrumb (TASK-123; `docs/canonical/21` §62, §73), the one the
 * page's `BreadcrumbList` names. The last crumb is the page itself, not a link.
 */
export function Breadcrumbs({ crumbs, lang }: { crumbs: readonly Crumb[]; lang: Lang }) {
  return (
    <nav className="breadcrumbs" aria-label={UI[lang].breadcrumbLabel}>
      <ol>
        {crumbs.map((crumb, index) =>
          index === crumbs.length - 1 ? (
            <li key={crumb.path} aria-current="page">
              {crumb.name}
            </li>
          ) : (
            <li key={crumb.path}>
              <a href={crumb.path}>{crumb.name}</a>
            </li>
          ),
        )}
      </ol>
    </nav>
  );
}
