/**
 * Where a step of the journey leads (TASK-053): the next chapter's anchor and
 * the question it answers, so each screen of the surname page ends on the
 * question the next one takes up. Presentation only; the anchors are the
 * registry's (`sections.ts`).
 */
export interface Step {
  readonly href: string;
  readonly label: string;
}

/** The link at the foot of a step to the next one. Nothing when there is none. */
export function NextStep({ next }: { next: Step | null }) {
  if (next === null) return null;
  return (
    <p className="chapter-next">
      {/* The chevron is drawn by the stylesheet, so the result view's markup
          stays free of hidden elements (`result-view.test.ts`). */}
      <a href={next.href}>{next.label}</a>
    </p>
  );
}
