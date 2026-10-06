"use client";

import { useState, useSyncExternalStore } from "react";
import {
  canShareFiles,
  saveImage,
  savesThroughSheet,
  shareImage,
  shareOrSaveImage,
} from "./share-actions.js";
import type { ShareOutcome } from "./share-actions.js";

/**
 * The baby-names share sheet's actions (TASK-152), after the studio's
 * (`studio-client.tsx`): "Udostępnij" through the system share sheet with the
 * image as a file where the browser takes files, a download everywhere else;
 * "Zapisz obraz", a plain download link that works without script (on iPhone
 * and iPad it goes through the share sheet instead, whose "Zapisz obraz" puts
 * the image in Photos); "Kopiuj link", the page's address for this name and
 * sex to the clipboard. Nothing is ever posted on the reader's behalf. What
 * happened is said in one status line.
 */

declare const navigator:
  { readonly clipboard?: { readonly writeText?: (text: string) => Promise<void> } } | undefined;

export interface BabyShareLabels {
  readonly share: string;
  readonly save: string;
  readonly copy: string;
  readonly working: string;
  readonly shared: string;
  readonly saved: string;
  readonly cancelled: string;
  readonly copied: string;
  /** Followed by the link, for the reader to copy by hand. */
  readonly copyDenied: string;
  readonly failed: string;
  readonly signIn: string;
}

/** What the browser can do, read once on the client; nothing before hydration. */
interface Abilities {
  readonly share: boolean;
  readonly gallery: boolean;
}
const NONE: Abilities = { share: false, gallery: false };
let abilities: Abilities | null = null;
const readAbilities = (): Abilities =>
  (abilities ??= { share: canShareFiles(), gallery: savesThroughSheet() });
const subscribeNever = () => () => undefined;

type Action = "share" | "save" | "copy";
type Status = ShareOutcome | "copied" | "copy-denied" | null;

export function BabyShareActions({
  image,
  fileName,
  title,
  pageUrl,
  labels,
  signInHref,
}: {
  /** The card's image address (the TASK-152 route). */
  image: string;
  fileName: string;
  title: string;
  /** The page's address for this name and sex, as the server wrote it. */
  pageUrl: string;
  labels: BabyShareLabels;
  /** The sign-in page, for a session that ended meanwhile. */
  signInHref: string;
}) {
  const can = useSyncExternalStore(subscribeNever, readAbilities, () => NONE);
  const [busy, setBusy] = useState<Action | null>(null);
  const [status, setStatus] = useState<Status>(null);

  async function run(action: Action): Promise<void> {
    setBusy(action);
    setStatus(null);
    try {
      if (action === "copy") {
        try {
          const write = navigator?.clipboard?.writeText;
          if (write === undefined) throw new Error("no clipboard");
          await write.call(navigator?.clipboard, pageUrl);
          setStatus("copied");
        } catch {
          setStatus("copy-denied");
        }
        return;
      }
      // "Zapisz obraz" on iPhone and iPad goes through the sheet, for its "Zapisz obraz" to Photos.
      const result =
        action === "share"
          ? await shareOrSaveImage(image, fileName, title)
          : can.gallery
            ? await shareImage(image, fileName, title)
            : await saveImage(image, fileName);
      setStatus(result);
    } finally {
      setBusy(null);
    }
  }

  const said: Partial<Record<NonNullable<Status>, string>> = {
    shared: labels.shared,
    saved: labels.saved,
    cancelled: labels.cancelled,
    failed: labels.failed,
    copied: labels.copied,
  };

  return (
    <div className="bns-actions">
      <button
        type="button"
        className="bns-primary"
        onClick={() => void run("share")}
        disabled={busy !== null}
        data-action="share"
      >
        {busy === "share" ? labels.working : labels.share}
      </button>
      <div className="bns-secondary">
        {can.gallery ? (
          <button
            type="button"
            onClick={() => void run("save")}
            disabled={busy !== null}
            data-action="save"
          >
            {busy === "save" ? labels.working : labels.save}
          </button>
        ) : (
          <a href={image} download={fileName} data-action="save">
            {labels.save}
          </a>
        )}
        <button
          type="button"
          onClick={() => void run("copy")}
          disabled={busy !== null}
          data-action="copy"
        >
          {busy === "copy" ? labels.working : labels.copy}
        </button>
      </div>
      <p className="bns-status note" role="status">
        {status === null ? null : (said[status] ?? null)}
        {status === "copy-denied" ? (
          <>
            {labels.copyDenied} <code>{pageUrl}</code>
          </>
        ) : null}
        {status === "sign-in" ? <a href={signInHref}>{labels.signIn}</a> : null}
      </p>
    </div>
  );
}
