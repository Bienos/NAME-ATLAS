"use client";

import { useState, useSyncExternalStore } from "react";
import {
  canCopyImage,
  canShareFiles,
  copyCardImage,
  saveCardImage,
  shareCardImage,
} from "./share-actions.js";
import type { ShareOutcome } from "./share-actions.js";

/**
 * The share studio's buttons (TASK-093): share the card's image through the
 * system sheet, save it, or copy it. Each button appears only where the
 * browser can do what it says; "Pobierz" always can. What happened is said in
 * one status line.
 */

export interface StudioLabels {
  readonly share: string;
  readonly download: string;
  readonly copy: string;
  readonly working: string;
  readonly copied: string;
  readonly failed: string;
  readonly signIn: string;
}

/** What the browser can do, read once on the client; nothing before hydration. */
interface Abilities {
  readonly share: boolean;
  readonly copy: boolean;
}
const NONE: Abilities = { share: false, copy: false };
let abilities: Abilities | null = null;
const readAbilities = (): Abilities =>
  (abilities ??= { share: canShareFiles(), copy: canCopyImage() });
/** Nothing outside changes what the browser can do, so there is nothing to subscribe to. */
const subscribeNever = () => () => undefined;

type Action = "share" | "download" | "copy";

export function StudioActions({
  image,
  surname,
  card,
  labels,
  signInHref,
}: {
  /** The full image's address (the TASK-056 route). */
  image: string;
  surname: string;
  card: string;
  labels: StudioLabels;
  /** The sign-in page carrying the studio as `next`, for a session that ended meanwhile. */
  signInHref: string | null;
}) {
  const can = useSyncExternalStore(subscribeNever, readAbilities, () => NONE);
  const [busy, setBusy] = useState<Action | null>(null);
  const [outcome, setOutcome] = useState<ShareOutcome | null>(null);

  async function run(action: Action): Promise<void> {
    setBusy(action);
    setOutcome(null);
    try {
      const result =
        action === "share"
          ? await shareCardImage(image, surname, card)
          : action === "copy"
            ? await copyCardImage(image)
            : await saveCardImage(image, surname, card);
      setOutcome(result);
    } finally {
      setBusy(null);
    }
  }

  const button = (action: Action, label: string, primary: boolean) => (
    <button
      type="button"
      className={primary ? "studio-primary" : undefined}
      onClick={() => void run(action)}
      disabled={busy !== null}
    >
      {busy === action ? labels.working : label}
    </button>
  );

  return (
    <div className="studio-actions">
      {can.share ? button("share", labels.share, true) : null}
      {button("download", labels.download, !can.share)}
      {can.copy ? button("copy", labels.copy, false) : null}
      <p className="studio-status" role="status">
        {outcome === "copied" ? labels.copied : null}
        {outcome === "failed" ? labels.failed : null}
        {outcome === "sign-in" && signInHref !== null ? (
          <a href={signInHref}>{labels.signIn}</a>
        ) : null}
      </p>
    </div>
  );
}
