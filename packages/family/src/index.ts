export { createFamilyDb } from "./schema.js";
export type {
  AuditKind,
  FamilyDB,
  LivingStatus,
  MemberRole,
  ParentRole,
  PersonsTable,
  TreesTable,
} from "./schema.js";
export {
  checkPerson,
  NAME_MAX,
  NOTES_MAX,
  PARENTS_MAX,
  parentCount,
  SOURCE_NOTE_MAX,
  treatedAsLiving,
  wouldCycle,
  YEAR_MAX,
  YEAR_MIN,
} from "./rules.js";
export type { PersonCheck, PersonFields, PersonInput, PersonProblem } from "./rules.js";
export { createFamily } from "./service.js";
export type {
  CreateTreeResult,
  Family,
  MemberProblem,
  MemberResult,
  ParentProblem,
  ParentResult,
  PersonWriteResult,
  PlainResult,
  TreePersonRead,
  TreeRead,
  TreeResult,
  TreeRole,
  TreeSummary,
} from "./service.js";
