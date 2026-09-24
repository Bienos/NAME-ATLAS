import { ResultThread } from "./ResultThread";
import styles from "./LookupProgress.module.css";

/**
 * `LookupProgress` (§24): shown while the lookup is really running, and only
 * after 400 ms — a quick lookup gets no loader. It names the one real stage
 * there is; it never pretends to search anything larger.
 */
export function LookupProgress() {
  return (
    <div className={styles.progress}>
      <ResultThread state="pending" />
      <p className={styles.status} role="status">
        Checking surname data&hellip;
      </p>
    </div>
  );
}
