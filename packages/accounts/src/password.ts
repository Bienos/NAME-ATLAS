import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Password hashing (ADR-0027 §2.4): scrypt from Node's own `crypto`, so the
 * package adds no native module.
 *
 * A stored hash is `scrypt$N=…,r=…,p=…$salt$key`, base64url, so the cost can rise
 * later without a migration: `needsRehash` says when a hash was made with weaker
 * parameters than the current ones, and a successful sign-in re-hashes it.
 *
 * The password is NFKC-normalised first (NIST SP 800-63B), so the same password
 * typed on two keyboards is the same password.
 */

export interface ScryptParams {
  readonly N: number;
  readonly r: number;
  readonly p: number;
}

/** 64 MiB of memory (128 · N · r), p = 2: one of OWASP's listed scrypt settings. */
export const PASSWORD_PARAMS: ScryptParams = { N: 65_536, r: 8, p: 2 };

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

const SALT_BYTES = 16;
const KEY_BYTES = 64;
/** What a stored row may claim before it is refused: a tampered row must not be able to ask for a gigabyte. */
const N_RANGE = { min: 1_024, max: 1_048_576 } as const;
const R_MAX = 16;
const P_MAX = 16;

export function normalisePassword(password: string): string {
  return password.normalize("NFKC");
}

function derive(password: string, salt: Buffer, params: ScryptParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      normalisePassword(password),
      salt,
      KEY_BYTES,
      // `maxmem` must exceed 128 · N · r; double it and add a margin.
      { N: params.N, r: params.r, p: params.p, maxmem: 128 * params.N * params.r * 2 + 1_048_576 },
      (error, key) => {
        if (error) reject(error);
        else resolve(key);
      },
    );
  });
}

function isPowerOfTwo(n: number): boolean {
  return Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;
}

interface Parsed {
  readonly params: ScryptParams;
  readonly salt: Buffer;
  readonly key: Buffer;
}

/** The parts of a stored hash, or null when it is not one this module wrote. */
function parse(stored: string): Parsed | null {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return null;
  const match = /^N=(\d+),r=(\d+),p=(\d+)$/u.exec(parts[1] ?? "");
  if (match === null) return null;
  const N = Number(match[1]);
  const r = Number(match[2]);
  const p = Number(match[3]);
  if (!isPowerOfTwo(N) || N < N_RANGE.min || N > N_RANGE.max) return null;
  if (r < 1 || r > R_MAX || p < 1 || p > P_MAX) return null;
  const salt = Buffer.from(parts[2] ?? "", "base64url");
  const key = Buffer.from(parts[3] ?? "", "base64url");
  if (salt.length !== SALT_BYTES || key.length !== KEY_BYTES) return null;
  return { params: { N, r, p }, salt, key };
}

export async function hashPassword(
  password: string,
  params: ScryptParams = PASSWORD_PARAMS,
): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt, params);
  return `scrypt$N=${String(params.N)},r=${String(params.r)},p=${String(params.p)}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

/** Constant-time. A hash this module did not write, or a malformed one, never verifies. */
export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  const parsed = parse(stored);
  if (parsed === null) return false;
  const key = await derive(password, parsed.salt, parsed.params);
  return key.length === parsed.key.length && timingSafeEqual(key, parsed.key);
}

/** True when the hash is malformed or was made with weaker parameters than `params`. */
export function needsRehash(stored: string, params: ScryptParams = PASSWORD_PARAMS): boolean {
  const parsed = parse(stored);
  if (parsed === null) return true;
  return parsed.params.N < params.N || parsed.params.r < params.r || parsed.params.p < params.p;
}

/** What the service needs of a hasher, so a test can pass cheap parameters. */
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(stored: string, password: string): Promise<boolean>;
  needsRehash(stored: string): boolean;
}

export function createPasswordHasher(params: ScryptParams = PASSWORD_PARAMS): PasswordHasher {
  return {
    hash: (password) => hashPassword(password, params),
    verify: verifyPassword,
    needsRehash: (stored) => needsRehash(stored, params),
  };
}
