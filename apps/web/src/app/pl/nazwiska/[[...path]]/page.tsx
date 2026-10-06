import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  DirectoryLetterView,
  directoryMetadata,
  DirectoryRootView,
  loadDirectoryLetter,
  loadDirectoryLetters,
  parseDirectoryPath,
} from "../../../../lib/directory-page.js";

/**
 * `/pl/nazwiska`, `/pl/nazwiska/{letter}` and `/pl/nazwiska/{letter}/{n}`: the
 * alphabetical surname directory (TASK-129).
 *
 * Rendered on the first request for each address and then kept for 6 hours
 * (incremental static regeneration), as the sitemaps are (TASK-127): a letter
 * reads the same predicate as the sitemap, which takes seconds over the full
 * register, and its list changes only when claims do. No address is rendered
 * at build time (`generateStaticParams` names none), so a build needs no
 * database.
 */

export const revalidate = 21600;
export const dynamicParams = true;

export function generateStaticParams(): { path: string[] }[] {
  return [];
}

interface Props {
  readonly params: Promise<{ path?: string[] }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return directoryMetadata(parseDirectoryPath((await params).path));
}

export default async function Page({ params }: Props) {
  const request = parseDirectoryPath((await params).path);
  if (request.kind === "REDIRECT") permanentRedirect(request.to);
  if (request.kind === "NOT_FOUND") notFound();
  if (request.kind === "ROOT") return <DirectoryRootView letters={await loadDirectoryLetters()} />;
  const data = await loadDirectoryLetter(request.letter, request.page);
  if (data.entries.length === 0) notFound();
  return <DirectoryLetterView letter={request.letter} page={request.page} data={data} />;
}
