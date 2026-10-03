import type { Metadata } from "next";
import { TreePage, treeMetadataFor } from "../../../../../lib/tree-page.js";

/**
 * `/en/account/trees` and its pages: the trees, the consent step, a pedigree,
 * one question, a person (TASK-076). A 404 unless the family tree is on
 * (ADR-0029, D-029).
 */

export const dynamic = "force-dynamic";

interface Props {
  readonly params: Promise<{ rest?: string[] }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export function generateMetadata({ params }: Props): Promise<Metadata> {
  return treeMetadataFor("en", params);
}

export default function Page({ params, searchParams }: Props) {
  return <TreePage lang="en" params={params} searchParams={searchParams} />;
}
