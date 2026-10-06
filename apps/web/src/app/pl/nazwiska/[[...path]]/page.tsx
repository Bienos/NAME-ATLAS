import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  DirectoryLetterView,
  directoryMetadata,
  DirectoryRootView,
  directoryStaticPaths,
  loadDirectoryLetter,
  loadDirectoryLetters,
  parseDirectoryPath,
} from "../../../../lib/directory-page.js";

/**
 * `/pl/nazwiska`, `/pl/nazwiska/{letter}` and `/pl/nazwiska/{letter}/{n}`: the
 * alphabetical surname directory (TASK-129).
 *
 * Kept for 6 hours and then rendered again (incremental static regeneration),
 * as the sitemaps are (TASK-127): a letter reads the same predicate as the
 * sitemap, which takes seconds over the full register, and its list changes
 * only when claims do. The build renders every address it can read from the
 * database (`directoryStaticPaths`, TASK-138); without one it renders none, and
 * each address is rendered on its first request.
 */

export const revalidate = 21600;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<{ path: string[] }[]> {
  return (await directoryStaticPaths()).map((path) => ({ path }));
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
