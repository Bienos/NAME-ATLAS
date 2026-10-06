import { describe, expect, it } from "vitest";
import { assembleBirthListPage } from "./given-name-birth-list.js";
import type { BirthListPageRowSql } from "./given-name-birth-list.js";
import type { BirthListInfo } from "./given-name-birth-facts.js";

/**
 * TASK-146: the shape and the rights decision of one list's page. Synthetic
 * rows; ordering, paging, direction and the flagged form are SQL, and the
 * integration test (`tests/integration/src/baby-names-list.test.ts`) reads
 * them from a database.
 */

const LIST: BirthListInfo = {
  list_id: "list-1",
  birth_year: 2025,
  sex: "FEMALE",
  publication_threshold: 2,
};

const row = (n: number, over: Partial<BirthListPageRowSql> = {}): BirthListPageRowSql => ({
  total: "939",
  given_name_id: `name-${n}`,
  display_name: `NAME${n}`,
  count: 1000 - n,
  rank: n,
  universe_size: 939,
  direction: null,
  claim_id: `claim-${n}`,
  citation_id: "cit-1",
  citation_title: "Imiona nadawane dzieciom w Polsce",
  citation_publisher: "Ministerstwo Cyfryzacji",
  citation_publication_date: null,
  citation_url: "https://example.test/r",
  citation_locator: "resource:1159538",
  citation_retrieved_at: null,
  citation_source_page_url: null,
  source_type: "OFFICIAL_DATASET",
  attribution_text: null,
  terms_version: null,
  automated_access: "ALLOWED",
  commercial_use: "ALLOWED",
  redistribution: "ALLOWED",
  metadata_rights: "ALLOWED",
  review_status: "APPROVED",
  ...over,
});

describe("assembleBirthListPage (TASK-146)", () => {
  it("keeps the rows in the order read, one source for the list, and the list's total", () => {
    const page = assembleBirthListPage(LIST, [row(1), row(2), row(3)], "FREE");
    expect(page.state).toBe("READY");
    expect(page.rows.map((r) => r.display_name)).toEqual(["NAME1", "NAME2", "NAME3"]);
    expect(page.total).toBe(939);
    expect(page.citations).toHaveLength(1);
    expect(page.citations[0]?.locator).toBe("resource:1159538");
  });

  it("a name with no rank claim has no rank and no list size, never 0", () => {
    const page = assembleBirthListPage(LIST, [row(1, { rank: null, universe_size: 939 })], "FREE");
    expect(page.rows[0]?.rank).toBeNull();
    expect(page.rows[0]?.universe_size).toBeNull();
  });

  it("takes a direction only when it is one of the three", () => {
    const page = assembleBirthListPage(
      LIST,
      [row(1, { direction: "RISING" }), row(2, { direction: "SIDEWAYS" }), row(3)],
      "FREE",
    );
    expect(page.rows.map((r) => r.direction)).toEqual(["RISING", null, null]);
  });

  it("a claim cited to two records is one name with both citations", () => {
    const page = assembleBirthListPage(
      LIST,
      [row(1), row(1, { citation_id: "cit-2", citation_locator: "resource:28021" })],
      "FREE",
    );
    expect(page.rows).toHaveLength(1);
    expect(page.citations.map((c) => c.locator)).toEqual(["resource:1159538", "resource:28021"]);
  });

  it("an empty page is READY with no rows and a total of 0", () => {
    expect(assembleBirthListPage(LIST, [], "PAID")).toEqual({
      state: "READY",
      list: LIST,
      rows: [],
      total: 0,
      citations: [],
    });
  });

  it("a claim whose rights the surface refuses blocks the whole page", () => {
    const blocked = assembleBirthListPage(
      LIST,
      [row(1), row(2, { review_status: "BLOCKED" })],
      "PAID",
    );
    expect(blocked).toEqual({
      state: "RIGHTS_BLOCKED",
      list: LIST,
      rows: [],
      total: 0,
      citations: [],
    });
  });
});
