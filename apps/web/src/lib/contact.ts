/**
 * The project's published contact address (TASK-047), on the site's own domain
 * since 2026-10-07 at the owner's request, so that no page shows the owner's
 * private mailbox. Stored here once; the footers, the contact pages, the legal
 * pages and `/.well-known/security.txt` read it from this constant. Mail to it
 * reaches the owner only through forwarding set up on the domain. Its own
 * module so `legal-text.ts` and `site-footer.tsx` can both import it without
 * importing each other.
 */
export const CONTACT_EMAIL = "kontakt@name-atlas.pl";

/**
 * Where the contact form delivers (`contact-routes.ts`): the owner's mailbox,
 * which no page shows, so that the form does not wait on the domain's
 * forwarding.
 */
export const CONTACT_INBOX = "cihypatryk@gmail.com";

/** The longest message the contact form takes, in characters (form and route alike). */
export const CONTACT_MESSAGE_MAX = 5_000;
