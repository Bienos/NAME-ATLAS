/**
 * The landing's lower-right composition (Visual System §39 screen 01, §8): an
 * extremely subtle Atlas Thread with three anonymous nodes, and tiny points
 * that slowly connect behind it. It is not a map and carries no data — nothing
 * here stands for a place, a count or a person, so no reader could take it for
 * a distribution.
 *
 * It reacts to the search field through CSS alone (`globals.css`): the lead
 * node becomes active while a name is typed, and the thread fills on submit.
 * No client code, and hidden from assistive technology.
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
    <svg className="atlas-field" viewBox="0 0 420 260" aria-hidden="true" focusable="false">
      <g className="atlas-links">
        {LINKS.map(([x1, y1, x2, y2], index) => (
          <line
            key={`${String(x1)}-${String(y1)}-${String(x2)}-${String(y2)}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            pathLength={1}
            style={{ animationDelay: `${String(1200 + index * 450)}ms` }}
          />
        ))}
      </g>
      <g className="atlas-points">
        {POINTS.map(([cx, cy], index) => (
          <circle
            key={`${String(cx)}-${String(cy)}`}
            cx={cx}
            cy={cy}
            r={1.75}
            style={{ animationDelay: `${String(600 + index * 90)}ms` }}
          />
        ))}
      </g>
      <path className="atlas-line" d="M120 190H400" pathLength={1} />
      <path className="atlas-fill" d="M120 190H300" pathLength={1} />
      <path className="atlas-tick" d="M220 181v18" />
      <circle className="atlas-second" cx={300} cy={190} r={4.5} />
      <circle className="atlas-possible" cx={390} cy={190} r={5} />
      <circle className="atlas-halo" cx={120} cy={190} r={11} />
      <circle className="atlas-lead" cx={120} cy={190} r={5.5} />
    </svg>
  );
}
