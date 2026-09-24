import styles from "./AtlasField.module.css";

/**
 * The landing's lower-right composition (visual system §39 screen 01, §8):
 * an extremely subtle Atlas Thread with three anonymous nodes, and tiny
 * points that slowly connect behind it. It is not a map and carries no data —
 * nothing here stands for a place, a count or a person, so no reader could
 * take it for a distribution.
 *
 * It reacts to the search field through `data-search-phase` on the page (the
 * lead node becomes active while typing; the thread fills on submit), so it
 * needs no client code of its own.
 */

const POINTS: readonly (readonly [number, number])[] = [
  [46, 150],
  [104, 92],
  [170, 128],
  [214, 58],
  [270, 104],
  [330, 70],
  [392, 118],
  [150, 222],
  [304, 238],
  [376, 26],
];

const LINKS: readonly (readonly [number, number, number, number])[] = [
  [46, 150, 104, 92],
  [104, 92, 170, 128],
  [170, 128, 214, 58],
  [214, 58, 270, 104],
  [270, 104, 330, 70],
  [330, 70, 392, 118],
  [170, 128, 120, 190],
  [270, 104, 300, 190],
];

export function AtlasField() {
  return (
    <svg
      className={styles.field}
      viewBox="0 0 420 260"
      aria-hidden="true"
      focusable="false"
      data-atlas-field=""
    >
      <g className={styles.links}>
        {LINKS.map(([x1, y1, x2, y2], index) => (
          <line
            key={`${x1}-${y1}-${x2}-${y2}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            pathLength={1}
            style={{ animationDelay: `${1200 + index * 450}ms` }}
          />
        ))}
      </g>
      <g className={styles.points}>
        {POINTS.map(([cx, cy], index) => (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r={1.75}
            style={{ animationDelay: `${600 + index * 90}ms` }}
          />
        ))}
      </g>
      <g className={styles.thread}>
        <path className={styles.line} d="M120 190H400" pathLength={1} />
        <path className={styles.fill} d="M120 190H300" pathLength={1} />
        <path className={styles.tick} d="M220 181v18" />
        <circle className={styles.second} cx={300} cy={190} r={4.5} />
        <circle className={styles.possible} cx={390} cy={190} r={5} />
        <circle className={styles.halo} cx={120} cy={190} r={11} />
        <circle className={styles.lead} cx={120} cy={190} r={5.5} />
      </g>
    </svg>
  );
}
