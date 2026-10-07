/**
 * The Evolved Contour N (`public/brand/logo/name-atlas-mark.svg`, ADR-0046),
 * drawn inline beside the wordmark. The contours take the text colour and the
 * Atlas Point is Atlas Blue. Decorative: the link's name is the wordmark's text.
 */
export function BrandMark({ className = "brand-mark" }: { className?: string }) {
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 3,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;
  return (
    <svg className={className} viewBox="10 8 80 80" aria-hidden="true" focusable="false">
      <path
        d="M16 82 C16 58 17 34 23 14 C35 20 40 39 49 54 C57 68 64 80 73 82 C78 63 79 39 82 14"
        {...stroke}
      />
      <path
        d="M22 82 C22 60 23 39 28 21 C38 27 43 43 50 56 C57 68 63 76 70 78 C74 61 75 42 77 21"
        {...stroke}
      />
      <path
        d="M28 78 C28 60 29 43 33 28 C41 33 45 46 51 57 C56 67 61 73 67 74 C70 60 71 45 73 28"
        {...stroke}
      />
      <path
        d="M34 73 C34 59 35 47 38 35 C44 39 47 49 52 58 C56 65 60 69 64 70 C66 59 67 48 68 35"
        {...stroke}
      />
      <path
        d="M40 67 C40 57 41 50 43 43 C47 46 49 52 53 58 C56 63 58 66 61 66 C62 58 63 51 63 43"
        {...stroke}
      />
      <circle className="brand-mark-point" cx="69" cy="57" r="5" />
    </svg>
  );
}
