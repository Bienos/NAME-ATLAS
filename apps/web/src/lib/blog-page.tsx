import type { Metadata } from "next";
import Image from "next/image";
import { Fragment } from "react";
import type { ReactNode } from "react";
import { formatDate, UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { SiteShell } from "./site-shell.js";
import { blogPath, blogPostPath } from "./site-links.js";
import { SITE_PREVIEW_IMAGE } from "./site-metadata.js";
import { indexingEnabled } from "./seo.js";
import { jsonLd, publisher } from "./structured-data.js";
import { SearchForm } from "./search-form.js";
import { postsIn } from "./blog.js";
import { AtlasGrid, AtlasPoint, ContourField } from "../design-system/graphics/index.js";
import type { Block, BlogPost, Inline } from "./blog.js";

/**
 * `/pl/blog`, `/en/blog` and a post under each (TASK-071). A post is the
 * owner's prose: nothing here reads the register or derives a fact. Pages say
 * `index` only while `SEO_INDEXING_ENABLED` is on, as the surname page does.
 *
 * The redesign (TASK-075): a post's feature image under its title, in its card,
 * as its `og:image` and in its structured data, with the site cover when it has
 * none; cards on the index and under a post; the FAQ and sources set apart; one
 * call-to-action card per page.
 *
 * Brand System v1 (TASK-174, ADR-0046): the pages sit in the `.atlas-v1`
 * scope. The index opens on a masthead beside contour art, the newest post as
 * a wide feature card and the rest numbered; a post opens on a kicker, its
 * title, its description as the lede and the date with minutes to read, then
 * its sections beside a numbered contents list. A post without an image gets
 * drawn contours, seeded by its slug. The art is decoration, never data.
 */

/** The image a post shares: its own, or the site cover. */
function shareImage(post: BlogPost): { readonly url: string; readonly alt: string } {
  return post.image === null
    ? { url: SITE_PREVIEW_IMAGE.url, alt: SITE_PREVIEW_IMAGE.alt }
    : { url: post.image.src, alt: post.image.alt };
}

function locale(lang: Lang): string {
  return lang === "pl" ? "pl_PL" : "en_GB";
}

export function blogIndexMetadata(lang: Lang, enabled: boolean = indexingEnabled()): Metadata {
  const t = UI[lang];
  const title = `${t.blogTitle} | Name Atlas`;
  return {
    title,
    description: t.blogLede,
    alternates: {
      canonical: blogPath(lang),
      languages: { pl: blogPath("pl"), en: blogPath("en") },
    },
    robots: { index: enabled, follow: true },
    openGraph: {
      title,
      description: t.blogLede,
      url: blogPath(lang),
      siteName: "Name Atlas",
      type: "website",
      locale: locale(lang),
      images: [SITE_PREVIEW_IMAGE],
    },
  };
}

export function blogPostMetadata(
  post: BlogPost,
  pair: BlogPost | null,
  enabled: boolean = indexingEnabled(),
): Metadata {
  const path = blogPostPath(post.lang, post.slug);
  const title = `${post.title} | Name Atlas`;
  const languages: Record<string, string> = { [post.lang]: path };
  if (pair !== null) languages[pair.lang] = blogPostPath(pair.lang, pair.slug);
  return {
    title,
    description: post.description,
    alternates: { canonical: path, languages },
    robots: { index: enabled, follow: true },
    openGraph: {
      title,
      description: post.description,
      url: path,
      siteName: "Name Atlas",
      type: "article",
      publishedTime: post.date,
      locale: locale(post.lang),
      images: [post.image === null ? SITE_PREVIEW_IMAGE : shareImage(post)],
    },
  };
}

/**
 * The post's `Article` structured data, as the text of a JSON-LD script. No
 * author: nothing says who writes the posts. The publisher is the site's
 * `Organization`, by the `@id` the landing page gives it (TASK-123). `<` is
 * escaped so no title or description can close the script element.
 */
export function articleJsonLd(post: BlogPost, origin: string | null): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    inLanguage: post.lang,
    publisher: publisher(origin),
    image: `${origin ?? ""}${shareImage(post).url}`,
    ...(origin === null
      ? {}
      : { mainEntityOfPage: `${origin}${blogPostPath(post.lang, post.slug)}` }),
  };
  return jsonLd(data);
}

/** A suffix written on its own, like "-czyk": a hyphen with no letter or digit before it. */
const SUFFIX = /(?<![\p{L}\p{N}])-\p{L}+/gu;

/**
 * Keeps a suffix such as "-czyk" on one line (TASK-072): a browser may break a
 * line after any hyphen, which left "-" at the end of one line and "czyk" at the
 * start of the next. A hyphen inside a word, as in a double-barrelled surname,
 * is left as it is.
 */
export function keepSuffixes(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(SUFFIX)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <span key={match.index} className="nobreak">
        {match[0]}
      </span>,
    );
    last = match.index + match[0].length;
  }
  if (parts.length === 0) return text;
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function Inlines({ inlines }: { readonly inlines: readonly Inline[] }): ReactNode {
  return inlines.map((node, i) => {
    switch (node.kind) {
      case "text":
        return <Fragment key={i}>{keepSuffixes(node.text)}</Fragment>;
      case "strong":
        return <strong key={i}>{keepSuffixes(node.text)}</strong>;
      case "em":
        return <em key={i}>{keepSuffixes(node.text)}</em>;
      case "code":
        return <code key={i}>{node.text}</code>;
      case "link":
        return node.href === null ? (
          <Fragment key={i}>
            <Inlines inlines={node.inlines} />
          </Fragment>
        ) : (
          <a key={i} href={node.href}>
            <Inlines inlines={node.inlines} />
          </a>
        );
    }
  });
}

function BlockView({ block }: { readonly block: Block }) {
  switch (block.kind) {
    case "h2":
      return (
        <h2>
          <Inlines inlines={block.inlines} />
        </h2>
      );
    case "h3":
      return (
        <h3>
          <Inlines inlines={block.inlines} />
        </h3>
      );
    case "p":
      return (
        <p>
          <Inlines inlines={block.inlines} />
        </p>
      );
    case "ul":
      return (
        <ul>
          {block.items.map((item, i) => (
            <li key={i}>
              <Inlines inlines={item} />
            </li>
          ))}
        </ul>
      );
  }
}

/** The plain text of a heading, to recognise the FAQ and the sources. */
function plainText(inlines: readonly Inline[]): string {
  return inlines
    .map((node) => node.text)
    .join("")
    .trim();
}

/**
 * Minutes to read a post at 200 words a minute, at least one (TASK-174). It
 * counts the post's own words; it says nothing about any surname.
 */
export function readingMinutes(post: BlogPost): number {
  const words = (inlines: readonly Inline[]) => plainText(inlines).split(/\s+/u).filter(Boolean);
  let count = post.title.split(/\s+/u).length;
  for (const block of post.body) {
    if (block.kind === "ul") for (const item of block.items) count += words(item).length;
    else count += words(block.inlines).length;
  }
  return Math.max(1, Math.ceil(count / 200));
}

/** A section of a post: its blocks, its kind and, for a numbered section, its anchor. */
interface Section {
  readonly blocks: readonly Block[];
  readonly kind: "" | " blog-faq" | " blog-sources";
  readonly heading: string;
  /** 1, 2, … for a section headed by `##` that is neither the FAQ nor the sources. */
  readonly number: number | null;
}

/**
 * The body as a section per `##` heading (the text before the first one is a
 * section of its own). A section headed exactly as `messages.ts` names the FAQ
 * or the sources gets that section's class; the others are numbered, as the
 * contents list numbers them.
 */
function sectionsOf(post: BlogPost): readonly Section[] {
  const t = UI[post.lang];
  const groups: Block[][] = [];
  for (const block of post.body) {
    if (block.kind === "h2" || groups.length === 0) groups.push([]);
    groups[groups.length - 1]!.push(block);
  }
  let n = 0;
  return groups.map((blocks) => {
    const first = blocks[0]!;
    const heading = first.kind === "h2" ? plainText(first.inlines) : "";
    const kind =
      heading === t.blogFaqHeading
        ? " blog-faq"
        : heading === t.blogSourcesHeading
          ? " blog-sources"
          : "";
    const number = heading !== "" && kind === "" ? ++n : null;
    return { blocks, kind, heading, number };
  });
}

function sectionId(lang: Lang, number: number): string {
  return `${lang === "pl" ? "sekcja" : "section"}-${number}`;
}

function twoDigits(n: number): string {
  return String(n).padStart(2, "0");
}

function Sections({
  post,
  sections,
}: {
  readonly post: BlogPost;
  readonly sections: readonly Section[];
}) {
  return sections.map((section, i) => (
    <section
      key={i}
      className={`blog-section${section.kind}`}
      id={section.number === null ? undefined : sectionId(post.lang, section.number)}
    >
      {section.blocks.map((block, j) => (
        <BlockView key={j} block={block} />
      ))}
    </section>
  ));
}

/** The numbered sections as a contents list; nothing when a post has fewer than two. */
function Contents({
  post,
  sections,
}: {
  readonly post: BlogPost;
  readonly sections: readonly Section[];
}) {
  const numbered = sections.filter((s) => s.number !== null);
  if (numbered.length < 2) return null;
  return (
    <nav className="blog-toc" aria-labelledby="blog-toc-title">
      <p id="blog-toc-title" className="blog-kicker">
        {UI[post.lang].blogToc}
      </p>
      <ol>
        {numbered.map((s) => (
          <li key={s.number}>
            <a href={`#${sectionId(post.lang, s.number!)}`}>
              <span className="blog-toc-n">{twoDigits(s.number!)}</span>
              <span>{keepSuffixes(s.heading)}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** The date and the minutes to read, in the mono metadata line. */
function PostMeta({ post }: { readonly post: BlogPost }) {
  return (
    <p className="blog-date">
      <time dateTime={post.date}>{formatDate(post.date, post.lang)}</time>
      <span className="blog-meta-sep" aria-hidden="true">
        ·
      </span>
      <span>
        {readingMinutes(post)} {UI[post.lang].blogMinutes}
      </span>
    </p>
  );
}

/** A seed per post, so each drawn fallback has its own contours. */
function seedOf(slug: string): number {
  let h = 7;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return h + 1;
}

/** Abstract contour art with the Atlas Point: the drawn stand-in for an image. */
function ContourArt({
  seed,
  variant = "amber",
}: {
  readonly seed: number;
  readonly variant?: "amber" | "blue";
}) {
  return (
    <>
      <ContourField
        seed={seed}
        density={9}
        opacity={0.62}
        variant={variant}
        focusPoint={{ x: 30 + (seed % 40), y: 30 + (seed % 30) }}
      />
      <AtlasGrid />
      <span
        className="blog-art-point"
        style={{ left: `${30 + (seed % 40)}%`, top: `${34 + (seed % 30)}%` }}
      >
        <AtlasPoint size={10} glow />
      </span>
    </>
  );
}

/**
 * A post's feature image in a fixed-ratio frame, so nothing moves when it loads.
 * Without an image a card shows drawn contours; a post page shows nothing.
 */
function PostImage({
  post,
  className,
  sizes,
  preload = false,
  fallback,
}: {
  readonly post: BlogPost;
  readonly className: string;
  readonly sizes: string;
  readonly preload?: boolean;
  readonly fallback: boolean;
}) {
  if (post.image === null) {
    return fallback ? (
      <div className={`${className} blog-image-fallback`} aria-hidden="true">
        <ContourArt seed={seedOf(post.slug)} />
      </div>
    ) : null;
  }
  return (
    <figure className={className}>
      <Image src={post.image.src} alt={post.image.alt} fill sizes={sizes} preload={preload} />
    </figure>
  );
}

/**
 * A post as a card: image, number, date, title and description. The title's
 * link is stretched over the card, so the whole card opens the post and a
 * screen reader hears the title alone. The newest post on the index is the
 * wide feature card.
 */
function PostCard({
  post,
  headingLevel,
  index,
  feature = false,
}: {
  readonly post: BlogPost;
  readonly headingLevel: "h2" | "h3";
  readonly index: number;
  readonly feature?: boolean;
}) {
  const t = UI[post.lang];
  const Heading = headingLevel;
  return (
    <article className={`blog-card${feature ? " blog-card-feature" : ""}`}>
      <PostImage
        post={post}
        className="blog-card-image"
        sizes={feature ? "(max-width: 760px) 100vw, 40rem" : "(max-width: 760px) 100vw, 30rem"}
        preload={feature}
        fallback
      />
      <div className="blog-card-text">
        <p className="blog-kicker blog-card-n" aria-hidden="true">
          <span>{twoDigits(index)}</span>
          {feature ? <span className="blog-card-flag">{t.blogFeatured}</span> : null}
        </p>
        <Heading className="blog-card-title">
          <a className="blog-card-link" href={blogPostPath(post.lang, post.slug)}>
            {keepSuffixes(post.title)}
          </a>
        </Heading>
        <PostMeta post={post} />
        <p className="blog-card-description">{keepSuffixes(post.description)}</p>
        <p className="blog-card-more" aria-hidden="true">
          {t.blogRead} <span className="blog-arrow">→</span>
        </p>
      </div>
    </article>
  );
}

/** "Look up your surname" with the site's own search (TASK-075, item 6). One per page. */
function CallToAction({ lang }: { readonly lang: Lang }) {
  const t = UI[lang];
  return (
    <aside className="blog-cta" aria-labelledby="blog-cta-title">
      <div className="blog-cta-art" aria-hidden="true">
        <ContourField
          seed={41}
          density={8}
          opacity={0.5}
          variant="blue"
          focusPoint={{ x: 72, y: 50 }}
        />
        <span className="blog-cta-point">
          <AtlasPoint size={12} glow />
        </span>
      </div>
      <div className="blog-cta-text">
        <h2 id="blog-cta-title" className="blog-cta-title">
          {t.blogCtaTitle}
        </h2>
        <p className="blog-cta-body">{t.blogCtaBody}</p>
        <SearchForm lang={lang} query="" />
      </div>
    </aside>
  );
}

export function BlogIndexView({
  lang,
  posts,
}: {
  readonly lang: Lang;
  readonly posts: readonly BlogPost[];
}) {
  const t = UI[lang];
  const own = postsIn(posts, lang);
  const [first, ...rest] = own;
  return (
    <SiteShell
      lang={lang}
      otherPath={blogPath(lang === "pl" ? "en" : "pl")}
      world={{ mode: "quiet" }}
      mainClassName="blog blog-index atlas-v1"
    >
      <header className="blog-masthead">
        <div className="blog-masthead-text">
          <p className="blog-kicker">
            <AtlasPoint size={8} glow />
            {t.blogKicker}
          </p>
          <h1 className="page-title">{t.blogTitle}</h1>
          <p className="page-lede">{t.blogLede}</p>
        </div>
        <div className="blog-masthead-art" aria-hidden="true">
          <ContourField seed={23} density={10} opacity={0.7} focusPoint={{ x: 62, y: 44 }} />
          <ContourField
            seed={57}
            density={5}
            opacity={0.45}
            variant="blue"
            orientation="falling"
            focusPoint={{ x: 40, y: 60 }}
          />
          <AtlasGrid />
          <span className="blog-masthead-point">
            <AtlasPoint size={14} glow />
          </span>
          <span className="blog-masthead-tag">52°N · 19°E</span>
        </div>
      </header>
      {first === undefined ? (
        <p className="blog-empty">{t.blogEmpty}</p>
      ) : (
        <ul className="blog-cards" aria-label={t.blogListLabel}>
          <li className="blog-cards-feature">
            <PostCard post={first} headingLevel="h2" index={1} feature />
          </li>
          {rest.map((post, i) => (
            <li key={post.slug}>
              <PostCard post={post} headingLevel="h2" index={i + 2} />
            </li>
          ))}
        </ul>
      )}
      <CallToAction lang={lang} />
    </SiteShell>
  );
}

export function BlogPostView({
  post,
  pair,
  origin,
  posts = [],
}: {
  readonly post: BlogPost;
  readonly pair: BlogPost | null;
  /** `SITE_ORIGIN`, for the structured data's address; `null` leaves it out. */
  readonly origin: string | null;
  /** Every post, for "more posts": the others in this post's language. */
  readonly posts?: readonly BlogPost[];
}) {
  const t = UI[post.lang];
  const other: Lang = post.lang === "pl" ? "en" : "pl";
  const more = postsIn(posts, post.lang).filter((p) => p.slug !== post.slug);
  const sections = sectionsOf(post);
  return (
    <SiteShell
      lang={post.lang}
      otherPath={pair === null ? blogPath(other) : blogPostPath(other, pair.slug)}
      world={{ mode: "quiet" }}
      mainClassName="blog blog-article atlas-v1"
    >
      <article className="blog-post">
        <header className="blog-post-header">
          <p className="blog-kicker">
            <AtlasPoint size={8} glow />
            <a href={blogPath(post.lang)}>{t.blogTitle}</a>
          </p>
          <h1 className="page-title">{keepSuffixes(post.title)}</h1>
          <p className="page-lede">{keepSuffixes(post.description)}</p>
          <PostMeta post={post} />
        </header>
        {post.image === null ? (
          <div className="blog-post-art" aria-hidden="true">
            <ContourArt seed={seedOf(post.slug)} />
          </div>
        ) : (
          <PostImage
            post={post}
            className="blog-hero"
            sizes="(max-width: 760px) 100vw, 64rem"
            preload
            fallback={false}
          />
        )}
        <div className="blog-post-grid">
          <Contents post={post} sections={sections} />
          <div className="blog-body">
            <Sections post={post} sections={sections} />
          </div>
        </div>
      </article>
      <CallToAction lang={post.lang} />
      {more.length === 0 ? null : (
        <nav className="blog-more" aria-labelledby="blog-more-title">
          <h2 id="blog-more-title" className="blog-more-title">
            {t.blogMore}
          </h2>
          <ul className="blog-cards">
            {more.map((p, i) => (
              <li key={p.slug}>
                <PostCard post={p} headingLevel="h3" index={i + 1} />
              </li>
            ))}
          </ul>
        </nav>
      )}
      <p className="blog-back">
        <a href={blogPath(post.lang)}>{t.blogBack}</a>
      </p>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: articleJsonLd(post, origin) }}
      />
    </SiteShell>
  );
}
