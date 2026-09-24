import { ViewTransition } from "react";
import type { ReactNode } from "react";
import styles from "./ResultThread.module.css";

/**
 * The Atlas Thread under the surname (visual system §8, §24):
 *
 *   pending  ●──────────○   a lookup is really in flight
 *   found    ●─────│────●   a source record joined the line, with its date
 *   missing  ●──────────◌   nothing to connect — no data, which is not zero
 *
 * The end node is thread grammar (a record, or a possibility), never a
 * confidence mark: confidence is always symbol + word (§11), and no
 * confidence has been assessed for anything shown here.
 *
 * It carries the `atlas-thread` view-transition name, so the landing's
 * thread travels into it and the pending thread becomes the found one.
 */

export type ThreadState = "pending" | "found" | "missing";

interface ResultThreadProps {
  readonly state: ThreadState;
  readonly start?: ReactNode;
  readonly tick?: ReactNode;
  readonly end?: ReactNode;
}

export function ResultThread({ state, start, tick, end }: ResultThreadProps) {
  return (
    <ViewTransition name="atlas-thread">
      <div className={styles.thread} data-thread-state={state}>
        <div className={styles.track} aria-hidden="true">
          <span className={styles.start} />
          <span className={styles.line} />
          {state === "found" ? <span className={styles.tick} /> : null}
          <span className={styles.end} />
        </div>
        <div className={styles.labels}>
          <span className={styles.labelStart}>{start}</span>
          {tick ? <span className={styles.labelTick}>{tick}</span> : null}
          <span className={styles.labelEnd}>{end}</span>
        </div>
      </div>
    </ViewTransition>
  );
}
