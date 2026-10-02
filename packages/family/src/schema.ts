import { Kysely, PostgresDialect } from "kysely";
import type { createPool } from "@name-atlas/db";

/**
 * The tables of schema `family` (migration 0028), typed by hand, as
 * `@name-atlas/accounts` types `accounts`: `pnpm db:generate-types` reads
 * `public.*` only, and these tables are deliberately outside it (ADR-0029 §2.1).
 */

export type LivingStatus = "UNKNOWN" | "LIVING" | "DECEASED";
export type ParentRole = "MOTHER" | "FATHER" | "PARENT";
export type MemberRole = "EDITOR" | "VIEWER";
export type AuditKind =
  | "TREE_CREATED"
  | "TREE_DELETED"
  | "PERSON_CREATED"
  | "PERSON_UPDATED"
  | "PERSON_DELETED"
  | "LIVING_STATUS_CHANGED"
  | "PARENT_SET"
  | "PARENT_REMOVED"
  | "MEMBER_ADDED"
  | "MEMBER_REMOVED"
  | "SEES_LIVING_CHANGED"
  | "EXPORTED";

export interface TreesTable {
  tree_id: string;
  owner_user_id: string;
  title: string;
  root_person_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PersonsTable {
  person_id: string;
  tree_id: string;
  given_names: string;
  surname: string;
  birth_surname: string | null;
  birth_year: number | null;
  birth_year_approx: boolean;
  birth_place_code: string | null;
  birth_place_text: string | null;
  death_year: number | null;
  death_year_approx: boolean;
  death_place_code: string | null;
  death_place_text: string | null;
  living_status: LivingStatus;
  source_note: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ParentageTable {
  child_id: string;
  parent_id: string;
  role: ParentRole;
  created_at: Date;
}

export interface MembersTable {
  tree_id: string;
  user_id: string;
  role: MemberRole;
  sees_living: boolean;
  invited_by: string | null;
  accepted_at: Date;
}

export interface AuditEventsTable {
  event_id: string;
  tree_id: string;
  user_id: string | null;
  kind: AuditKind;
  person_id: string | null;
  at: Date;
}

export interface FamilyDB {
  trees: TreesTable;
  persons: PersonsTable;
  parentage: ParentageTable;
  members: MembersTable;
  audit_events: AuditEventsTable;
}

/**
 * The typed Kysely instance over the accounts pool, with every table in schema
 * `family`. The pool must be the accounts role's (`ACCOUNTS_DATABASE_URL`),
 * never the read-only one: that role has no grant here, and this one has no
 * table of the register.
 */
export function createFamilyDb(pool: ReturnType<typeof createPool>): Kysely<FamilyDB> {
  return new Kysely<FamilyDB>({ dialect: new PostgresDialect({ pool }) }).withSchema("family");
}
