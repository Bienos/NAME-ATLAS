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
