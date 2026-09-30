#!/usr/bin/env tsx
/**
 * Puts the four registered PESEL resources on disk, byte-exact.
 *
 *   pnpm fetch:pesel [--dir data]
 *   pnpm fetch:pesel --series [--dir data]
 *
 * `--series` fetches instead every edition of the two national series
 * (ADR-0019, TASK-044): the male and the female list from 2020-01-22 to
 * 2026-01-20, which the list-facts generator reads. A refused resource
 * (`PESEL_REFUSED_RESOURCES`) is not an edition and is never fetched.
 *
 * For each resource in the registry: if `<dir>/<name>.csv` already exists and
 * matches the pinned size and SHA-256, it is left alone; otherwise it is
 * downloaded from `official_source_url` and kept only if it matches. A file
 * that does not match is never written under the final name, so the importer
 * cannot be pointed at it by accident.
 *
 * This is the only step that touches the network. The importers still read
 * bytes already on disk and download nothing (TASK-004 §8).
 *
 * Exits non-zero if any resource is missing or does not match.
 */
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { localFileName, verifyResourceBytes } from "../src/acquire.js";
import {
  PESEL_EDITIONS,
  PESEL_NATIONAL_RESOURCES_2026,
  PESEL_NATIONAL_SERIES,
  PESEL_REGIONAL_RESOURCES_2026,
} from "../src/registry.js";
import type { PeselResourceDescriptor } from "../src/registry.js";

function dirArg(argv: readonly string[]): string {
  const i = argv.indexOf("--dir");
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1]! : "data";
}

async function readIfPresent(file: string): Promise<Uint8Array | undefined> {
  try {
    return new Uint8Array(await readFile(file));
  } catch (cause: unknown) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw cause;
  }
}

async function ensure(resource: PeselResourceDescriptor, dir: string): Promise<boolean> {
  const file = path.join(dir, localFileName(resource));
  const label = `${resource.role} (${resource.resource_id})`;

  const existing = await readIfPresent(file);
  if (existing && verifyResourceBytes(resource, existing).kind === "MATCH") {
    console.log(`[fetch] ${label}: already present and verified — ${file}`);
    return true;
  }
  if (existing) {
    console.error(
      `[fetch] ${label}: ${file} exists but is not the official file; leaving it and downloading`,
    );
  }

  console.log(`[fetch] ${label}: downloading ${resource.official_source_url}`);
  let bytes: Uint8Array;
  try {
    const response = await fetch(resource.official_source_url);
    if (!response.ok) {
      console.error(`[fetch] ${label}: HTTP ${response.status} ${response.statusText}`);
      return false;
    }
    bytes = new Uint8Array(await response.arrayBuffer());
  } catch (cause: unknown) {
    console.error(
      `[fetch] ${label}: download failed — ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    return false;
  }

  const verdict = verifyResourceBytes(resource, bytes);
  if (verdict.kind !== "MATCH") {
    console.error(
      `[fetch] ${label}: ${verdict.kind} — expected ${verdict.expected}, got ${verdict.actual}. ` +
        "The publisher may have replaced the file; it is a different resource version and " +
        "was not saved.",
    );
    return false;
  }
  const partial = `${file}.partial`;
  await writeFile(partial, bytes);
  await rm(file, { force: true });
  await rename(partial, file);
  console.log(`[fetch] ${label}: saved and verified — ${file}`);
  return true;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const dir = dirArg(argv);
  // --editions: every registered edition that is not current (TASK-045),
  // for the VM's editions step; --series: the two national series, for the
  // list-facts generator; neither: the four current resources, for the build.
  const resources = argv.includes("--editions")
    ? [...PESEL_EDITIONS]
    : argv.includes("--series")
      ? [...PESEL_NATIONAL_SERIES.national_male, ...PESEL_NATIONAL_SERIES.national_female]
      : [...PESEL_NATIONAL_RESOURCES_2026, ...PESEL_REGIONAL_RESOURCES_2026];
  await mkdir(dir, { recursive: true });
  let ok = true;
  for (const resource of resources) {
    ok = (await ensure(resource, dir)) && ok;
  }
  if (!ok) process.exit(1);
}

await main();
