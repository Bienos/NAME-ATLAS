import type { Metadata } from "next";
import { AccountPage, accountMetadataFor } from "../../../../lib/account-page.js";

/**
 * `/en/account` and its steps: the account, sign-in, sign-up, reset, confirm and
 * new password (TASK-062). A 404 unless accounts are on (ADR-0027).
 */

export const dynamic = "force-dynamic";

interface Props {
  readonly params: Promise<{ step?: string[] }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export function generateMetadata({ params }: Props): Promise<Metadata> {
  return accountMetadataFor("en", params);
}

export default function Page({ params, searchParams }: Props) {
  return <AccountPage lang="en" params={params} searchParams={searchParams} />;
}
