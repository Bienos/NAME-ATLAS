/**
 * The share video (TASK-097, ADR-0034 §2.6): a short vertical MP4 made in the
 * browser from the surname's own share-card images, with no audio. Nothing is
 * rendered on the server and nothing is stored. The muxer (`mediabunny`) is
 * loaded only when a reader asks for a video.
 */

import { TOKENS } from "./design-tokens.js";

/**
 * The browser members used here, declared rather than widening the
 * repository's `lib: ["ES2022"]` (the convention of `share-actions.ts`).
 */
interface BlobLike {
  readonly type: string;
}
interface ImageLike {
  readonly width: number;
  readonly height: number;
  close?(): void;
}
interface Context2D {
  globalAlpha: number;
  fillStyle: string;
  fillRect(x: number, y: number, w: number, h: number): void;
  drawImage(image: ImageLike, x: number, y: number, w: number, h: number): void;
}
interface CanvasLike {
  getContext(kind: "2d"): Context2D | null;
}
declare const VideoEncoder:
  | {
      isConfigSupported(config: Record<string, unknown>): Promise<{ readonly supported?: boolean }>;
    }
  | undefined;
declare const OffscreenCanvas: (new (width: number, height: number) => CanvasLike) | undefined;
declare const document:
  { createElement(tag: "canvas"): CanvasLike & { width: number; height: number } } | undefined;
declare function createImageBitmap(blob: BlobLike): Promise<ImageLike>;
declare const Blob: new (parts: readonly unknown[], options: { type: string }) => BlobLike;
declare function fetch(
  input: string,
): Promise<{ readonly ok: boolean; readonly status: number; blob(): Promise<BlobLike> }>;

/** The clip's shape (TASK-097 §3): 1080 × 1920 at 30 fps, no audio. */
export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
  /** The shortest a card is held, in seconds. */
  minHold: 1.5,
  /** One slide between two cards. */
  transition: 0.4,
  /** The summary held again at the end. */
  closing: 1.5,
  /** The shortest clip: one card is held longer rather than make a three-second video. */
  minDuration: 8,
  maxCards: 7,
  /** The H.264 configuration checked before the button is shown: High profile, level 4.0. */
  codec: "avc1.640028",
  bitrate: 6_000_000,
} as const;

/** What to draw at one moment: a card, and the next sliding in over it by `mix` (0 to 1). */
export interface Frame {
  readonly card: number;
  readonly next: number | null;
  readonly mix: number;
}

export interface Schedule {
  /** How long each card is held, in seconds. */
  readonly hold: number;
  readonly duration: number;
  frameAt(time: number): Frame;
}

/** Ease in and out, so a slide starts and ends still. */
function ease(x: number): number {
  return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
}

/**
 * The clip's timeline for `count` cards (TASK-097 AC-1). Each card is held,
 * then the next slides in; after the last, the first card (the summary) slides
 * in again and is held to close. With one card there is nothing to slide: it is
 * held for the whole clip. Pure, so it is tested without a browser.
 */
export function videoSchedule(count: number): Schedule {
  const n = Math.max(1, Math.min(VIDEO.maxCards, Math.floor(count)));
  const { transition: tr, closing } = VIDEO;
  // Slides between the cards, plus one back to the summary when there is more than one card.
  const slides = n > 1 ? n : 0;
  const fixed = slides * tr + closing;
  const hold = Math.max(VIDEO.minHold, (VIDEO.minDuration - fixed) / n);
  const duration = n * hold + fixed;
  const step = hold + tr;
  return {
    hold,
    duration,
    frameAt(time) {
      const t = Math.max(0, Math.min(duration, time));
      if (n === 1) return { card: 0, next: null, mix: 0 };
      const i = Math.floor(t / step);
      if (i >= n) return { card: 0, next: null, mix: 0 };
      const into = t - i * step;
      if (into < hold) return { card: i, next: null, mix: 0 };
      const next = i + 1 < n ? i + 1 : 0;
      return { card: i, next, mix: ease((into - hold) / tr) };
    },
  };
}

let abilityCheck: Promise<boolean> | null = null;

/**
 * Whether this browser can encode the clip (TASK-097 AC-2): WebCodecs is there
 * and accepts the H.264 configuration at the clip's size. Asked once.
 */
export function canMakeVideo(): Promise<boolean> {
  abilityCheck ??= (async () => {
    if (typeof VideoEncoder === "undefined" || VideoEncoder === undefined) return false;
    try {
      const { supported } = await VideoEncoder.isConfigSupported({
        codec: VIDEO.codec,
        width: VIDEO.width,
        height: VIDEO.height,
        bitrate: VIDEO.bitrate,
        framerate: VIDEO.fps,
      });
      return supported === true;
    } catch {
      return false;
    }
  })();
  return abilityCheck;
}

/** For tests: forget the answer, so a stubbed `VideoEncoder` is asked again. */
export function resetVideoAbilityForTests(): void {
  abilityCheck = null;
}

/** Why there is no video: the download gate (TASK-064), a cancel, or anything else. */
export class VideoRefused extends Error {
  constructor(readonly reason: "sign-in" | "cancelled" | "failed") {
    super(reason);
  }
}

function canvas(): CanvasLike {
  if (typeof OffscreenCanvas !== "undefined" && OffscreenCanvas !== undefined) {
    return new OffscreenCanvas(VIDEO.width, VIDEO.height);
  }
  if (document === undefined) throw new VideoRefused("failed");
  const element = document.createElement("canvas");
  element.width = VIDEO.width;
  element.height = VIDEO.height;
  return element;
}

function draw(ctx: Context2D, images: readonly ImageLike[], frame: Frame): void {
  const { width: w, height: h } = VIDEO;
  ctx.globalAlpha = 1;
  ctx.fillStyle = TOKENS["dusk-surface"];
  ctx.fillRect(0, 0, w, h);
  const current = images[frame.card];
  const next = frame.next === null ? undefined : images[frame.next];
  // A push, as in Stories: the next card rises from below and pushes this one up.
  // Never a cross-fade, which shows two cards' text over each other.
  const shift = next === undefined ? 0 : Math.round(frame.mix * h);
  if (current !== undefined) ctx.drawImage(current, 0, -shift, w, h);
  if (next !== undefined) ctx.drawImage(next, 0, h - shift, w, h);
}

/**
 * Makes the clip from the cards' image addresses (TASK-097 §3), reporting
 * progress from 0 to 1, and returns it as `video/mp4`. `isCancelled` is
 * checked between frames.
 */
export async function makeCardVideo(
  urls: readonly string[],
  onProgress: (done: number) => void,
  isCancelled: () => boolean = () => false,
): Promise<BlobLike> {
  const chosen = urls.slice(0, VIDEO.maxCards);
  if (chosen.length === 0) throw new VideoRefused("failed");
  const images: ImageLike[] = [];
  try {
    for (const url of chosen) {
      const response = await fetch(url);
      if (response.status === 401) throw new VideoRefused("sign-in");
      if (!response.ok) throw new VideoRefused("failed");
      images.push(await createImageBitmap(await response.blob()));
    }
    const mb = await import("mediabunny");
    const surface = canvas();
    const ctx = surface.getContext("2d");
    if (ctx === null) throw new VideoRefused("failed");
    const output = new mb.Output({
      // The index at the front, as players and Instagram's uploader expect.
      format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }),
      target: new mb.BufferTarget(),
    });
    const source = new mb.CanvasSource(surface as never, {
      codec: "avc",
      bitrate: VIDEO.bitrate,
      keyFrameInterval: 2,
    });
    output.addVideoTrack(source, { frameRate: VIDEO.fps });
    await output.start();
    const schedule = videoSchedule(chosen.length);
    const frames = Math.round(schedule.duration * VIDEO.fps);
    for (let f = 0; f < frames; f++) {
      if (isCancelled()) {
        await output.cancel();
        throw new VideoRefused("cancelled");
      }
      const time = f / VIDEO.fps;
      draw(ctx, images, schedule.frameAt(time));
      await source.add(time, 1 / VIDEO.fps);
      onProgress((f + 1) / frames);
    }
    source.close();
    await output.finalize();
    const buffer = output.target.buffer;
    if (buffer === null) throw new VideoRefused("failed");
    return new Blob([buffer], { type: "video/mp4" });
  } catch (cause) {
    if (cause instanceof VideoRefused) throw cause;
    throw new VideoRefused("failed");
  } finally {
    for (const image of images) image.close?.();
  }
}
