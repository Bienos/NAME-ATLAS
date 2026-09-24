import styles from "./Findings.module.css";

/**
 * `NoEvidenceState` for the chapters the atlas cannot support yet
 * (PRODUCT.md §4 "honest limitations where data does not exist";
 * docs/canonical/16 §23: unavailable with a safe reason, never an empty fake
 * card). The same for every surname today, and each reason is a fact about
 * the atlas, not about the name.
 */

const CHAPTERS: readonly { readonly title: string; readonly reason: string }[] = [
  {
    title: "Where it lives today",
    reason:
      "No current regional dataset is in the atlas yet, and we won’t spread a national figure across regions to fake one.",
  },
  {
    title: "How rare it is",
    reason:
      "Rarity needs a verified count of people to compare against. We don’t have one yet, so we don’t estimate.",
  },
  {
    title: "Meaning and origin",
    reason: "Not researched yet. We’d rather leave this blank than guess.",
  },
  {
    title: "History",
    reason: "No historical records are connected to the atlas yet.",
  },
];

export function Uncharted() {
  return (
    <section className={styles.uncharted} aria-labelledby="uncharted-title">
      <div className={styles.divider} aria-hidden="true">
        <span />
      </div>
      <h2 id="uncharted-title" className={styles.unchartedTitle}>
        Not yet charted
      </h2>
      <p className={styles.unchartedIntro}>
        We only show what a source can support. For now, these parts of the atlas stay blank for
        every surname.
      </p>
      <ul className={styles.chapters}>
        {CHAPTERS.map((chapter) => (
          <li key={chapter.title} className={styles.chapter}>
            <span className={styles.noDataMark} aria-hidden="true" />
            <div>
              <h3 className={styles.chapterTitle}>{chapter.title}</h3>
              <p className={styles.chapterReason}>{chapter.reason}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
