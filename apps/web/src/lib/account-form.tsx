import type { ReactNode } from "react";
import { actionPath } from "./account-paths.js";
import type { AccountAction } from "./account-paths.js";
import type { Lang } from "./messages.js";

/**
 * The account's form parts (TASK-062), shared by the sign-in pages and the
 * dashboard (TASK-153). Plain HTML forms that post to `/api/account/<action>`
 * and need no script.
 */

export function Field({
  name,
  label,
  type,
  autoComplete,
  hint,
  minLength,
  maxLength,
}: {
  readonly name: string;
  readonly label: string;
  readonly type: "email" | "password";
  readonly autoComplete: string;
  readonly hint?: string;
  readonly minLength?: number;
  readonly maxLength: number;
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        minLength={minLength}
        maxLength={maxLength}
        autoCapitalize="none"
        spellCheck={false}
      />
      {hint === undefined ? null : <small>{hint}</small>}
    </label>
  );
}

export function Form({
  action,
  lang,
  children,
  label,
}: {
  readonly action: AccountAction;
  readonly lang: Lang;
  readonly children: ReactNode;
  readonly label: string;
}) {
  return (
    <form
      className="offer-form account-form"
      method="post"
      action={actionPath(action)}
      aria-label={label}
    >
      <input type="hidden" name="lang" value={lang} />
      {children}
    </form>
  );
}

/** The form's one action. The arrow is drawn, not read. */
export function Send({
  children,
  danger = false,
}: {
  readonly children: ReactNode;
  readonly danger?: boolean;
}) {
  return (
    <button type="submit" className={danger ? "offer-send account-danger" : "offer-send"}>
      <span>{children}</span>
      {danger ? null : (
        <svg
          className="account-send-arrow"
          viewBox="0 0 20 20"
          width="18"
          height="18"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M4 10h11M11 5.5 15.5 10 11 14.5" />
        </svg>
      )}
    </button>
  );
}
