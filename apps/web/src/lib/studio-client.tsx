"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  canCopyImage,
  canShareFiles,
  copyCardImage,
  saveCardImage,
  shareCardImage,
  shareOrSaveFile,
} from "./share-actions.js";
import { VideoRefused, canMakeVideo, makeCardVideo } from "./share-video.js";
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

export interface VideoLabels {
  readonly make: string;
  /** With `{n}` for the percentage done. */
  readonly working: string;
  readonly cancel: string;
  readonly failed: string;
  readonly signIn: string;
}

/**
 * "Pobierz wideo" (TASK-097): a short MP4 of the surname's cards, made in the
 * browser. Shown only where the browser can encode it; until that is known,
 * and on the server, there is no button.
 */
export function StudioVideo({
  images,
  surname,
  fileName,
  labels,
  signInHref,
}: {
  /** The cards' full image addresses, summary first. */
  images: readonly string[];
  surname: string;
  fileName: string;
  labels: VideoLabels;
  signInHref: string | null;
}) {
  const [able, setAble] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [failure, setFailure] = useState<"failed" | "sign-in" | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    let live = true;
    void canMakeVideo().then((yes) => {
      if (live) setAble(yes);
    });
    return () => {
      live = false;
    };
  }, []);

  if (!able || images.length === 0) return null;

  async function make(): Promise<void> {
    cancelled.current = false;
    setFailure(null);
    setProgress(0);
    try {
      const video = await makeCardVideo(images, setProgress, () => cancelled.current);
      await shareOrSaveFile(video, fileName, surname);
    } catch (cause) {
      const reason = cause instanceof VideoRefused ? cause.reason : "failed";
      if (reason !== "cancelled") setFailure(reason);
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="studio-video">
      {progress === null ? (
        <button type="button" onClick={() => void make()}>
          {labels.make}
        </button>
      ) : (
        <>
          <button type="button" disabled>
            {labels.working.replace("{n}", String(Math.round(progress * 100)))}
          </button>
          <button
            type="button"
            className="studio-cancel"
            onClick={() => {
              cancelled.current = true;
            }}
          >
            {labels.cancel}
          </button>
        </>
      )}
      <p className="studio-status" role="status">
        {failure === "failed" ? labels.failed : null}
        {failure === "sign-in" && signInHref !== null ? (
          <a href={signInHref}>{labels.signIn}</a>
        ) : null}
      </p>
    </div>
  );
}
