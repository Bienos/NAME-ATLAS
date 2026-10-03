import type { Metadata } from "next";
import type { ReactNode } from "react";
import { formatDate, UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { SiteShell } from "./site-shell.js";
import { blogPath, blogPostPath } from "./site-links.js";
import { SITE_PREVIEW_IMAGE } from "./site-metadata.js";
import { indexingEnabled } from "./seo.js";
import { postsIn } from "./blog.js";
import type { Block, BlogPost, Inline } from "./blog.js";

/**
 * `/pl/blog`, `/en/blog` and a post under each (TASK-071). A post is the
 * owner's prose: nothing here reads the register or derives a fact. Pages say
 * `index` only while `SEO_INDEXING_ENABLED` is on, as the surname page does.
 */

function locale(lang: Lang): string {
  return lang === "pl" ? "pl_PL" : "en_GB";
}

export function blogIndexMetadata(lang: Lang, enabled: boolean = indexingEnabled()): Metadata {
  const t = UI[lang];
  const title = `${t.blogTitle} — Name Atlas`;
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
  const title = `${post.title} — Name Atlas`;
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
      images: [SITE_PREVIEW_IMAGE],
    },
  };
}

/**
 * The post's `Article` structured data, as the text of a JSON-LD script. No
 * author: nothing says who writes the posts. `<` is escaped so no title or
 * description can close the script element.
 */
export function articleJsonLd(post: BlogPost, origin: string | null): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    inLanguage: post.lang,
    publisher: { "@type": "Organization", name: "Name Atlas" },
    ...(origin === null
      ? {}
      : { mainEntityOfPage: `${origin}${blogPostPath(post.lang, post.slug)}` }),
  };
  return JSON.stringify(data).replace(/</gu, "\\u003c");
}

function Inlines({ inlines }: { readonly inlines: readonly Inline[] }): ReactNode {
  return inlines.map((node, i) => {
    switch (node.kind) {
      case "text":
        return node.text;
      case "strong":
        return <strong key={i}>{node.text}</strong>;
      case "em":
        return <em key={i}>{node.text}</em>;
      case "code":
        return <code key={i}>{node.text}</code>;
      case "link":
        return node.href === null ? (
          node.text
        ) : (
          <a key={i} href={node.href}>
            {node.text}
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
      mainClassName="reading blog"
    >
      <h1 className="page-title">{t.blogTitle}</h1>
      <p className="page-lede">{t.blogLede}</p>
      {own.length === 0 ? (
        <p className="blog-empty">{t.blogEmpty}</p>
      ) : (
        <ul className="blog-list" aria-label={t.blogListLabel}>
          {own.map((post) => (
            <li key={post.slug}>
              <article>
                <h2 className="blog-entry-title">
                  <a href={blogPostPath(lang, post.slug)}>{post.title}</a>
                </h2>
                <PostDate post={post} />
                <p>{post.description}</p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </SiteShell>
  );
}

export function BlogPostView({
  post,
  pair,
  origin,
}: {
  readonly post: BlogPost;
  readonly pair: BlogPost | null;
  /** `SITE_ORIGIN`, for the structured data's address; `null` leaves it out. */
  readonly origin: string | null;
}) {
  const t = UI[post.lang];
  const other: Lang = post.lang === "pl" ? "en" : "pl";
  return (
    <SiteShell
      lang={post.lang}
      otherPath={pair === null ? blogPath(other) : blogPostPath(other, pair.slug)}
      world={{ mode: "quiet" }}
      mainClassName="reading blog"
    >
      <article className="blog-post">
        <h1 className="page-title">{post.title}</h1>
        <PostDate post={post} />
        <div className="blog-body">
          {post.body.map((block, i) => (
            <BlockView key={i} block={block} />
          ))}
        </div>
      </article>
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
