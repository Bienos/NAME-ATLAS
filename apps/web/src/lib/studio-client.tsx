"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  canShareFiles,
  saveCardImage,
  savesThroughSheet,
  shareCardImage,
  shareOrSaveFile,
} from "./share-actions.js";
import { DEFAULT_VIDEO, VideoRefused, canMakeVideo, makeCardVideo } from "./share-video.js";
import type { VideoLength, VideoMotion } from "./share-video.js";
import type { ShareOutcome } from "./share-actions.js";

/**
 * The share studio's buttons (TASK-093): share the card's image through the
 * system sheet, or save it. On iPhone and iPad saving goes through that sheet
 * too, whose "Zapisz obraz" puts the image in Photos: a download would land in
 * Files, and no web page can write to the gallery directly. Elsewhere it is a
 * download. What
 * happened is said in one status line.
 */

export interface StudioLabels {
  readonly share: string;
  readonly download: string;
  /** "Pobierz" on iPhone and iPad: the image to the gallery. */
  readonly gallery: string;
  /** Said once the sheet opened from the gallery button has been used. */
  readonly galleryHint: string;
  readonly working: string;
  readonly failed: string;
  readonly signIn: string;
}

/** What the browser can do, read once on the client; nothing before hydration. */
interface Abilities {
  readonly share: boolean;
  /** Saving goes through the share sheet, to the gallery (`savesThroughSheet`). */
  readonly gallery: boolean;
}
const NONE: Abilities = { share: false, gallery: false };
let abilities: Abilities | null = null;
const readAbilities = (): Abilities =>
  (abilities ??= { share: canShareFiles(), gallery: savesThroughSheet() });
/** Nothing outside changes what the browser can do, so there is nothing to subscribe to. */
const subscribeNever = () => () => undefined;

type Action = "share" | "download";

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
  const [toGallery, setToGallery] = useState(false);

  async function run(action: Action): Promise<void> {
    // On iPhone and iPad the download goes through the share sheet, for its "Zapisz obraz".
    const viaSheet = action === "share" || can.gallery;
    setBusy(action);
    setOutcome(null);
    setToGallery(action === "download" && viaSheet);
    try {
      const result = viaSheet
        ? await shareCardImage(image, surname, card)
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
      {button("download", can.gallery ? labels.gallery : labels.download, !can.share)}
      <p className="studio-status" role="status">
        {toGallery && busy === "download" ? labels.galleryHint : null}
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
  readonly length: string;
  readonly short: string;
  readonly full: string;
  readonly motion: string;
  readonly up: string;
  readonly side: string;
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
  const [length, setLength] = useState<VideoLength>(DEFAULT_VIDEO.length);
  const [motion, setMotion] = useState<VideoMotion>(DEFAULT_VIDEO.motion);
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
      const video = await makeCardVideo(images, setProgress, () => cancelled.current, {
        length,
        motion,
      });
      await shareOrSaveFile(video, fileName, surname);
    } catch (cause) {
      const reason = cause instanceof VideoRefused ? cause.reason : "failed";
      if (reason !== "cancelled") setFailure(reason);
    } finally {
      setProgress(null);
    }
  }

  /** One choice as a row of two options (TASK-108). */
  const choice = <T extends string>(
    name: string,
    legend: string,
    value: T,
    set: (next: T) => void,
    options: readonly (readonly [T, string])[],
  ) => (
    <fieldset className="studio-choice" disabled={progress !== null}>
      <legend>{legend}</legend>
      {options.map(([option, label]) => (
        <label key={option}>
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={() => set(option)}
          />
          <span>{label}</span>
        </label>
      ))}
    </fieldset>
  );

  return (
    <div className="studio-video">
      {choice("video-length", labels.length, length, setLength, [
        ["full", labels.full],
        ["short", labels.short],
      ])}
      {choice("video-motion", labels.motion, motion, setMotion, [
        ["up", labels.up],
        ["side", labels.side],
      ])}
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
