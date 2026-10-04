/**
 * Getting a card's image out of the browser (TASK-056, moved here by TASK-093):
 * fetch it, then share it through the system sheet, save it as a file or copy
 * it. The deck's top-bar button and the share studio both use this module, so
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
      readonly clipboard?: { readonly write?: (items: readonly unknown[]) => Promise<void> };
    }
  | undefined;
declare const ClipboardItem:
  (new (items: Record<string, BlobLike | Promise<BlobLike>>) => unknown) | undefined;
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
export type ShareOutcome = "shared" | "saved" | "copied" | "cancelled" | "sign-in" | "failed";

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

/** Whether this browser can put an image on the clipboard. */
export function canCopyImage(): boolean {
  // `typeof`: a browser without the class has no such global at all.
  return typeof ClipboardItem !== "undefined" && navigator?.clipboard?.write !== undefined;
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
 * The deck's button: the system share sheet where the browser can share files,
 * a download everywhere else.
 */
export async function shareOrSave(
  url: string,
  surname: string,
  key: string,
): Promise<ShareOutcome> {
  const blob = await fetchImage(url);
  if (typeof blob === "string") return blob;
  const name = cardFileName(surname, url, key);
  const shared = await shareBlob(blob, name, surname);
  return shared === "failed" ? save(blob, name) : shared;
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

/**
 * The studio's "Kopiuj obraz". The item is built from a promise, which Safari
 * requires: it allows a clipboard write only while the click is still being
 * handled, so the write has to start before the image arrives.
 */
export async function copyCardImage(url: string): Promise<ShareOutcome> {
  if (!canCopyImage() || ClipboardItem === undefined || navigator?.clipboard?.write === undefined) {
    return "failed";
  }
  const Item = ClipboardItem;
  let refused: "sign-in" | "failed" | null = null;
  const image = fetchImage(url).then((blob) => {
    if (typeof blob === "string") {
      refused = blob;
      throw new Error(blob);
    }
    return blob;
  });
  try {
    await navigator.clipboard.write([new Item({ "image/png": image })]);
    return "copied";
  } catch {
    return refused ?? "failed";
  }
}
