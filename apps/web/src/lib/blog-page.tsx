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

function PostDate({ post }: { readonly post: BlogPost }) {
  return (
    <p className="blog-date">
      <time dateTime={post.date}>{formatDate(post.date, post.lang)}</time>
    </p>
  );
}

/** The plain text of a heading, to recognise the FAQ and the sources. */
function plainText(inlines: readonly Inline[]): string {
  return inlines
    .map((node) => node.text)
    .join("")
    .trim();
}

/**
 * The body as a section per `##` heading (the text before the first one is a
 * section of its own). A section headed exactly as `messages.ts` names the FAQ
 * or the sources gets that section's class.
 */
function Sections({ post }: { readonly post: BlogPost }) {
  const t = UI[post.lang];
  const groups: Block[][] = [];
  for (const block of post.body) {
    if (block.kind === "h2" || groups.length === 0) groups.push([]);
    groups[groups.length - 1]!.push(block);
  }
  return groups.map((blocks, i) => {
    const first = blocks[0]!;
    const heading = first.kind === "h2" ? plainText(first.inlines) : "";
    const kind =
      heading === t.blogFaqHeading
        ? " blog-faq"
        : heading === t.blogSourcesHeading
          ? " blog-sources"
          : "";
    return (
      <section key={i} className={`blog-section${kind}`}>
        {blocks.map((block, j) => (
          <BlockView key={j} block={block} />
        ))}
      </section>
    );
  });
}

/**
 * A post's feature image in a fixed-ratio frame, so nothing moves when it loads.
 * Without an image a card shows a drawn fallback; a post page shows nothing.
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
      <div className={`${className} blog-image-fallback`} aria-hidden="true" />
    ) : null;
  }
  return (
    <figure className={className}>
      <Image src={post.image.src} alt={post.image.alt} fill sizes={sizes} preload={preload} />
    </figure>
  );
}

/**
 * A post as a card: image, title, date and description. The title's link is
 * stretched over the card, so the whole card opens the post and a screen
 * reader hears the title alone.
 */
function PostCard({
  post,
  headingLevel,
}: {
  readonly post: BlogPost;
  readonly headingLevel: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <article className="blog-card">
      <PostImage
        post={post}
        className="blog-card-image"
        sizes="(max-width: 760px) 100vw, 30rem"
        fallback
      />
      <div className="blog-card-text">
        <Heading className="blog-card-title">
          <a className="blog-card-link" href={blogPostPath(post.lang, post.slug)}>
            {keepSuffixes(post.title)}
          </a>
        </Heading>
        <PostDate post={post} />
        <p className="blog-card-description">{keepSuffixes(post.description)}</p>
      </div>
    </article>
  );
}

/** "Look up your surname" with the site's own search (TASK-075, item 6). One per page. */
function CallToAction({ lang }: { readonly lang: Lang }) {
  const t = UI[lang];
  return (
    <aside className="blog-cta" aria-labelledby="blog-cta-title">
      <h2 id="blog-cta-title" className="blog-cta-title">
        {t.blogCtaTitle}
      </h2>
      <p className="blog-cta-body">{t.blogCtaBody}</p>
      <SearchForm lang={lang} query="" />
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
  return (
    <SiteShell
      lang={lang}
      otherPath={blogPath(lang === "pl" ? "en" : "pl")}
      world={{ mode: "quiet" }}
      mainClassName="reading blog blog-index"
    >
      <h1 className="page-title">{t.blogTitle}</h1>
      <p className="page-lede">{t.blogLede}</p>
      {own.length === 0 ? (
        <p className="blog-empty">{t.blogEmpty}</p>
      ) : (
        <ul className="blog-cards" aria-label={t.blogListLabel}>
          {own.map((post) => (
            <li key={post.slug}>
              <PostCard post={post} headingLevel="h2" />
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
  return (
    <SiteShell
      lang={post.lang}
      otherPath={pair === null ? blogPath(other) : blogPostPath(other, pair.slug)}
      world={{ mode: "quiet" }}
      mainClassName="reading blog"
    >
      <article className="blog-post">
        <header className="blog-post-header">
          <h1 className="page-title">{keepSuffixes(post.title)}</h1>
          <PostDate post={post} />
        </header>
        <PostImage
          post={post}
          className="blog-hero"
          sizes="(max-width: 760px) 100vw, 46rem"
          preload
          fallback={false}
        />
        <div className="blog-body">
          <Sections post={post} />
        </div>
      </article>
      <CallToAction lang={post.lang} />
      {more.length === 0 ? null : (
        <nav className="blog-more" aria-labelledby="blog-more-title">
          <h2 id="blog-more-title" className="blog-more-title">
            {t.blogMore}
          </h2>
          <ul className="blog-cards">
            {more.map((p) => (
              <li key={p.slug}>
                <PostCard post={p} headingLevel="h3" />
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
