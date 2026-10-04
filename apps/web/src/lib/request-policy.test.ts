import { describe, expect, it } from "vitest";
import {
  ACCOUNT_POLICY,
  API_POLICY,
  LONGEST_WINDOW_MS,
  PAGE_POLICY,
  PREFIX_POLICY,
  policyFor,
  TREE_POLICY,
} from "./request-policy.js";

describe("what each request is held to (TASK-029, TASK-062 AC-11)", () => {
  it("gives the account's forms a bucket of their own, tighter than the API's", () => {
    expect(policyFor("/api/account/sign-in")).toBe(ACCOUNT_POLICY);
    expect(policyFor("/api/account/delete")).toBe(ACCOUNT_POLICY);
    // Google sign-in's two routes share it (TASK-084).
    expect(policyFor("/api/account/google")).toBe(ACCOUNT_POLICY);
    expect(policyFor("/api/account/google/callback")).toBe(ACCOUNT_POLICY);
    expect(ACCOUNT_POLICY.limit).toBe(10);
    expect(ACCOUNT_POLICY.limit).toBeLessThan(API_POLICY.limit);
  });

  it("holds the tree's forms and its export to one bucket (TASK-076, TASK-098)", () => {
    expect(policyFor("/api/tree/add-person")).toBe(TREE_POLICY);
    expect(policyFor("/api/v1/trees/0199a1b2-0000-7000-8000-00000000aa01/export")).toBe(
      TREE_POLICY,
    );
    expect(policyFor("/api/v1/trees")).toBe(API_POLICY);
  });

  it("keeps the others as they were", () => {
    expect(policyFor("/api/v1/surname-prefix")).toBe(PREFIX_POLICY);
    expect(policyFor("/api/v1/surname-results")).toBe(API_POLICY);
    expect(policyFor("/api/health")).toBe(API_POLICY);
    expect(policyFor("/api/cron/accounts-purge")).toBe(API_POLICY);
    expect(policyFor("/pl/konto/zaloguj")).toBe(PAGE_POLICY);
    expect(policyFor("/pl/nazwisko/nowak")).toBe(PAGE_POLICY);
    expect(policyFor("/")).toBe(PAGE_POLICY);
  });

  it("sweeps expired windows no sooner than the longest policy's", () => {
    for (const policy of [PAGE_POLICY, API_POLICY, PREFIX_POLICY, ACCOUNT_POLICY]) {
      expect(LONGEST_WINDOW_MS).toBeGreaterThanOrEqual(policy.windowMs);
    }
  });
});
