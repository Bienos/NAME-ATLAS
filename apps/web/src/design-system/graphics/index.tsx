import type { CSSProperties, ReactNode } from "react";

function seeded(seed: number) {
  let state = Math.max(1, Math.abs(Math.floor(seed)) % 2147483647);
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

export function AtlasPoint({ size = 10, className = "" }: { size?: number; className?: string }) {
  return <span className={`atlas-point ${className}`} style={{ width: size, height: size }} aria-hidden="true" />;
}

export function ContourField({
  seed = 11,
  density = 7,
  opacity = 0.34,
  className = "",
}: {
  seed?: number;
  density?: number;
  opacity?: number;
  className?: string;
}) {
  const rnd = seeded(seed);
  const count = Math.min(10, Math.max(3, density));
  const paths = Array.from({ length: count }, (_, index) => {
    const inset = index * 6;
    const drift = Math.round((rnd() - 0.5) * 12);
    return `M ${-10 + inset} ${72 - inset * 0.35} C ${18 + inset} ${18 + drift}, ${54 + drift} ${8 + inset}, ${110 - inset * 0.4} ${30 + inset * 0.4} S ${154 - inset} ${82 - drift}, ${210 - inset} ${22 + inset * 0.25}`;
  });
  return (
    <svg className={`contour-field ${className}`} viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true" style={{ opacity }}>
      {paths.map((d, index) => <path key={index} d={d} />)}
    </svg>
  );
}

export function TopographicCrop({ seed = 17, className = "" }: { seed?: number; className?: string }) {
  return <div className={`topographic-crop ${className}`} aria-hidden="true"><ContourField seed={seed} density={9} opacity={0.48} /></div>;
}

export function DataTrace({
  points,
  className = "",
}: {
  points: readonly { x: number; y: number }[];
  className?: string;
}) {
  if (points.length < 2) return null;
  const [first, ...rest] = points;
  const d = [`M ${first?.x ?? 0} ${first?.y ?? 0}`, ...rest.map((p) => `L ${p.x} ${p.y}`)].join(" ");
  return <svg className={`data-trace ${className}`} viewBox="0 0 100 100" aria-hidden="true"><path d={d} /></svg>;
}

export function CoordinateLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`coordinate-label ${className}`}>{children}</span>;
}

export function AtlasGrid({ className = "" }: { className?: string }) {
  return (
    <svg className={`atlas-grid ${className}`} viewBox="0 0 100 100" aria-hidden="true">
      {[20,40,60,80].map((n)=><g key={n}><line x1={n} y1="0" x2={n} y2="100"/><line x1="0" y1={n} x2="100" y2={n}/></g>)}
    </svg>
  );
}

export function FoldLayer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`fold-layer ${className}`}>{children}</div>;
}

export function AtlasHero({
  surname,
  eyebrow,
  children,
  seed = 31,
}: {
  surname: string;
  eyebrow?: string;
  children?: ReactNode;
  seed?: number;
}) {
  return (
    <section className="atlas-hero">
      <ContourField seed={seed} density={8} />
      <AtlasGrid />
      <div className="atlas-hero-copy">
        {eyebrow ? <p className="atlas-eyebrow">{eyebrow}</p> : null}
        <h1 className="atlas-surname">{surname}</h1>
        {children}
      </div>
      <AtlasPoint size={14} className="atlas-hero-point" />
    </section>
  );
}
