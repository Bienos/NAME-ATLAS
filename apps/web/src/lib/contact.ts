/**
 * The project's contact address (TASK-047), given by the project owner on
 * 2026-09-30. Stored here once; the footers, the contact pages, the legal
 * pages and `/.well-known/security.txt` read it from this constant. Its own
 * module so `legal-text.ts` and `site-footer.tsx` can both import it without
 * importing each other.
 */
export const CONTACT_EMAIL = "cihypatryk@gmail.com";

/** The longest message the contact form takes, in characters (form and route alike). */
export const CONTACT_MESSAGE_MAX = 5_000;
