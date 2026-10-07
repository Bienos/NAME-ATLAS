/**
 * Getting a card's image out of the browser (TASK-056, moved here by TASK-093):
 * fetch it, then share it through the system sheet or save it as a file. The deck's top-bar button and the share studio both use this module, so
 * the two behave alike.
 */

/**
 * The browser members used here, declared rather than widening the
 * repository's `lib: ["ES2022"]` (the convention of `deck-client.tsx`). Every
 * member that some browsers lack is optional.
 */
interface BlobLike {
  readonly type: string;
}
interface AnchorLike {
  href: string;
  download: string;
  click(): void;
  remove(): void;
}
declare const document:
  | {
      readonly body: { appendChild(node: AnchorLike): void };
      createElement(tag: "a"): AnchorLike;
    }
  | undefined;
declare const navigator:
  | {
      readonly canShare?: (data: { files: readonly unknown[] }) => boolean;
      readonly share?: (data: { files?: readonly unknown[]; title?: string }) => Promise<void>;
      readonly userAgent?: string;
      readonly maxTouchPoints?: number;
    }
  | undefined;
declare const File: new (
  parts: readonly BlobLike[],
  name: string,
  options: { type: string },
) => BlobLike;
declare const URL: {
  createObjectURL(blob: BlobLike): string;
  revokeObjectURL(url: string): void;
};
declare function fetch(
  input: string,
): Promise<{ readonly ok: boolean; readonly status: number; blob(): Promise<BlobLike> }>;
declare function setTimeout(callback: () => void, ms: number): unknown;

/** What happened, for the caller to say. A cancelled share sheet is not a failure. */
export type ShareOutcome = "shared" | "saved" | "cancelled" | "sign-in" | "failed";

/**
 * A file name browsers keep: Chromium drops a download name with letters such as
 * "ą" and saves "download" instead (checked 2026-10-01), so the surname is
 * folded to ASCII, ł included, which Unicode does not decompose.
 */
export function fileStem(surname: string): string {
  return (
    surname
      .toLocaleLowerCase("pl")
      .replace(/ł/gu, "l")
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-+|-+$/gu, "") || "name-atlas"
  );
}

/** The file's name: `{surname}-{card}.png`, the card being the image address's last segment. */
export function cardFileName(surname: string, url: string, fallback: string): string {
  return `${fileStem(surname)}-${url.split("/").pop() ?? fallback}.png`;
}

/** Whether this browser's share sheet takes files (most phones do, most desktops do not). */
export function canShareFiles(): boolean {
  if (navigator?.share === undefined || navigator.canShare === undefined) return false;
  try {
    return navigator.canShare({ files: [new File([], "card.png", { type: "image/png" })] });
  } catch {
    return false;
  }
}

/**
 * Whether a saved image should go through the share sheet to reach the photo
 * gallery: on iPhone and iPad a download lands in Files, and only the sheet's
 * "Zapisz obraz" puts it in Photos. iPadOS reports itself as a Mac, so a Mac
 * with a touch screen counts. Android's downloads already show in its gallery.
 */
export function savesThroughSheet(): boolean {
  if (!canShareFiles()) return false;
  const agent = navigator?.userAgent ?? "";
  return (
    /iPhone|iPad|iPod/u.test(agent) ||
    (/Macintosh/u.test(agent) && (navigator?.maxTouchPoints ?? 0) > 1)
  );
}

/** The image, or why there is none: a 401 is the download gate (TASK-064). */
async function fetchImage(url: string): Promise<BlobLike | "sign-in" | "failed"> {
  try {
    const response = await fetch(url);
    if (response.status === 401) return "sign-in";
    if (!response.ok) return "failed";
    return await response.blob();
  } catch {
    return "failed";
  }
}

function save(blob: BlobLike, name: string): ShareOutcome {
  if (document === undefined) return "failed";
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  return "saved";
}

async function shareBlob(
  blob: BlobLike,
  name: string,
  title: string,
  type = "image/png",
): Promise<ShareOutcome> {
  const file = new File([blob], name, { type });
  if (navigator?.share === undefined || navigator.canShare?.({ files: [file] }) !== true) {
    return "failed";
  }
  try {
    await navigator.share({ files: [file], title });
    return "shared";
  } catch {
    return "cancelled";
  }
}

/**
 * A file already made in the browser (the share video, TASK-097): the share
 * sheet where it takes the file, a download everywhere else.
 */
export async function shareOrSaveFile(
  blob: BlobLike,
  name: string,
  title: string,
): Promise<ShareOutcome> {
  const shared = await shareBlob(blob, name, title, blob.type);
  return shared === "failed" ? save(blob, name) : shared;
}

/**
 * An image by its address, under a file name the caller chose (the baby-names
 * sheet, TASK-152, whose card addresses carry a query): the share sheet where
 * the browser takes files, a download everywhere else.
 */
export async function shareOrSaveImage(
  url: string,
  fileName: string,
  title: string,
): Promise<ShareOutcome> {
  const blob = await fetchImage(url);
  if (typeof blob === "string") return blob;
  const shared = await shareBlob(blob, fileName, title);
  return shared === "failed" ? save(blob, fileName) : shared;
}

/** The same image through the share sheet only. */
export async function shareImage(
  url: string,
  fileName: string,
  title: string,
): Promise<ShareOutcome> {
  const blob = await fetchImage(url);
  if (typeof blob === "string") return blob;
  return shareBlob(blob, fileName, title);
}

/** The same image as a download. */
export async function saveImage(url: string, fileName: string): Promise<ShareOutcome> {
  const blob = await fetchImage(url);
  if (typeof blob === "string") return blob;
  return save(blob, fileName);
}

/**
 * The deck's button: the system share sheet where the browser can share files,
 * a download everywhere else.
 */
export async function shareOrSave(
  url: string,
  surname: string,
  key: string,
): Promise<ShareOutcome> {
  return shareOrSaveImage(url, cardFileName(surname, url, key), surname);
}

/** The studio's "Udostępnij": the share sheet only. */
export async function shareCardImage(
  url: string,
  surname: string,
  key: string,
): Promise<ShareOutcome> {
  const blob = await fetchImage(url);
  if (typeof blob === "string") return blob;
  return shareBlob(blob, cardFileName(surname, url, key), surname);
}

/** The studio's "Pobierz". */
export async function saveCardImage(
  url: string,
  surname: string,
  key: string,
): Promise<ShareOutcome> {
  const blob = await fetchImage(url);
  if (typeof blob === "string") return blob;
  return save(blob, cardFileName(surname, url, key));
}
