import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import AdminHomePage from "./page.js";

describe("AdminHomePage", () => {
  it("renders a valid React element", () => {
    expect(isValidElement(AdminHomePage())).toBe(true);
  });
});
