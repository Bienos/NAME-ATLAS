import { accountsRuntime } from "./accounts-runtime.js";
import {
  BABY_NAMES_CACHE_CONTROL,
  babyNamesEnabled,
  readBabyNamesAccess,
} from "./baby-names-config.js";
import { readBabyNamesSession, runningBabyNamesDeps } from "./baby-names-page.js";
import type { BabyNamesDeps } from "./baby-names-page.js";
import { renderBabyCard } from "./baby-names-share-card.js";
import {
  babyFreeCardFacts,
  babyPaidCardFacts,
  isBabyCard,
  parseBabyShareQuery,
} from "./baby-names-share-facts.js";
import type { Lang } from "./messages.js";
import { requestOrigin } from "./surname-page.js";

/**
 * The baby-names card routes (TASK-152): `/pl/imiona-dla-dziecka/karta/{card}`
 * and `/en/baby-names/card/{card}`, `?imie={name}&sex=boys|girls` as the page
 * reads them. One handler for both.
 *
 * Gated exactly like the page: a 404 unless `BABY_NAMES_ENABLED` is `1` and
 * accounts are on, a 404 without a session (there is no public card address),
 * and for the paid card a 404 to an account without the entitlement, decided
 * before any claim is read, with no upsell. An unknown card, a query that
 * names no sex, a name on no list and a sex the name has no figures for all
 * answer 404 with no image: a card is drawn only where the page has the
 * answer. Every image is one reader's: `private, no-store`, never cached.
 */

type Query = Readonly<Record<string, string | string[] | undefined>>;

const NOT_FOUND = () => new Response("Not found", { status: 404 });

export async function babyCardResponse(input: {
  readonly lang: Lang;
  readonly card: string;
  readonly query: Query;
  readonly session: { readonly userId: string } | null;
  readonly hostHeader: string | null;
  readonly deps: BabyNamesDeps;
}): Promise<Response> {
  const { lang, card, session, deps } = input;
  if (!isBabyCard(card)) return NOT_FOUND();
  if (session === null) return NOT_FOUND();
  const { typed, sex } = parseBabyShareQuery(lang, input.query);
  if (typed === "" || sex === null) return NOT_FOUND();
  const paid = card === "paid";
  // The entitlement first: an account without it learns nothing of the history and costs no claims read.
  const access = paid ? await readBabyNamesAccess(deps, session.userId) : null;
  if (access !== null && !access.full) return NOT_FOUND();
  const lookup = await deps.findName(typed);
  if (lookup.kind !== "FOUND") return NOT_FOUND();
  const [facts, stock] = await Promise.all([
    deps.readFacts(lookup.given_name, paid, access?.paid ?? false),
    deps.readStock(lookup.given_name),
  ]);
  const origin = requestOrigin(input.hostHeader);
  const host = origin === null ? null : new URL(origin).host;
  const cardFacts = paid
    ? babyPaidCardFacts({ facts, stock, sex, lang, host })
    : babyFreeCardFacts({ facts, stock, sex, lang, host });
  if (cardFacts === null) return NOT_FOUND();
  return renderBabyCard(cardFacts, card, { "Cache-Control": BABY_NAMES_CACHE_CONTROL });
}

/** The route's handler: the flag, the accounts runtime, the session cookie, then the card. */
export async function babyCardRoute(
  request: Request,
  params: Promise<{ card: string }>,
  lang: Lang,
): Promise<Response> {
  if (!babyNamesEnabled()) return NOT_FOUND();
  const accounts = accountsRuntime();
  if (accounts === null) return NOT_FOUND();
  const { card } = await params;
  const query: Record<string, string> = {};
  for (const [key, value] of new URL(request.url).searchParams) query[key] ??= value;
  const session = await readBabyNamesSession(accounts);
  return babyCardResponse({
    lang,
    card,
    query,
    session,
    hostHeader: request.headers.get("host"),
    deps: runningBabyNamesDeps(accounts.pool),
  });
}
