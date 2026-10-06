import type { ReactNode } from "react";
import { htmlLang } from "./messages.js";
import type { Lang } from "./messages.js";
import { DuskWorld } from "./dusk-world.js";
import type { WorldMode } from "./dusk-world.js";
import { SiteNav } from "./site-nav.js";
import type { NavPlace } from "./site-nav.js";
import { SiteFooter } from "./site-footer.js";
import { AtlasGrid, AtlasPoint, ContourField } from "../design-system/graphics/index.js";

/**
 * Every page's frame (TASK-052, ADR-0021): the dusk world behind it, the
 * header, the page's own `<main>` and the footer. The body is the dusk scope
 * (`layout.tsx`); this only chooses how the world is drawn:
 *
 * - `hero` — the landing: Poland lies on the horizon under the search field;
 * - `journey` — a surname's answer: the camera is down, the map at the side,
 *   lit by the surname's own regional shares when it has them;
 * - `quiet` — every reading page: the sky alone.
 *
 * `lang` goes on `<main>` and the footer, because a root layout owns `<html>`
 * and the nearest `lang` wins (see `layout.tsx`).
 */
export function SiteShell({
  lang,
  otherPath,
  world,
  current = null,
  search = null,
  mainClassName,
  children,
}: {
  lang: Lang;
  otherPath: string;
  world: {
    readonly mode: WorldMode;
    readonly weights?: Readonly<Record<string, number>>;
    readonly lit?: string | null;
  };
  current?: NavPlace;
  search?: { readonly query: string } | null;
  mainClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={`site site-${world.mode}`}>
      <DuskWorld mode={world.mode} weights={world.weights} lit={world.lit ?? null} />
      <div className="atlas-shell-graphics" aria-hidden="true">
        <ContourField
          seed={world.mode === "hero" ? 149 : world.mode === "journey" ? 53 : 21}
          density={world.mode === "hero" ? 8 : 5}
          intensity={world.mode === "hero" ? 1.15 : 0.72}
          focusPoint={world.mode === "hero" ? { x: 74, y: 42 } : { x: 84, y: 24 }}
          opacity={world.mode === "hero" ? 0.42 : 0.16}
          variant="amber"
        />
        <AtlasGrid />
        {world.mode === "hero" ? <AtlasPoint size={12} glow className="atlas-shell-point" /> : null}
      </div>
      <SiteNav lang={lang} otherPath={otherPath} current={current} search={search} />
      <main lang={htmlLang(lang)} className={mainClassName}>
        {children}
      </main>
      <SiteFooter lang={lang} />
    </div>
  );
}
