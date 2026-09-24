import { ViewTransition } from "react";
import { surnameSizingStyle } from "../lib/surname-sizing";
import styles from "./NameDisplay.module.css";

/**
 * `NameDisplay` — the user's surname as the hero (visual system §2
 * principle 08, §6.3): editorial serif, sized by grapheme count, never
 * truncated, shown exactly as typed (NFC only). The canonical register form
 * is shown separately, beside the evidence — the user's spelling is never
 * silently replaced.
 *
 * It is the "after" of the landing's shared-element transition.
 */
export function NameDisplay({ name }: { name: string }) {
  return (
    <ViewTransition name="surname-hero">
      <h1 className={styles.name} style={surnameSizingStyle(name)}>
        {name}
      </h1>
    </ViewTransition>
  );
}
