# 2026-10-04 — The studio saves to the gallery on iPhone; "Kopiuj obraz" removed

Branch `claude/studio-save-to-gallery`, on `origin/main` @ `0405e91`. A follow-up to TASK-093. The owner, with a screenshot of the studio on an iPhone: "To powinien móc do galeri to ściągnąć a nie plik tylko i po co to kopiuj" (it should save to the gallery, not only as a file, and why the copy button).

## Changed

- `share-actions.ts`: `savesThroughSheet()` is true where the share sheet takes files and the browser is an iPhone, iPod or iPad (iPadOS reports a Mac with touch points). There a download lands in Files, and only the sheet's "Zapisz obraz" puts the image in Photos; no web page can write to the gallery directly. Android's downloads already show in its gallery, so it keeps the download. `copyCardImage`, `canCopyImage`, the clipboard declarations and the `"copied"` outcome are removed.
- `studio-client.tsx`: on iPhone and iPad the second button reads "Zapisz w galerii" ("Save to Photos") and opens the share sheet with the image, with the status line "Wybierz „Zapisz obraz”." while it is open. Elsewhere it is "Pobierz", a download, as before. The "Kopiuj obraz" button is removed.
- `share-studio.tsx`, `messages.ts`: `studioCopy` and `studioCopied` replaced by `studioGallery` and `studioGalleryHint`, in both languages.
- `share-actions.test.ts`: new, four tests of `savesThroughSheet`.
- `STATUS.md`: the studio's line.

## Verified

- `pnpm install --frozen-lockfile`, then `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `build`: exit 0.
- `apps/web` tests: 790 passed in 73 files, the new file's 4 among them.

## Not verified

- On a real iPhone: that the sheet opened by "Zapisz w galerii" offers "Zapisz obraz" and that the image reaches Photos. This is Safari's documented behaviour for an image file in the share sheet, not observed here.
- The share video's save is unchanged: it already opens the share sheet wherever the browser takes the file.
