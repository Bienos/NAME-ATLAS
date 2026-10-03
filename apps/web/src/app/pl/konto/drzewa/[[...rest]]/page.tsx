import type { Metadata } from "next";
import { TreePage, treeMetadataFor } from "../../../../../lib/tree-page.js";

/**
 * `/pl/konto/drzewa` and its pages: the trees, the consent step, a pedigree,
 * one question, a person (TASK-073). A 404 unless the family tree is on
 * (ADR-0029, D-029).
 */

export const dynamic = "force-dynamic";

interface Props {
  readonly params: Promise<{ rest?: string[] }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export function generateMetadata({ params }: Props): Promise<Metadata> {
  return treeMetadataFor("pl", params);
}

export default function Page({ params, searchParams }: Props) {
  return <TreePage lang="pl" params={params} searchParams={searchParams} />;
}
