import { describe, expect, it } from "vitest";
import { performShare } from "./share-button.js";
import type { ShareEvent } from "./share-button.js";

/** TASK-024 AC-6 — the share decision logic against a stubbed navigator. */
function recorder() {
  const events: ShareEvent[] = [];
  return { events, report: (e: ShareEvent) => events.push(e) };
}

describe("performShare", () => {
  const data = { title: "NOWAK — Name Atlas", url: "https://example.test/pl/nazwisko/nowak" };

  it("uses Web Share when available and reports completion", async () => {
    const r = recorder();
    const status = await performShare(
      { share: async () => undefined, writeText: async () => undefined, report: r.report },
      data,
    );
    expect(status).toBe("SHARED");
    expect(r.events).toEqual(["share_started", "share_completed"]);
  });

  it("treats a dismissed sheet as cancelled, not failed, and does not fall back to copying", async () => {
    const r = recorder();
    let copied = false;
    const abort = new Error("dismissed");
    abort.name = "AbortError";
    const status = await performShare(
      {
        share: async () => {
          throw abort;
        },
        writeText: async () => {
          copied = true;
        },
        report: r.report,
      },
      data,
    );
    expect(status).toBe("CANCELLED");
    expect(copied).toBe(false);
    expect(r.events).toEqual(["share_started", "share_cancelled"]);
  });

  it("falls back to the clipboard when Web Share is absent", async () => {
    const r = recorder();
    let text = "";
    const status = await performShare(
      {
        share: undefined,
        writeText: async (t) => {
          text = t;
        },
        report: r.report,
      },
      data,
    );
    expect(status).toBe("COPIED");
    expect(text).toBe(data.url);
    expect(r.events).toEqual(["share_started", "copy_link_success"]);
  });

  it("falls back to the clipboard when Web Share fails for another reason", async () => {
    const r = recorder();
    const status = await performShare(
      {
        share: async () => {
          throw new Error("NotAllowedError");
        },
        writeText: async () => undefined,
        report: r.report,
      },
      data,
    );
    expect(status).toBe("COPIED");
  });

  it("reports a denied clipboard so the page can show the link as text", async () => {
    const r = recorder();
    const status = await performShare(
      {
        share: undefined,
        writeText: async () => {
          throw new Error("denied");
        },
        report: r.report,
      },
      data,
    );
    expect(status).toBe("DENIED");
    expect(r.events).toEqual(["share_started", "copy_link_denied"]);
  });

  it("reports denied when neither API exists", async () => {
    const r = recorder();
    expect(
      await performShare({ share: undefined, writeText: undefined, report: r.report }, data),
    ).toBe("DENIED");
  });

  it("only ever reports allow-listed event names", async () => {
    const r = recorder();
    await performShare({ share: async () => undefined, report: r.report }, data);
    for (const e of r.events) {
      expect([
        "share_started",
        "share_completed",
        "share_cancelled",
        "copy_link_success",
        "copy_link_denied",
      ]).toContain(e);
    }
  });
});
