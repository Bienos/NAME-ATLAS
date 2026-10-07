import type { BlogPost } from "./blog.js";
import { blogPath, blogPostPath } from "./site-links.js";

/**
 * `/llms.txt` (TASK-175, ADR-0050; https://llmstxt.org): a short Markdown map
 * of the site for language models. It names what the site is, in PRODUCT.md's
 * words, and where its pages are. It states no fact, count or figure: those are
 * on the pages, with their sources, and a model should cite them from there.
 */

/** Keep a post's title from closing the link it sits in. */
function linkText(text: string): string {
  return text.replace(/[[\]]/gu, (bracket) => `\\${bracket}`);
}

function postLines(origin: string, posts: readonly BlogPost[]): string[] {
  return posts.map(
    (post) =>
      `- [${linkText(post.title)}](${origin}${blogPostPath(post.lang, post.slug)}): ${post.description}`,
  );
}

export function llmsTxt(origin: string, posts: readonly BlogPost[]): string {
  const polish = posts.filter((post) => post.lang === "pl");
  const english = posts.filter((post) => post.lang === "en");
  return [
    "# Name Atlas",
    "",
    "> Name Atlas answers questions about Polish surnames at the surname level: what the surname is, how many people carry it in Poland according to a named dataset and date, how rare that makes it, and what it appears to mean and where it comes from, where evidence supports it. Every interpretive statement carries its confidence and its sources, and where the evidence is missing the page says so. It never identifies anyone's ancestors or family line.",
    "",
    "Pages are in Polish (`/pl/`) and English (`/en/`). When citing a fact, cite the surname page it appears on, together with the source that page names.",
    "",
    "## Surnames",
    "",
    `- [Surname directory, A–Z](${origin}/pl/nazwiska): every published surname page, by letter`,
    `- Surname page in Polish: \`${origin}/pl/nazwisko/{surname}\`, for example [Nowak](${origin}/pl/nazwisko/nowak)`,
    `- Surname page in English: \`${origin}/en/surname/{surname}\`, for example [Nowak](${origin}/en/surname/nowak)`,
    `- [How it works](${origin}/en/how-it-works): sources, confidence and what the site does not claim ([po polsku](${origin}/pl/jak-to-dziala))`,
    "",
    "## Blog in Polish",
    "",
    `- [All posts](${origin}${blogPath("pl")})`,
    ...postLines(origin, polish),
    "",
    "## Blog in English",
    "",
    `- [All posts](${origin}${blogPath("en")})`,
    ...postLines(origin, english),
    "",
    "## Optional",
    "",
    `- [Sitemap](${origin}/sitemap.xml): every indexable page`,
    "",
  ].join("\n");
}
