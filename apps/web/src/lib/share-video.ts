/**
 * The share video (TASK-097, TASK-108, ADR-0034 §2.6): a short vertical MP4
 * made in the browser from the surname's own share-card images, with no audio.
 * The server draws the images (each card in two layers, an opening plate and,
 * when the reader keeps it, a closing plate announcing the full report, TASK-166);
 * the clip is put together in the browser and nothing is stored. The muxer (`mediabunny`) is
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
  save(): void;
  restore(): void;
  beginPath(): void;
  rect(x: number, y: number, w: number, h: number): void;
  clip(): void;
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

/** The clip's shape (TASK-097 §3, TASK-108): 1080 × 1920 at 30 fps, no audio. */
export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
  /** The opening plate: the surname drawn in, then the question. */
  intro: 1.8,
  /** When the surname starts to draw in, and how long it takes. */
  wipeStart: 0.2,
  wipe: 0.9,
  /** How long a card is held: a short clip moves faster. */
  hold: { short: 1.4, full: 1.8 },
  /** How many cards each length takes. */
  cards: { short: 3, full: 7 },
  /** After a card lands, its figures and visual rise in. */
  revealStart: 0.12,
  reveal: 0.6,
  /** How far the figures rise, in pixels. */
  rise: 56,
  /** One push between two plates. */
  transition: 0.45,
  /** The full clip ends on the summary again. */
  closing: 1.5,
  /**
   * The full report's plate (TASK-166). It replaces the full clip's closing
   * summary, and the short clip takes one card fewer, so neither runs longer.
   */
  outro: 1.8,
  /** The shortest clip: cards are held longer rather than make a three-second video. */
  minDuration: 7,
  maxCards: 7,
  /** The H.264 configuration checked before the button is shown: High profile, level 4.0. */
  codec: "avc1.640028",
  bitrate: 6_000_000,
} as const;

/** The reader's choices (TASK-108): how long, and which way the cards move. */
export type VideoLength = "short" | "full";
export type VideoMotion = "up" | "side";
export interface VideoOptions {
  readonly length: VideoLength;
  readonly motion: VideoMotion;
  /** End on the full report's plate (TASK-166); off when not given. */
  readonly outro?: boolean;
}
export const DEFAULT_VIDEO: VideoOptions = { length: "full", motion: "up" };

/** One plate of the clip: the opening, a card (the closing summary is a card again) or the report's. */
export type Segment =
  | { readonly kind: "intro" }
  | { readonly kind: "card"; readonly card: number; readonly closing: boolean }
  | { readonly kind: "outro" };

/**
 * What to draw at one moment: a plate, and the next pushing in over it by
 * `mix` (0 to 1). `reveal` is how far the plate's figures have come in (0 to
 * 1) and `wipe` how much of the surname the opening shows.
 */
export interface Frame {
  readonly segment: Segment;
  readonly next: Segment | null;
  readonly mix: number;
  readonly reveal: number;
  readonly wipe: number;
}

export interface Schedule {
  readonly segments: readonly Segment[];
  /** How long each card is held, in seconds. */
  readonly hold: number;
  readonly duration: number;
  frameAt(time: number): Frame;
}

/** Ease in and out, so a movement starts and ends still. */
function ease(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/**
 * The clip's timeline for `count` cards (TASK-108 AC-1). The opening plate,
 * then each card pushed in and held while its figures rise in; a full clip
 * pushes the summary in again to close. A card's figures are never drawn part
 * way through a number: the whole figure moves in, faded. Pure, so it is
 * tested without a browser.
 */
export function videoSchedule(count: number, options: VideoOptions = DEFAULT_VIDEO): Schedule {
  const outro = options.outro === true;
  const most = VIDEO.cards[options.length] - (outro && options.length === "short" ? 1 : 0);
  const n = Math.max(1, Math.min(most, Math.floor(count)));
  const closing = options.length === "full" && n > 1 && !outro;
  const segments: Segment[] = [{ kind: "intro" }];
  for (let i = 0; i < n; i++) segments.push({ kind: "card", card: i, closing: false });
  if (closing) segments.push({ kind: "card", card: 0, closing: true });
  if (outro) segments.push({ kind: "outro" });
  const tr = VIDEO.transition;
  const fixed =
    VIDEO.intro +
    (segments.length - 1) * tr +
    (closing ? VIDEO.closing : 0) +
    (outro ? VIDEO.outro : 0);
  const hold = Math.max(VIDEO.hold[options.length], (VIDEO.minDuration - fixed) / n);
  const holds = segments.map((s) =>
    s.kind === "intro"
      ? VIDEO.intro
      : s.kind === "outro"
        ? VIDEO.outro
        : s.closing
          ? VIDEO.closing
          : hold,
  );
  const duration = fixed + n * hold;

  const revealAt = (segment: Segment, since: number) =>
    segment.kind !== "card" || segment.closing
      ? 1
      : ease((since - VIDEO.revealStart) / VIDEO.reveal);
  const wipeAt = (segment: Segment, since: number) =>
    segment.kind === "intro" ? ease((since - VIDEO.wipeStart) / VIDEO.wipe) : 1;

  return {
    segments,
    hold,
    duration,
    frameAt(time) {
      let t = Math.max(0, Math.min(duration, time));
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i] as Segment;
        const held = holds[i] as number;
        const next = segments[i + 1] ?? null;
        const span = held + (next === null ? 0 : tr);
        if (t < span || next === null) {
          const state = { reveal: revealAt(segment, t), wipe: wipeAt(segment, t) };
          if (t < held || next === null) return { segment, next: null, mix: 0, ...state };
          return { segment, next, mix: ease((t - held) / tr), ...state };
        }
        t -= span;
      }
      // Unreachable: the last segment returns above.
      return { segment: segments[0] as Segment, next: null, mix: 0, reveal: 1, wipe: 1 };
    },
  };
}

/** The full report's closing plate (TASK-166), drawn from the summary's address; null with no cards. */
export function outroUrl(cardUrls: readonly string[]): string | null {
  const first = cardUrls[0];
  return first === undefined ? null : `${first}${first.includes("?") ? "&" : "?"}layer=outro`;
}

/** Each card's two layers, and the opening's (TASK-108): the addresses the clip reads. */
export function layerUrls(cardUrls: readonly string[], count: number) {
  const layer = (url: string, name: string) =>
    `${url}${url.includes("?") ? "&" : "?"}layer=${name}`;
  const first = cardUrls[0];
  return {
    intro:
      first === undefined
        ? null
        : { plate: layer(first, "intro"), name: layer(first, "intro-name") },
    cards: cardUrls
      .slice(0, count)
      .map((url) => ({ base: layer(url, "base"), reveal: layer(url, "reveal") })),
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

interface Plates {
  readonly intro: { readonly plate: ImageLike; readonly name: ImageLike };
  readonly cards: readonly { readonly base: ImageLike; readonly reveal: ImageLike }[];
  readonly outro: ImageLike | null;
}

/** One plate at an offset, with its figures and the opening's surname as far in as the frame says. */
function drawSegment(
  ctx: Context2D,
  plates: Plates,
  segment: Segment,
  x: number,
  y: number,
  reveal: number,
  wipe: number,
): void {
  const { width: w, height: h } = VIDEO;
  if (segment.kind === "intro") {
    ctx.drawImage(plates.intro.plate, x, y, w, h);
    // The surname is drawn in from the left, as if written.
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, Math.round(w * wipe), h);
    ctx.clip();
    ctx.drawImage(plates.intro.name, x, y, w, h);
    ctx.restore();
    return;
  }
  if (segment.kind === "outro") {
    if (plates.outro !== null) ctx.drawImage(plates.outro, x, y, w, h);
    return;
  }
  const card = plates.cards[segment.card];
  if (card === undefined) return;
  ctx.drawImage(card.base, x, y, w, h);
  if (reveal <= 0) return;
  // The whole figure rises in, faded: never a number part way through.
  ctx.globalAlpha = reveal;
  ctx.drawImage(card.reveal, x, y + Math.round((1 - reveal) * VIDEO.rise), w, h);
  ctx.globalAlpha = 1;
}

function draw(ctx: Context2D, plates: Plates, frame: Frame, motion: VideoMotion): void {
  const { width: w, height: h } = VIDEO;
  ctx.globalAlpha = 1;
  ctx.fillStyle = TOKENS["dusk-surface"];
  ctx.fillRect(0, 0, w, h);
  // A push, as in Stories: the next plate pushes this one out, from below or
  // from the side. Never a cross-fade, which shows two cards' text over each other.
  const span = motion === "up" ? h : w;
  const shift = frame.next === null ? 0 : Math.round(frame.mix * span);
  const [dx, dy] = motion === "up" ? [0, 1] : [1, 0];
  drawSegment(ctx, plates, frame.segment, -shift * dx, -shift * dy, frame.reveal, frame.wipe);
  if (frame.next !== null) {
    // The incoming card arrives with its figures still out, unless it is the closing summary.
    const incoming = frame.next.kind === "card" && frame.next.closing ? 1 : 0;
    drawSegment(ctx, plates, frame.next, (span - shift) * dx, (span - shift) * dy, incoming, 0);
  }
}

async function bitmap(url: string): Promise<ImageLike> {
  const response = await fetch(url);
  if (response.status === 401) throw new VideoRefused("sign-in");
  if (!response.ok) throw new VideoRefused("failed");
  return createImageBitmap(await response.blob());
}

/**
 * Makes the clip from the cards' image addresses (TASK-097 §3, TASK-108),
 * reporting progress from 0 to 1, and returns it as `video/mp4`. Each card is
 * read in its two layers and the opening from the summary's. `isCancelled` is
 * checked between frames.
 */
export async function makeCardVideo(
  urls: readonly string[],
  onProgress: (done: number) => void,
  isCancelled: () => boolean = () => false,
  options: VideoOptions = DEFAULT_VIDEO,
): Promise<BlobLike> {
  const schedule = videoSchedule(urls.length, options);
  const count = schedule.segments.filter((s) => s.kind === "card" && !s.closing).length;
  const wanted = layerUrls(urls, count);
  if (wanted.intro === null || wanted.cards.length === 0) throw new VideoRefused("failed");
  const outro = options.outro === true ? outroUrl(urls) : null;
  const loaded: ImageLike[] = [];
  const keep = async (url: string) => {
    const image = await bitmap(url);
    loaded.push(image);
    return image;
  };
  try {
    const [plate, name, closer, ...layers] = await Promise.all([
      keep(wanted.intro.plate),
      keep(wanted.intro.name),
      outro === null ? Promise.resolve(null) : keep(outro),
      ...wanted.cards.flatMap((c) => [keep(c.base), keep(c.reveal)]),
    ]);
    const cards = wanted.cards.map((_, i) => ({
      base: layers[2 * i] as ImageLike,
      reveal: layers[2 * i + 1] as ImageLike,
    }));
    const plates: Plates = {
      intro: { plate: plate as ImageLike, name: name as ImageLike },
      cards,
      outro: closer ?? null,
    };
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
    const frames = Math.round(schedule.duration * VIDEO.fps);
    for (let f = 0; f < frames; f++) {
      if (isCancelled()) {
        await output.cancel();
        throw new VideoRefused("cancelled");
      }
      const time = f / VIDEO.fps;
      draw(ctx, plates, schedule.frameAt(time), options.motion);
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
    for (const image of loaded) image.close?.();
  }
}
