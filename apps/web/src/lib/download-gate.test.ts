import { describe, expect, it, vi } from "vitest";
import { downloadGate } from "./download-gate.js";

const TOKEN = "t".repeat(43);

function runtime(secure: boolean, session: "found" | "none" | "down") {
  const sessionFromToken = vi.fn(async (token: unknown) => {
    if (session === "down") throw new Error("connection refused");
    return session === "found" ? ({ userId: "u-1", token } as never) : null;
  });
  return { sessionFromToken, runtime: { accounts: { sessionFromToken }, secure } as never };
}

describe("who may take a share card's image (TASK-064, AC-1, AC-2)", () => {
  it("is off when accounts are off, and reads nothing", async () => {
    expect(await downloadGate(null, null)).toBe("off");
    expect(await downloadGate(null, `na_session=${TOKEN}`)).toBe("off");
  });

  it("asks to sign in when there is no cookie, without reading the database", async () => {
    const { sessionFromToken, runtime: r } = runtime(true, "found");
    expect(await downloadGate(r, null)).toBe("sign-in");
    expect(await downloadGate(r, "")).toBe("sign-in");
    expect(await downloadGate(r, "other=1; theme=dark")).toBe("sign-in");
    // The unprefixed name is another cookie on a site served over HTTPS.
    expect(await downloadGate(r, `na_session=${TOKEN}`)).toBe("sign-in");
    expect(sessionFromToken).not.toHaveBeenCalled();
  });

  it("opens for a cookie that names a live session, under the cookie's name for the site's scheme", async () => {
    const https = runtime(true, "found");
    expect(await downloadGate(https.runtime, `a=b; __Host-na_session=${TOKEN}`)).toBe("open");
    expect(https.sessionFromToken).toHaveBeenCalledWith(TOKEN);
    const http = runtime(false, "found");
    expect(await downloadGate(http.runtime, `na_session=${TOKEN}`)).toBe("open");
    expect(http.sessionFromToken).toHaveBeenCalledWith(TOKEN);
  });

  it("asks to sign in for a cookie that names no session: expired, ended or made up", async () => {
    const { runtime: r } = runtime(true, "none");
    expect(await downloadGate(r, `__Host-na_session=${TOKEN}`)).toBe("sign-in");
  });

  it("is unavailable, not a request to sign in, when the accounts database cannot answer", async () => {
    const { runtime: r } = runtime(true, "down");
    expect(await downloadGate(r, `__Host-na_session=${TOKEN}`)).toBe("unavailable");
  });
});
