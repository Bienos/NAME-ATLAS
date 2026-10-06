import type { ReactNode } from "react";

function seeded(seed: number) {
  let state = Math.max(1, Math.abs(Math.floor(seed)) % 2147483647);
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

type Point = { readonly x: number; readonly y: number };
type ContourVariant = "amber" | "ivory" | "blue";
type ContourOrientation = "rising" | "falling";
type HeroVariant = "homepage" | "surname" | "editorial" | "share";

export function EvolvedContourMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`evolved-contour-mark ${className}`}
      viewBox="0 0 96 96"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M16 82 C16 58 17 34 23 14 C35 20 40 39 49 54 C57 68 64 80 73 82 C78 63 79 39 82 14" />
      <path d="M22 82 C22 60 23 39 28 21 C38 27 43 43 50 56 C57 68 63 76 70 78 C74 61 75 42 77 21" />
      <path d="M28 78 C28 60 29 43 33 28 C41 33 45 46 51 57 C56 67 61 73 67 74 C70 60 71 45 73 28" />
      <path d="M34 73 C34 59 35 47 38 35 C44 39 47 49 52 58 C56 65 60 69 64 70 C66 59 67 48 68 35" />
      <path d="M40 67 C40 57 41 50 43 43 C47 46 49 52 53 58 C56 63 58 66 61 66 C62 58 63 51 63 43" />
      <circle cx="69" cy="57" r="4.5" />
    </svg>
  );
}

export function AtlasPoint({
  size = 10,
  glow = false,
  className = "",
}: {
  size?: number;
  glow?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`atlas-point${glow ? " atlas-point-glow" : ""} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export function ContourField({
  seed = 11,
  density = 7,
  intensity = 1,
  orientation = "rising",
  focusPoint = { x: 68, y: 42 },
  opacity = 0.34,
  variant = "amber",
  className = "",
}: {
  seed?: number;
  density?: number;
  intensity?: number;
  orientation?: ContourOrientation;
  focusPoint?: Point;
  opacity?: number;
  variant?: ContourVariant;
  className?: string;
}) {
  const rnd = seeded(seed);
  const count = Math.min(10, Math.max(3, Math.round(density)));
  const direction = orientation === "rising" ? 1 : -1;
  const strength = Math.min(1.8, Math.max(0.25, intensity));
  const fx = Math.min(94, Math.max(6, focusPoint.x));
  const fy = Math.min(94, Math.max(6, focusPoint.y));

  const paths = Array.from({ length: count }, (_, index) => {
    const inset = index * 6;
    const drift = Math.round((rnd() - 0.5) * 12 * strength);
    const focalPull = (fx - 50) * 0.18;
    const focalLift = (fy - 50) * 0.16 * direction;

    return [
      `M ${-10 + inset} ${72 - inset * 0.35 * direction}`,
      `C ${18 + inset} ${18 + drift - focalLift},`,
      `${54 + drift + focalPull} ${8 + inset + focalLift},`,
      `${110 - inset * 0.4} ${30 + inset * 0.4}`,
      `S ${154 - inset} ${82 - drift + focalLift},`,
      `${210 - inset} ${22 + inset * 0.25 * direction}`,
    ].join(" ");
  });

  return (
    <svg
      className={`contour-field contour-field-${variant} ${className}`}
      viewBox="0 0 200 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ opacity }}
    >
      {paths.map((d, index) => (
        <path key={index} d={d} />
      ))}
    </svg>
  );
}

export function TopographicCrop({
  seed = 17,
  variant = "amber",
  className = "",
}: {
  seed?: number;
  variant?: ContourVariant;
  className?: string;
}) {
  return (
    <div className={`topographic-crop ${className}`} aria-hidden="true">
      <ContourField seed={seed} density={9} opacity={0.48} variant={variant} />
    </div>
  );
}

export function DataTrace({
  points,
  className = "",
}: {
  points: readonly Point[];
  className?: string;
}) {
  if (points.length < 2) return null;
  const [first, ...rest] = points;
  const d = [
    `M ${first?.x ?? 0} ${first?.y ?? 0}`,
    ...rest.map((point) => `L ${point.x} ${point.y}`),
  ].join(" ");

  return (
    <svg className={`data-trace ${className}`} viewBox="0 0 100 100" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function CoordinateLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={`coordinate-label ${className}`}>{children}</span>;
}

export function AtlasGrid({ className = "" }: { className?: string }) {
  return (
    <svg className={`atlas-grid ${className}`} viewBox="0 0 100 100" aria-hidden="true">
      {[20, 40, 60, 80].map((value) => (
        <g key={value}>
          <line x1={value} y1="0" x2={value} y2="100" />
          <line x1="0" y1={value} x2="100" y2={value} />
        </g>
      ))}
    </svg>
  );
}

export function FoldLayer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`fold-layer ${className}`}>{children}</div>;
}

export function AtlasHero({
  surname,
  eyebrow,
  children,
  seed = 31,
  variant = "homepage",
}: {
  surname: string;
  eyebrow?: string;
  children?: ReactNode;
  seed?: number;
  variant?: HeroVariant;
}) {
  return (
    <section className={`atlas-hero atlas-hero-${variant}`}>
      <ContourField seed={seed} density={8} />
      <AtlasGrid />
      <div className="atlas-hero-copy">
        {eyebrow ? <p className="atlas-eyebrow">{eyebrow}</p> : null}
        <h1 className="atlas-surname">{surname}</h1>
        {children}
      </div>
      <AtlasPoint size={14} glow className="atlas-hero-point" />
    </section>
  );
}
