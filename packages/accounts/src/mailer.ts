import type { OutgoingMail } from "./mail-text.js";

/**
 * Sending a message (ADR-0027 §2.8). The service never sends: it returns the
 * message, and the route sends it after answering, so how long the provider
 * takes cannot tell a caller whether an address has an account.
 *
 * The real sender is Resend's HTTP API through `fetch`, so there is no
 * dependency. Its errors carry the status and nothing else: the provider's body
 * and the key never reach a log.
 */

export class MailError extends Error {
  readonly status: number | null;
  constructor(message: string, status: number | null) {
    super(message);
    this.name = "MailError";
    this.status = status;
  }
}

export interface Mailer {
  send(mail: OutgoingMail): Promise<void>;
}

export interface ResendConfig {
  readonly apiKey: string;
  /** "Name Atlas <konto@your-domain>": the address must be on a domain verified with Resend. */
  readonly from: string;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function createResendMailer(
  config: ResendConfig,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 8_000,
): Mailer {
  return {
    async send(mail) {
      let response: Response;
      try {
        response = await fetchImpl(RESEND_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: config.from,
            to: [mail.to],
            subject: mail.subject,
            text: mail.text,
            html: mail.html,
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch {
        // Not the cause: a network error's text can carry the URL's context.
        throw new MailError("the mail provider could not be reached", null);
      }
      if (!response.ok) {
        throw new MailError(
          `the mail provider answered ${String(response.status)}`,
          response.status,
        );
      }
    },
  };
}

/** For tests and local development: collects what would have been sent. */
export function createMemoryMailer(): Mailer & { readonly sent: OutgoingMail[] } {
  const sent: OutgoingMail[] = [];
  return {
    sent,
    send(mail) {
      sent.push(mail);
      return Promise.resolve();
    },
  };
}
