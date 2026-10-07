/**
 * The project's contact address (TASK-047; since 2026-10-07 the domain's own
 * address, TASK-165, given by the project owner). Stored here once; the
 * contact form delivers to it, and the footers, the contact pages, the legal
 * pages and `/.well-known/security.txt` read it from this constant. Its own
 * module so `legal-text.ts` and `site-footer.tsx` can both import it without
 * importing each other.
 */
export const CONTACT_EMAIL = "kontakt@name-atlas.pl";

/** The longest message the contact form takes, in characters (form and route alike). */
export const CONTACT_MESSAGE_MAX = 5_000;
