import type { Metadata } from "next";
import type { Lang } from "./messages.js";
import { OfferForm } from "./offer-form.js";
import { offerDocument } from "./offer-text.js";
import type { Tier } from "./offer-text.js";
import { SiteShell } from "./site-shell.js";
import { contactPath, homePath, offerPath } from "./site-links.js";

/**
 * `/pl/oferta` and `/en/offer` (TASK-057, TASK-104, ADR-0037): the free tier
 * as it is, and the four paid tiers as coming, each with a way to ask. Static: no
 * database, no request data, and no way to buy anything.
 */

export function offerMetadata(lang: Lang): Metadata {
  return {
    title: `${offerDocument(lang).title} — Name Atlas`,
    alternates: {
      canonical: offerPath(lang),
      languages: { pl: offerPath("pl"), en: offerPath("en") },
    },
  };
}

function TierCard({ tier, lang }: { readonly tier: Tier; readonly lang: Lang }) {
  const doc = offerDocument(lang);
  const key = tier.key;
  const words = key === "genealogy" ? doc.enquiry : doc.waitlist;
  return (
    <article className={`offer-tier offer-${tier.key}`} aria-labelledby={`tier-${tier.key}`}>
      <p className="offer-status">{tier.soon ? doc.soon : doc.now}</p>
      <h2 id={`tier-${tier.key}`}>{tier.name}</h2>
      <p className="offer-price">{tier.price}</p>
      <p className="offer-lede">{tier.lede}</p>
      <ul>
        {tier.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {tier.note === undefined ? null : <p className="offer-note">{tier.note}</p>}
      {key === "free" ? (
        <p>
          <a className="offer-send" href={homePath(lang)}>
            {doc.freeCta} <span aria-hidden="true">→</span>
          </a>
        </p>
      ) : (
        <div className="offer-ask">
          <h3>{words.heading}</h3>
          <p>{words.intro}</p>
          <OfferForm tier={key} lang={lang} />
        </div>
      )}
    </article>
  );
}

export function OfferView({ lang }: { readonly lang: Lang }) {
  const doc = offerDocument(lang);
  const other: Lang = lang === "pl" ? "en" : "pl";
  return (
    <SiteShell
      lang={lang}
      otherPath={offerPath(other)}
      world={{ mode: "quiet" }}
      current="offer"
      mainClassName="offer"
    >
      <h1 className="page-title">{doc.title}</h1>
      <p className="page-lede">{doc.lede}</p>
      <div className="offer-tiers">
        {doc.tiers.map((tier) => (
          <TierCard key={tier.key} tier={tier} lang={lang} />
        ))}
      </div>
      <section className="offer-small">
        <p>{doc.nothingOnSale}</p>
        <p>{doc.howFormsWork}</p>
        <p>{doc.noDna}</p>
        <p>
          <a href={contactPath(lang)}>{doc.writeYourself}</a>
        </p>
      </section>
    </SiteShell>
  );
}
