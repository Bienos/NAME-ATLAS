import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SurnameResultResponse } from "@name-atlas/contracts";
import { CONTACT_EMAIL } from "./contact.js";
import { ReportLink, reportMailto } from "./report-link.js";
import { ComparisonView } from "./compare-view.js";
import { CanonicalSurnamePage } from "./surname-page.js";

// The result body is tested in result-view.test.ts; here only the page's
// actions matter, so the body renders nothing and needs no full fixture.
vi.mock("./result-view.js", () => ({ Result: () => null }));

function decoded(href: string): { to: string; subject: string; body: string } {
  const url = new URL(href);
  return {
    to: url.pathname,
    subject: url.searchParams.get("subject") ?? "",
    body: url.searchParams.get("body") ?? "",
  };
}

describe("reportMailto (TASK-050)", () => {
  it("addresses the contact, names the surname and carries the page URL", () => {
    const m = decoded(reportMailto(["ŁUCZAK"], "https://a.test/pl/nazwisko/%C5%82uczak", "pl"));
    expect(m.to).toBe(CONTACT_EMAIL);
    expect(m.subject).toBe("Name Atlas, zgłoszenie: ŁUCZAK");
    expect(m.body).toContain("Strona: https://a.test/pl/nazwisko/%C5%82uczak\n");
    expect(m.body).toContain("Źródło, jeśli je znasz:");
  });

  it("encodes spaces as %20, never +, and cannot be split by what it carries", () => {
    const href = reportMailto(["A&B=C"], "/en/compare?a=x&b=y", "en");
    expect(href).not.toContain("+");
    expect(href).toContain("%20");
    const m = decoded(href);
    expect(m.subject).toBe("Name Atlas, report: A&B=C");
    expect(m.body).toContain("Page: /en/compare?a=x&b=y\n");
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
    const href = /href="(mailto:[^"]+)">Report a problem</u.exec(html)?.[1];
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
    const href = /href="(mailto:[^"]+)">Zgłoś błąd</u.exec(html)?.[1];
    const m = decoded(href!.replaceAll("&amp;", "&"));
    expect(m.subject).toBe("Name Atlas, zgłoszenie: NOWAK / KOWALSKI");
    expect(m.body).toContain("Strona: https://a.test/pl/porownaj?a=nowak&b=kowalski\n");

    const none = renderToStaticMarkup(
      createElement(ComparisonView, { a: side("x", null), b: side("y", null), lang: "pl" }),
    );
    expect(none).not.toContain("Zgłoś błąd");
  });
});
