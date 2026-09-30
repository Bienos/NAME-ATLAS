import styles from "./rundown-outline.module.css";

/** What the surname rundown contains, in the order PRODUCT.md §4 fixes. */
const CHAPTERS = [
  {
    title: "Your surname, as you typed it",
    body: "Matched exactly. If it could be more than one surname, we ask instead of guessing.",
  },
  {
    title: "How common it is today",
    body: "The current count from the PESEL register, with the list it comes from and its date.",
  },
  {
    title: "How rare that makes it",
    body: "Only where the arithmetic holds up. Otherwise we leave it out and say why.",
  },
  {
    title: "Meaning and origin",
    body: "Where evidence supports it. Competing explanations are shown as competing.",
  },
  {
    title: "A first look into history",
    body: "At least one real historical trace, where the archives hold one.",
  },
] as const;

export function RundownOutline() {
  return (
    <ol className={styles.list}>
      {CHAPTERS.map((chapter, i) => (
        <li key={chapter.title} className={styles.chapter}>
          <span className={styles.number} aria-hidden="true">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div>
            <h3 className={styles.title}>{chapter.title}</h3>
            <p className={styles.body}>{chapter.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
