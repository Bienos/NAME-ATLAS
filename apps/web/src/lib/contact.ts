/**
 * The project's published contact address (TASK-047), on the site's own domain
 * since 2026-10-07 at the owner's request, so that no page shows the owner's
 * private mailbox. Stored here once; the footers, the contact pages, the legal
 * pages, `/.well-known/security.txt` and the contact form's delivery read it
 * from this constant. Mail to it reaches the owner only through forwarding set
 * up on the domain. Its own module so `legal-text.ts` and `site-footer.tsx` can both import it without
 * importing each other.
 */
export const CONTACT_EMAIL = "kontakt@name-atlas.pl";

/**
 * The operator's tax identification number (NIP), given by the owner on
 * 2026-10-12 for selling (TASK-182). At the owner's request the site names no
 * person or place: the operator is "the owner of the service", identified by
 * this number (D-054 records what that leaves open for real sales).
 */
export const OPERATOR_NIP = "7441837423";

/** The longest message the contact form takes, in characters (form and route alike). */
export const CONTACT_MESSAGE_MAX = 5_000;
