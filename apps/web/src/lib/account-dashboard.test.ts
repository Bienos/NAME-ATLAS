import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { AccountSummary, PurchaseView } from "@name-atlas/accounts";
import type { TreeSummary } from "@name-atlas/family";
import { AccountView } from "./account-page.js";
import type { AccountPageData, SessionView } from "./account-page.js";
import { loadAccountOverview, planOf, UNKNOWN_OVERVIEW } from "./account-overview.js";
import type { AccountFeatures, AccountOverview } from "./account-overview.js";
import { ACCOUNT_STEPS } from "./account-paths.js";
import { ACCOUNT_TEXT } from "./account-text.js";
import { treePath } from "./tree-paths.js";

const LANGS = ["pl", "en"] as const;
const TOKEN = "k".repeat(43);
const SESSION: SessionView = {
  email: "reader@example.test",
  hasPassword: true,
  termsVersion: "2026-10-01",
  termsAcceptedOn: "2026-10-02",
};
const ALL: AccountFeatures = { tree: true, babyNames: true };

const OVERVIEW: AccountOverview = {
  memberSince: "2026-10-02",
  lastSignInOn: "2026-10-06",
  googleLinked: false,
  activeSessions: 3,
  purchases: [],
  trees: [
    { id: "tree-1", title: "Kowalscy", role: "OWNER", people: 4, updatedOn: "2026-10-06" },
    { id: "tree-2", title: "Nowakowie", role: "EDITOR", people: 9, updatedOn: "2026-09-30" },
  ],
};

function data(
  overrides: Partial<AccountPageData> & Pick<AccountPageData, "step">,
): AccountPageData {
  return {
    lang: "pl",
    status: null,
    token: null,
    session: null,
    next: null,
    ways: { mail: true, google: false },
    ...overrides,
  };
}

function render(
  d: AccountPageData,
  extra: { overview?: AccountOverview; features?: AccountFeatures; purchases?: unknown } = {},
): string {
  return renderToStaticMarkup(
    createElement(AccountView, {
      data: d,
      overview: extra.overview,
      features: extra.features,
      purchases: extra.purchases as never,
    }),
  ).replaceAll("&amp;", "&");
}

const dashboard = (lang: "pl" | "en", overview: AccountOverview, features = ALL) =>
  render(data({ lang, step: "account", session: SESSION }), { overview, features });

describe("the plan a reader's purchases add up to (TASK-153)", () => {
  it("is unknown when the purchases could not be read, never free", () => {
    expect(planOf(null)).toEqual({ kind: "unknown" });
  });

  it("is free with no purchase", () => {
    expect(planOf([])).toEqual({ kind: "free" });
  });

  it("names the dearest tier held and allows exactly what the entitlement checks allow", () => {
    const babyOnly = planOf([{ tier: "babynames", amountTotal: 899, paidOn: "2026-10-04" }]);
    expect(babyOnly).toMatchObject({
      kind: "paid",
      top: "babynames",
      treeUnlimited: false, // D-044 §5: the 8,99 zł product does not lift the tree's cap
      babyNamesFull: true,
      spent: 899,
    });
    const both = planOf([
      { tier: "couple", amountTotal: 8999, paidOn: "2026-10-05" },
      { tier: "babynames", amountTotal: 899, paidOn: "2026-10-04" },
      { tier: "couple", amountTotal: 8999, paidOn: "2026-10-06" },
    ]);
    expect(both).toMatchObject({
      kind: "paid",
      top: "couple",
      tiers: ["babynames", "couple"],
      treeUnlimited: true,
      babyNamesFull: true,
      spent: 18897,
    });
  });

  it("keeps a tier the offer no longer lists instead of dropping it", () => {
    expect(planOf([{ tier: "retired", amountTotal: 100, paidOn: "2026-10-01" }])).toMatchObject({
      kind: "paid",
      top: "retired",
      tiers: ["retired"],
      treeUnlimited: false,
      babyNamesFull: false,
    });
  });
});

describe("reading the dashboard's facts (TASK-153)", () => {
  const SUMMARY: AccountSummary = {
    createdAt: new Date("2026-10-02T08:00:00Z"),
    lastSignInAt: new Date("2026-10-06T09:30:00Z"),
    googleLinked: true,
    activeSessions: 2,
  };
  const PURCHASE: PurchaseView = {
    tier: "couple",
    amountTotal: 8999,
    paidAt: new Date("2026-10-05T10:00:00Z"),
  };
  const TREE: TreeSummary = {
    tree_id: "tree-1",
    title: "Kowalscy",
    role: "OWNER",
    person_count: 4,
    updated_at: "2026-10-06T07:00:00.000Z",
  };

  it("maps every read into the page's shape", async () => {
    const overview = await loadAccountOverview({
      userId: "u",
      summary: () => Promise.resolve(SUMMARY),
      purchases: () => Promise.resolve([PURCHASE]),
      trees: () => Promise.resolve([TREE]),
    });
    expect(overview).toEqual({
      memberSince: "2026-10-02",
      lastSignInOn: "2026-10-06",
      googleLinked: true,
      activeSessions: 2,
      purchases: [{ tier: "couple", amountTotal: 8999, paidOn: "2026-10-05" }],
      trees: [
        { id: "tree-1", title: "Kowalscy", role: "OWNER", people: 4, updatedOn: "2026-10-06" },
      ],
    });
  });

  it("turns a failed read into unknown for that fact alone, never into zero or none", async () => {
    const overview = await loadAccountOverview({
      userId: "u",
      summary: () => Promise.reject(new Error("down")),
      purchases: () => Promise.reject(new Error("down")),
      trees: () => Promise.resolve([TREE]),
    });
    expect(overview).toMatchObject({
      memberSince: null,
      googleLinked: null,
      activeSessions: null,
      purchases: null,
    });
    expect(overview.trees).toHaveLength(1);
  });

  it("does not read the trees while the tree is off", async () => {
    const overview = await loadAccountOverview({
      userId: "u",
      summary: () => Promise.resolve(SUMMARY),
      purchases: () => Promise.resolve([]),
      trees: null,
    });
    expect(overview.trees).toBeNull();
    expect(overview.purchases).toEqual([]);
  });
});

describe("the account's dashboard (TASK-153)", () => {
  it("shows the plan, the trees, the purchases and how the reader signs in, in both languages", () => {
    for (const lang of LANGS) {
      const d = ACCOUNT_TEXT[lang].dashboard;
      const html = dashboard(lang, OVERVIEW);
      expect(html, lang).toContain(d.planChip.free);
      expect(html, lang).toContain(d.plan.heading);
      expect(html, lang).toContain(d.search.history);
      expect(html, lang).toContain('role="search"');
      expect(html, lang).toContain(treePath(lang, { page: "tree", treeId: "tree-1" }));
      expect(html, lang).toContain(d.purchases.none);
      expect(html, lang).toContain(d.security.heading);
      expect(html, lang).toContain(
        d.memberSince(lang === "pl" ? "2 października 2026 r." : "2 October 2026"),
      );
      expect(html, lang).not.toContain("..");
    }
  });

  it("shows the free tree's room on the reader's own tree only, and not once the cap is lifted", () => {
    const free = dashboard("pl", OVERVIEW);
    expect(free).toContain(ACCOUNT_TEXT.pl.dashboard.trees.freeCap(4, 5));
    expect(free.split("account-tree-cap")).toHaveLength(2);
    const paid = dashboard("pl", {
      ...OVERVIEW,
      purchases: [{ tier: "smaller", amountTotal: 2899, paidOn: "2026-10-05" }],
    });
    expect(paid).not.toContain("account-tree-cap");
    expect(paid).toContain(ACCOUNT_TEXT.pl.dashboard.planChip.paid("Małe poszukiwania"));
    expect(paid).toContain(ACCOUNT_TEXT.pl.dashboard.plan.treeMore(5));
    expect(paid).toContain("28,99 zł");
  });

  it("says plainly what it could not read, and claims no plan, no zero and no empty list", () => {
    for (const lang of LANGS) {
      const d = ACCOUNT_TEXT[lang].dashboard;
      const html = dashboard(lang, UNKNOWN_OVERVIEW);
      expect(html, lang).toContain(d.planChip.unknown);
      expect(html, lang).toContain(d.plan.unknown);
      expect(html, lang).toContain(d.trees.unreadable);
      expect(html, lang).toContain(d.purchases.unreadable);
      expect(html, lang).toContain(d.stats.none);
      expect(html, lang).not.toContain(d.planChip.free);
      expect(html, lang).not.toContain(d.purchases.none);
      expect(html, lang).not.toMatch(/<dd>0<\/dd>/u);
    }
  });

  it("leaves out the sections this site does not have", () => {
    const html = dashboard("pl", OVERVIEW, { tree: false, babyNames: false });
    expect(html).not.toContain("account-trees");
    expect(html).not.toContain(ACCOUNT_TEXT.pl.dashboard.plan.babyNames);
    expect(html).not.toContain(ACCOUNT_TEXT.pl.dashboard.plan.tree);
  });

  it("shows Google's row only where Google sign-in exists or is linked", () => {
    expect(dashboard("en", OVERVIEW)).not.toContain(ACCOUNT_TEXT.en.dashboard.security.googleOff);
    const linked = dashboard("en", { ...OVERVIEW, googleLinked: true });
    expect(linked).toContain(ACCOUNT_TEXT.en.dashboard.security.googleOn);
  });

  it("puts test-mode checkout's section in place of the plain purchase list", () => {
    const html = render(data({ step: "account", session: SESSION }), {
      overview: OVERVIEW,
      features: ALL,
      purchases: createElement("section", { className: "checkout-marker" }),
    });
    expect(html).toContain("checkout-marker");
    expect(html).not.toContain(ACCOUNT_TEXT.pl.dashboard.purchases.none);
  });
});

describe("the sign-in pages' plate (TASK-153)", () => {
  it("lists what an account gives, one line per section this site has", () => {
    const a = ACCOUNT_TEXT.pl.art;
    const none = render(data({ step: "sign-in" }));
    expect(none).toContain(a.perks.cards);
    expect(none).not.toContain(a.perks.tree(5));
    const all = render(data({ step: "sign-in" }), { features: ALL });
    expect(all).toContain(a.perks.tree(5));
    expect(all).toContain(a.perks.babyNames);
  });

  it("still shows no form at all on a spent link, art and all", () => {
    for (const step of ["confirm", "new-password"] as const) {
      const html = render(data({ step, token: null, status: "expired" }), { features: ALL });
      expect(html, step).not.toContain("<form");
      expect(html, step).toContain("account-art");
    }
  });

  it("has an eyebrow on every step in both languages", () => {
    for (const lang of LANGS) {
      for (const step of ACCOUNT_STEPS) {
        const eyebrow = ACCOUNT_TEXT[lang].eyebrows[step];
        expect(eyebrow.length, `${lang} ${step}`).toBeGreaterThan(3);
        if (step === "account") continue;
        const html = render(
          data({ lang, step, token: step === "confirm" || step === "new-password" ? TOKEN : null }),
        );
        expect(html, `${lang} ${step}`).toContain(eyebrow);
      }
    }
  });
});
