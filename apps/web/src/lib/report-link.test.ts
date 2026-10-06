import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SurnameResultResponse } from "@name-atlas/contracts";
import { ReportLink, reportHref } from "./report-link.js";
import { ComparisonView } from "./compare-view.js";
import { contactPath } from "./site-links.js";
import { CanonicalSurnamePage } from "./surname-page.js";

// The result body is tested in result-view.test.ts; here only the page's
// actions matter, so the body renders nothing and needs no full fixture.
vi.mock("./result-view.js", () => ({ Result: () => null }));

/** The page a report link opens and the prefill in its fragment: the topic, and the message with its first line as the subject. */
function decoded(href: string): { page: string; topic: string; subject: string; body: string } {
  const at = href.indexOf("#");
  const params = new URLSearchParams(href.slice(at + 1));
  const message = params.get("message") ?? "";
  const [subject = "", ...rest] = message.split("\n");
  return {
    page: href.slice(0, at),
    topic: params.get("topic") ?? "",
    subject,
    body: rest.join("\n"),
  };
}

describe("reportHref (TASK-050; the contact form since 2026-10-06)", () => {
  it("opens the contact form on the data-error topic, names the surname and carries the page URL", () => {
    const m = decoded(reportHref(["ŁUCZAK"], "https://a.test/pl/nazwisko/%C5%82uczak", "pl"));
    expect(m.page).toBe(contactPath("pl"));
    expect(m.topic).toBe("Błąd w danych");
    expect(m.subject).toBe("Name Atlas, zgłoszenie: ŁUCZAK");
    expect(m.body).toContain("Strona: https://a.test/pl/nazwisko/%C5%82uczak\n");
    expect(m.body).toContain("Źródło, jeśli je znasz:");
  });

  it("keeps the prefill in one fragment, with no address and nothing for the server, and cannot be split by what it carries", () => {
    const href = reportHref(["A&B=C"], "/en/compare?a=x&b=y#top", "en");
    expect(href.startsWith(`${contactPath("en")}#`)).toBe(true);
    expect(href.indexOf("#")).toBe(href.lastIndexOf("#"));
    expect(href).not.toContain("?");
    expect(href).not.toContain("mailto:");
    const m = decoded(href);
    expect(m.topic).toBe("An error in the data");
    expect(m.subject).toBe("Name Atlas, report: A&B=C");
    expect(m.body).toContain("Page: /en/compare?a=x&b=y#top\n");
  });

  it("renders nothing without a surname", () => {
    const html = renderToStaticMarkup(
      createElement(ReportLink, { surnames: [], pageUrl: "/", lang: "pl" }),
    );
    expect(html).toBe("");
  });
});

describe("the report link on the pages", () => {
  it("is announced on the contact page", async () => {
    const { ContactView } = await import("./contact-page.js");
    const html = renderToStaticMarkup(createElement(ContactView, { lang: "pl" }));
    expect(html).toContain("„Zgłoś błąd”");
  });

  it("is on a surname result page, with the absolute canonical URL", () => {
    const html = renderToStaticMarkup(
      createElement(CanonicalSurnamePage, {
        answer: {
          kind: "RESULT",
          response: {} as SurnameResultResponse,
          display: "NOWAK",
          slug: "nowak",
          otherLangPath: null,
          gates: { seoSurfaceAllowed: false, privacyPublic: true },
        },
        lang: "en",
        slug: "nowak",
        intent: "default",
        origin: "https://a.test",
      }),
    );
    const href = /href="(\/en\/contact#[^"]+)">Report a problem</u.exec(html)?.[1];
    expect(href).toBeDefined();
    const m = decoded(href!.replaceAll("&amp;", "&"));
    expect(m.subject).toBe("Name Atlas, report: NOWAK");
    expect(m.body).toContain("Page: https://a.test/en/surname/nowak\n");
  });

  it("is on the comparison page with both surnames, and absent when neither resolved", () => {
    const side = (slug: string, display: string | null) => ({
      slug,
      display,
      response: null,
      path: null,
    });
    const html = renderToStaticMarkup(
      createElement(ComparisonView, {
        a: side("nowak", "NOWAK"),
        b: side("kowalski", "KOWALSKI"),
        lang: "pl",
        origin: "https://a.test",
      }),
    );
    const href = /href="(\/pl\/kontakt#[^"]+)">Zgłoś błąd</u.exec(html)?.[1];
    const m = decoded(href!.replaceAll("&amp;", "&"));
    expect(m.subject).toBe("Name Atlas, zgłoszenie: NOWAK / KOWALSKI");
    expect(m.body).toContain("Strona: https://a.test/pl/porownaj?a=nowak&b=kowalski\n");

    const none = renderToStaticMarkup(
      createElement(ComparisonView, { a: side("x", null), b: side("y", null), lang: "pl" }),
    );
    expect(none).not.toContain("Zgłoś błąd");
  });
});
