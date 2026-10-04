import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import { accountPath } from "./account-paths.js";
import { accountsRuntime } from "./accounts-runtime.js";
import { downloadGate } from "./download-gate.js";
import type { GateVerdict } from "./download-gate.js";
import { studioCards } from "./deck.js";
import { UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { ShareButton } from "./share-button.js";
import { shareCardPath, sharePreviewPath, studioPath } from "./share-facts.js";
import type { ShareCardKey } from "./share-facts.js";
import { SiteShell } from "./site-shell.js";
import { comparePagePath, offerPath } from "./site-links.js";
import { pageSlug } from "./slug.js";
import { StudioActions, StudioVideo } from "./studio-client.js";
import { fileStem } from "./share-actions.js";
import { answerSlugForMetadata, canonicalPathFor, siteOrigin } from "./surname-page.js";

/**
 * The share studio (TASK-093, ADR-0034): `/pl/nazwisko/{slug}/udostepnij` and
 * `/en/surname/{slug}/share`, where the deck ends. Every reader sees the card;
 * with accounts on, the full image and its buttons need a session, and a
 * reader without one sees the marked preview and a way to sign in that
 * returns here.
 *
 * It reads the session, so it is its own dynamic page: the surname page never
 * does (TASK-064 §2.3). It is never indexed and never in a sitemap.
 */

export const STUDIO_METADATA: Metadata = {
  title: "Name Atlas",
  robots: { index: false, follow: false },
};

/** The deck's title for each card the studio offers. */
const CARD_TITLE = {
  summary: "deckEnd",
  rarity: "deckRarity",
  neighbours: "deckNeighbours",
  where: "deckWhere",
  change: "deckChange",
  other: "deckOther",
  meaning: "deckMeaning",
  print: "deckPrint",
} as const satisfies Record<ShareCardKey, keyof (typeof UI)["pl"]>;

/** The card the address asks for, if the surname has it; else the first it has. */
export function chosenCard(
  query: string | string[] | undefined,
  offered: readonly ShareCardKey[],
): ShareCardKey | null {
  const asked = Array.isArray(query) ? query[0] : query;
  return offered.find((card) => card === asked) ?? offered[0] ?? null;
}

/** The two route files' shared body. */
export async function studioPage(
  lang: Lang,
  rawSlug: string,
  query: Record<string, string | string[] | undefined>,
) {
  const slug = pageSlug(rawSlug);
  const answer = await answerSlugForMetadata(slug, lang);
  const base = lang === "en" ? "/en/surname" : "/pl/nazwisko";
  if (answer.kind === "MOVED") {
    permanentRedirect(studioPath(`${base}/${encodeURIComponent(answer.current_slug)}`, lang));
  }
  if (answer.kind !== "RESULT") notFound();
  const offered = studioCards(answer.response, lang);
  const card = chosenCard(query["card"], offered);
  if (card === null) notFound();
  const gate = await downloadGate(accountsRuntime(), (await headers()).get("cookie"));
  const path = canonicalPathFor(answer, lang, slug);
  const origin = siteOrigin();
  return (
    <ShareStudio
      lang={lang}
      surname={answer.display}
      path={path}
      otherPath={answer.otherLangPath}
      offered={offered}
      card={card}
      gate={gate}
      shareUrl={origin === null ? null : `${origin}${path}`}
    />
  );
}

export function ShareStudio({
  lang,
  surname,
  path,
  otherPath,
  offered,
  card,
  gate,
  shareUrl,
}: {
  lang: Lang;
  surname: string;
  /** The surname page's canonical path. */
  path: string;
  /** The surname page in the other language, if it has one. */
  otherPath: string | null;
  offered: readonly ShareCardKey[];
  card: ShareCardKey;
  gate: GateVerdict;
  shareUrl: string | null;
}) {
  const t = UI[lang];
  const otherLang: Lang = lang === "pl" ? "en" : "pl";
  const here = studioPath(path, lang, card);
  const signIn = accountPath(lang, "sign-in", { next: here });
  const full = gate === "off" || gate === "open";
  return (
    <SiteShell
      lang={lang}
      otherPath={
        otherPath === null
          ? otherLang === "en"
            ? "/?lang=en"
            : "/"
          : studioPath(otherPath, otherLang, card)
      }
      world={{ mode: "quiet" }}
      search={{ query: surname }}
      mainClassName="studio"
    >
      <section aria-labelledby="studio-heading">
        <p className="studio-eyebrow">{surname}</p>
        <h1 id="studio-heading">{t.studioHeading}</h1>
        {offered.length > 1 ? (
          <nav className="studio-cards" aria-label={t.studioCards}>
            <ul>
              {offered.map((c) => (
                <li key={c}>
                  <a
                    href={studioPath(path, lang, c)}
                    aria-current={c === card ? "page" : undefined}
                  >
                    {t[CARD_TITLE[c]]}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        <div className="studio-stage">
          {/* A generated PNG at its final size, served as is. */}
          <Image
            className="studio-image"
            src={full ? shareCardPath(path, card, lang) : sharePreviewPath(path, card, lang)}
            alt={`${t.studioImageAlt}: ${surname}, ${t[CARD_TITLE[card]]}`}
            width={540}
            height={960}
            unoptimized
            priority
          />
          <div className="studio-panel">
            {full ? (
              <>
                <StudioActions
                  image={shareCardPath(path, card, lang)}
                  surname={surname}
                  card={card}
                  signInHref={gate === "open" ? signIn : null}
                  labels={{
                    share: t.studioShare,
                    download: t.studioDownload,
                    copy: t.studioCopy,
                    working: t.studioWorking,
                    copied: t.studioCopied,
                    failed: t.studioFailed,
                    signIn: t.studioSignInPrompt,
                  }}
                />
                <StudioVideo
                  images={offered.map((c) => shareCardPath(path, c, lang))}
                  surname={surname}
                  fileName={`${fileStem(surname)}-${lang === "en" ? "video" : "wideo"}.mp4`}
                  signInHref={gate === "open" ? signIn : null}
                  labels={{
                    make: t.studioVideo,
                    working: t.studioVideoWorking,
                    cancel: t.studioVideoCancel,
                    failed: t.studioVideoFailed,
                    signIn: t.studioSignInPrompt,
                  }}
                />
                <p className="studio-hint">{t.studioInstagram}</p>
              </>
            ) : gate === "sign-in" ? (
              <div className="studio-gate">
                <p>{t.studioSignInPrompt}</p>
                <a className="studio-primary" href={signIn}>
                  {t.studioSignIn}
                </a>
                <a href={accountPath(lang, "sign-up")}>{t.studioSignUp}</a>
              </div>
            ) : (
              <p className="studio-gate">{t.studioUnavailable}</p>
            )}
            <h2>{t.studioMore}</h2>
            <div className="studio-more">
              {shareUrl === null ? null : (
                <ShareButton
                  url={shareUrl}
                  title={`${surname} — ${t.title}`}
                  lang={lang}
                  label={t.studioShareLink}
                />
              )}
              <a href={`${path}?view=cards`}>{t.studioBack}</a>
              <a
                href={`${comparePagePath(lang)}?${new URLSearchParams({ qa: surname }).toString()}`}
              >
                {t.compareFromHere}
              </a>
              <a href="#surname">{t.searchAnother}</a>
              <a href={offerPath(lang)}>{t.deckOffer}</a>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
