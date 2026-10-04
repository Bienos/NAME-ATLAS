import { checkEmail, emailKey, hashToken, newToken } from "@name-atlas/accounts";
import type { Accounts, Mailer } from "@name-atlas/accounts";
import { checkPerson, treatedAsLiving } from "@name-atlas/family";
import type { Family, ParentRole, PersonInput } from "@name-atlas/family";
import { accountPath } from "./account-paths.js";
import { isSameSiteRequest } from "./account-routes.js";
import type { AccountLog } from "./account-routes.js";
import type { Lang } from "./messages.js";
import { cookieValue, sessionCookieName } from "./session-cookie.js";
import {
  cardFromDraft,
  draftFrom,
  draftQuery,
  HIDE_FIELD,
  INVITATION_TOKEN,
  invitationAnswer,
  isId,
  isSlotRole,
  isToken,
  isTreeAction,
  personFromDraft,
  treePath,
} from "./tree-paths.js";
import type { PersonDraft, SlotRole, TreeAction, TreeTarget } from "./tree-paths.js";
import { invitationMail } from "./tree-mail.js";
import { problemWord } from "./tree-text.js";

/**
 * The tree's POST routes (TASK-076, ADR-0029), as functions over an injected
 * service and clock, so every one is tested without a server or a database.
 *
 * As the account's routes (`account-routes.ts`): same site only, every answer
 * a 303 to a page with a status word, nothing a reader typed in a redirect or
 * a log line. What is different:
 *
 * - **A session first.** Every action needs a signed-in reader; without one
 *   the answer is the sign-in page. The session's user id is the only thing
 *   passed to the service, which sets it on the transaction and lets the
 *   row-level policies decide (ADR-0029 §2.3).
 * - **The draft travels in the query.** A person the reader is typing goes
 *   back to the form, or on to the consent step, as the page's own query, so
 *   nothing is stored before the last POST (AC-6). A name in a query is the
 *   reader's own typing on their own address; it is never in a redirect to
 *   another page, never logged.
 * - **The living-people clause.** A person marked living, or with no year of
 *   death, is saved only for an account whose terms version is the clause's
 *   or later; otherwise the answer is the consent page with the draft, and
 *   the POST that accepts (`accept-living-terms`) records the version and
 *   then saves the person (AC-4; ADR-0029 §2.4.12).
 * - **Invitations and claims (TASK-094, ADR-0029 §2.6).** `invite` makes the
 *   token here, hands the service its hash and the address's hash, and mails
 *   the token; the address itself goes into the mail and nowhere else, and a
 *   mail that cannot be sent takes its invitation back. `answer-invitation`
 *   spends the token; `update-card` and `leave-tree` are the claimant's.
 */

export interface TreeRouteDeps {
  readonly family: Pick<
    Family,
    | "createTree"
    | "getTree"
    | "deleteTree"
    | "addPerson"
    | "updatePerson"
    | "deletePerson"
    | "setParent"
    | "removeParent"
    | "setRoot"
    | "invite"
    | "withdrawInvitation"
    | "answerInvitation"
    | "updateCard"
    | "leaveTree"
  >;
  readonly accounts: Pick<Accounts, "sessionFromToken" | "acceptTerms">;
  readonly secure: boolean;
  readonly livingTermsVersion: string;
  /** Sends the invitation; null where no mail is configured, and then no invitation is made. */
  readonly mailer: Mailer | null;
  /** `SITE_ORIGIN`, for the link in the mail. */
  readonly origin: string;
  readonly log: AccountLog;
}

/** A person's form: a few names, two years, two notes. */
const MAX_BODY_BYTES = 16_384;
const FIELD_MAX = 2_048;

const NO_STORE = { "cache-control": "no-store" } as const;

async function readForm(request: Request): Promise<FormData | null> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) return null;
  const type = request.headers.get("content-type") ?? "";
  if (!/^(application\/x-www-form-urlencoded|multipart\/form-data)/iu.test(type)) return null;
  try {
    return await request.formData();
  } catch {
    return null;
  }
}

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" && value.length <= FIELD_MAX ? value : "";
}

function fieldOrNull(form: FormData, name: string): string | null {
  return form.has(name) ? field(form, name) : null;
}

function languageOf(form: FormData): Lang {
  return field(form, "lang") === "en" ? "en" : "pl";
}

function see(path: string): Response {
  return new Response(null, { status: 303, headers: { location: path, ...NO_STORE } });
}

/** Whether a person, as checked, needs the living-people clause accepted first. */
export function needsLivingConsent(
  person: PersonInput,
  termsVersion: string,
  livingTermsVersion: string,
): boolean {
  const checked = checkPerson(person);
  if (!checked.ok) return false;
  return treatedAsLiving(checked.fields.living_status) && termsVersion < livingTermsVersion;
}

interface Session {
  readonly userId: string;
  readonly termsVersion: string;
  /** The account's address: what the invitation names as the inviter (§2.6.20). */
  readonly email: string;
}

/** Where a person is being added or changed: a new person under a tree, or an existing one. */
type Subject =
  | {
      readonly kind: "add";
      readonly treeId: string;
      readonly childId: string | null;
      readonly role: SlotRole | null;
    }
  | { readonly kind: "update"; readonly treeId: string; readonly personId: string };

function subjectOf(form: FormData): Subject | null {
  const treeId = field(form, "tree");
  if (!isId(treeId)) return null;
  const personId = field(form, "person");
  if (personId !== "") return isId(personId) ? { kind: "update", treeId, personId } : null;
  const childId = field(form, "child");
  const role = field(form, "role");
  if (childId === "") return { kind: "add", treeId, childId: null, role: null };
  if (!isId(childId) || !isSlotRole(role)) return null;
  return { kind: "add", treeId, childId, role };
}

/** The query that carries a subject and a draft to a form or to the consent step. */
function subjectQuery(subject: Subject, draft: PersonDraft): Record<string, string> {
  const query: Record<string, string> = { ...draftQuery(draft) };
  if (subject.kind === "update") {
    query["person"] = subject.personId;
  } else if (subject.childId !== null && subject.role !== null) {
    query["child"] = subject.childId;
    query["role"] = subject.role;
  }
  return query;
}

/** The form page of a subject, with the draft kept and a status word. */
function backToForm(lang: Lang, subject: Subject, draft: PersonDraft, status: string): Response {
  const target: TreeTarget =
    subject.kind === "update"
      ? { page: "person", treeId: subject.treeId, personId: subject.personId }
      : { page: "add", treeId: subject.treeId };
  const query = subject.kind === "update" ? { ...draftQuery(draft) } : subjectQuery(subject, draft);
  return see(treePath(lang, target, { ...query, status }));
}

function treesPage(lang: Lang, status: string): Response {
  return see(treePath(lang, { page: "trees" }, { status }));
}

/**
 * Saves the subject's person. Shared by `add-person`, `update-person` and the
 * consent step's POST, which is one of the two with the clause just accepted.
 */
async function savePerson(
  lang: Lang,
  subject: Subject,
  draft: PersonDraft,
  session: Session,
  deps: TreeRouteDeps,
): Promise<Response> {
  const { family } = deps;
  const person = personFromDraft(draft);
  if (subject.kind === "update") {
    const result = await family.updatePerson({
      userId: session.userId,
      personId: subject.personId,
      person,
    });
    if (result.kind === "INVALID") {
      return backToForm(lang, subject, draft, problemWord(result.problems[0] ?? "ERROR"));
    }
    if (result.kind === "NOT_FOUND") return treesPage(lang, "not-found");
    if (result.kind === "FORBIDDEN") return backToForm(lang, subject, draft, "forbidden");
    if (result.kind === "CLAIMED") return backToForm(lang, subject, draft, "claimed-row");
    return see(
      treePath(
        lang,
        { page: "person", treeId: subject.treeId, personId: subject.personId },
        { status: "saved" },
      ),
    );
  }

  const result = await family.addPerson({ userId: session.userId, treeId: subject.treeId, person });
  if (result.kind === "INVALID") {
    return backToForm(lang, subject, draft, problemWord(result.problems[0] ?? "ERROR"));
  }
  if (result.kind === "NOT_FOUND") return treesPage(lang, "not-found");
  if (result.kind === "FORBIDDEN") return treesPage(lang, "forbidden");
  // A new row is nobody's claim yet; the variant exists for `updatePerson`.
  if (result.kind === "CLAIMED") return treesPage(lang, "forbidden");

  let status = "added";
  if (subject.childId !== null && subject.role !== null) {
    const linked = await family.setParent({
      userId: session.userId,
      childId: subject.childId,
      parentId: result.personId,
      role: subject.role,
    });
    if (linked.kind !== "OK") status = "unlinked";
  } else {
    // The first person is where the pedigree starts, unless a root is already set.
    const tree = await family.getTree({ userId: session.userId, treeId: subject.treeId });
    if (tree.kind === "OK" && tree.tree.tree.root_person_id === null) {
      await family.setRoot({
        userId: session.userId,
        treeId: subject.treeId,
        personId: result.personId,
      });
    }
  }
  return see(
    treePath(lang, { page: "tree", treeId: subject.treeId }, { status, person: result.personId }),
  );
}

async function run(
  action: TreeAction,
  form: FormData,
  session: Session,
  deps: TreeRouteDeps,
): Promise<Response> {
  const lang = languageOf(form);
  const { family } = deps;
  const userId = session.userId;

  switch (action) {
    case "create-tree": {
      const result = await family.createTree({ userId, title: field(form, "title") });
      if (result.kind === "INVALID") return treesPage(lang, "title");
      deps.log.info("tree_created", { userId, treeId: result.treeId });
      return see(treePath(lang, { page: "add", treeId: result.treeId }));
    }

    case "delete-tree": {
      const treeId = field(form, "tree");
      if (!isId(treeId)) return treesPage(lang, "not-found");
      if (field(form, "confirm") === "") {
        return see(treePath(lang, { page: "tree", treeId }, { status: "confirm" }));
      }
      const result = await family.deleteTree({ userId, treeId });
      if (result.kind === "NOT_FOUND") return treesPage(lang, "not-found");
      if (result.kind === "FORBIDDEN")
        return see(treePath(lang, { page: "tree", treeId }, { status: "forbidden" }));
      deps.log.info("tree_deleted", { userId, treeId });
      return treesPage(lang, "tree-deleted");
    }

    case "add-person":
    case "update-person":
    case "accept-living-terms": {
      const subject = subjectOf(form);
      if (subject === null) return treesPage(lang, "not-found");
      if (action === "add-person" && subject.kind !== "add") return treesPage(lang, "not-found");
      if (action === "update-person" && subject.kind !== "update")
        return treesPage(lang, "not-found");
      const draft = draftFrom((name) => fieldOrNull(form, name));
      const person = personFromDraft(draft);
      const checked = checkPerson(person);
      if (!checked.ok) {
        return backToForm(lang, subject, draft, problemWord(checked.problems[0] ?? "ERROR"));
      }
      let terms = session.termsVersion;
      if (action === "accept-living-terms") {
        if (field(form, "terms") === "") {
          return see(
            treePath(
              lang,
              { page: "consent" },
              { ...subjectQuery(subject, draft), tree: subject.treeId, status: "terms" },
            ),
          );
        }
        await deps.accounts.acceptTerms({ userId, termsVersion: deps.livingTermsVersion });
        deps.log.info("tree_living_terms_accepted", { userId, version: deps.livingTermsVersion });
        terms = deps.livingTermsVersion;
      }
      if (needsLivingConsent(person, terms, deps.livingTermsVersion)) {
        return see(
          treePath(
            lang,
            { page: "consent" },
            { ...subjectQuery(subject, draft), tree: subject.treeId },
          ),
        );
      }
      return savePerson(lang, subject, draft, session, deps);
    }

    case "delete-person": {
      const treeId = field(form, "tree");
      const personId = field(form, "person");
      if (!isId(treeId) || !isId(personId)) return treesPage(lang, "not-found");
      if (field(form, "confirm") === "") {
        return see(treePath(lang, { page: "person", treeId, personId }, { status: "confirm" }));
      }
      const result = await family.deletePerson({ userId, personId });
      if (result.kind === "NOT_FOUND")
        return see(treePath(lang, { page: "tree", treeId }, { status: "not-found" }));
      if (result.kind === "FORBIDDEN")
        return see(treePath(lang, { page: "person", treeId, personId }, { status: "forbidden" }));
      return see(treePath(lang, { page: "tree", treeId }, { status: "person-deleted" }));
    }

    case "set-parent":
    case "remove-parent": {
      const treeId = field(form, "tree");
      const childId = field(form, "child");
      const parentId = field(form, "parent");
      if (!isId(treeId) || !isId(childId) || !isId(parentId)) return treesPage(lang, "not-found");
      const page: TreeTarget = { page: "person", treeId, personId: childId };
      if (action === "remove-parent") {
        const result = await family.removeParent({ userId, childId, parentId });
        if (result.kind === "NOT_FOUND") return see(treePath(lang, page, { status: "not-found" }));
        if (result.kind === "FORBIDDEN") return see(treePath(lang, page, { status: "forbidden" }));
        return see(treePath(lang, page, { status: "parent-removed" }));
      }
      const roleField = field(form, "role");
      const role: ParentRole =
        roleField === "MOTHER" || roleField === "FATHER" ? roleField : "PARENT";
      const result = await family.setParent({ userId, childId, parentId, role });
      if (result.kind === "INVALID")
        return see(treePath(lang, page, { status: problemWord(result.problem) }));
      if (result.kind === "NOT_FOUND") return see(treePath(lang, page, { status: "not-found" }));
      if (result.kind === "FORBIDDEN") return see(treePath(lang, page, { status: "forbidden" }));
      return see(treePath(lang, page, { status: "linked" }));
    }

    case "set-root": {
      const treeId = field(form, "tree");
      const personId = field(form, "person");
      if (!isId(treeId) || !isId(personId)) return treesPage(lang, "not-found");
      const result = await family.setRoot({ userId, treeId, personId });
      const page: TreeTarget = { page: "tree", treeId };
      if (result.kind === "INVALID") return see(treePath(lang, page, { status: "not-found" }));
      if (result.kind === "NOT_FOUND") return treesPage(lang, "not-found");
      if (result.kind === "FORBIDDEN") return see(treePath(lang, page, { status: "forbidden" }));
      return see(treePath(lang, page, { status: "root" }));
    }

    case "invite": {
      const treeId = field(form, "tree");
      const personId = field(form, "person");
      if (!isId(treeId) || !isId(personId)) return treesPage(lang, "not-found");
      const page: TreeTarget = { page: "person", treeId, personId };
      const back = (status: string): Response => see(treePath(lang, page, { status }));
      if (field(form, "consent") === "") return back("invite-consent");
      const email = checkEmail(field(form, "email"));
      if (!email.ok) return back("invite-email");
      if (deps.mailer === null) return back("invite-mail");
      const token = newToken();
      const result = await family.invite({
        userId,
        treeId,
        personId,
        tokenHash: hashToken(token).toString("hex"),
        addressHash: emailKey(email.normalised).toString("hex"),
      });
      if (result.kind === "INVALID") return back(problemWord(result.problem));
      if (result.kind === "NOT_FOUND") return back("not-found");
      if (result.kind === "FORBIDDEN") return back("forbidden");
      const link = `${deps.origin}${treePath(lang, { page: "invitation" }, { [INVITATION_TOKEN]: token })}`;
      try {
        await deps.mailer.send(invitationMail(email.email, lang, link, session.email));
      } catch (error) {
        deps.log.warn("tree_invitation_mail_failed", {
          error: error instanceof Error ? error.name : "unknown",
        });
        await family.withdrawInvitation({ userId, invitationId: result.invitationId });
        return back("invite-mail");
      }
      deps.log.info("tree_invited", { userId, treeId });
      return back("invited");
    }

    case "answer-invitation": {
      const token = field(form, INVITATION_TOKEN);
      if (!isToken(token))
        return see(treePath(lang, { page: "invitation" }, { status: "not-found" }));
      const back = (status: string): Response =>
        see(treePath(lang, { page: "invitation" }, { [INVITATION_TOKEN]: token, status }));
      const answer = invitationAnswer(field(form, "answer"));
      if (answer === null) return back("answer");
      const result = await family.answerInvitation({
        userId,
        tokenHash: hashToken(token).toString("hex"),
        answer,
      });
      if (result.kind === "EXPIRED") return back("expired");
      if (result.kind === "ANSWERED") return back("answered");
      if (result.kind === "NOT_FOUND") return back("not-found");
      if (result.kind === "INVALID") return back(problemWord(result.problem));
      deps.log.info("tree_invitation_answered", { userId, treeId: result.treeId, answer });
      if (answer === "ME") {
        return see(
          treePath(lang, { page: "card", personId: result.personId }, { status: "claimed" }),
        );
      }
      return see(
        treePath(
          lang,
          { page: "cards" },
          { status: answer === "NOT_ME" ? "not-me" : "no-contact" },
        ),
      );
    }

    case "update-card": {
      const personId = field(form, "person");
      if (!isId(personId)) return see(treePath(lang, { page: "cards" }, { status: "not-found" }));
      const page: TreeTarget = { page: "card", personId };
      const draft = draftFrom((name) => fieldOrNull(form, name));
      const hidden = form.getAll(HIDE_FIELD).filter((v): v is string => typeof v === "string");
      const result = await family.updateCard({
        userId,
        personId,
        card: cardFromDraft(draft, hidden),
      });
      if (result.kind === "INVALID")
        return see(
          treePath(lang, page, {
            ...draftQuery(draft),
            status: problemWord(result.problems[0] ?? "ERROR"),
          }),
        );
      if (result.kind === "NOT_FOUND")
        return see(treePath(lang, { page: "cards" }, { status: "not-found" }));
      if (result.kind === "FORBIDDEN") return see(treePath(lang, page, { status: "forbidden" }));
      return see(treePath(lang, page, { status: "saved" }));
    }

    case "leave-tree": {
      const personId = field(form, "person");
      if (!isId(personId)) return see(treePath(lang, { page: "cards" }, { status: "not-found" }));
      if (field(form, "confirm") === "") {
        return see(treePath(lang, { page: "card", personId }, { status: "confirm" }));
      }
      const result = await family.leaveTree({ userId, personId });
      if (result.kind !== "OK")
        return see(treePath(lang, { page: "cards" }, { status: "not-found" }));
      deps.log.info("tree_left", { userId });
      return see(treePath(lang, { page: "cards" }, { status: "left" }));
    }
  }
}

/**
 * One POST to `/api/tree/<action>`. Never throws: a service or database
 * failure is the status word `error` on the trees page, and the log line
 * carries the error's *name* and nothing it says.
 */
export async function handleTreePost(
  action: string,
  request: Request,
  deps: TreeRouteDeps,
): Promise<Response> {
  if (!isTreeAction(action)) return new Response("Not found", { status: 404, headers: NO_STORE });
  if (!isSameSiteRequest(request)) {
    return new Response("Forbidden", { status: 403, headers: NO_STORE });
  }
  const form = await readForm(request);
  if (form === null) return new Response("Bad request", { status: 400, headers: NO_STORE });
  const lang = languageOf(form);

  try {
    const token = cookieValue(request.headers.get("cookie"), sessionCookieName(deps.secure));
    const session = token === null ? null : await deps.accounts.sessionFromToken(token);
    if (session === null) {
      return see(accountPath(lang, "sign-in", { next: treePath(lang, { page: "trees" }) }));
    }
    return await run(
      action,
      form,
      { userId: session.userId, termsVersion: session.termsVersion, email: session.email },
      deps,
    );
  } catch (error) {
    deps.log.warn("tree_route_failed", {
      action,
      error: error instanceof Error ? error.name : "unknown",
    });
    return treesPage(lang, "error");
  }
}
