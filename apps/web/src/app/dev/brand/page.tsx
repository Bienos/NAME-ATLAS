import Image from "next/image";
import { notFound } from "next/navigation";
import {
  AtlasHero,
  AtlasPoint,
  ContourField,
  CoordinateLabel,
  TopographicCrop,
} from "../../../design-system/graphics/index.js";
import {
  Button,
  ConfidenceBadge,
  DataStat,
  EvidenceCard,
  LoadingState,
  Panel,
  SearchInput,
  SourceCard,
  Timeline,
  TimelineEvent,
} from "../../../design-system/components/index.js";

export const metadata = {
  title: "Name Atlas Brand System v1.0",
  robots: { index: false, follow: false },
};

const SWATCHES = [
  ["plum", "Deep Plum", "--color-bg-primary"],
  ["aubergine", "Aubergine", "--color-bg-elevated"],
  ["ivory", "Warm Ivory", "--color-text-primary"],
  ["blue", "Atlas Blue", "--color-signal-atlas"],
  ["amber", "Amber", "--color-signal-amber"],
  ["paper", "Paper", "archival only"],
] as const;

export default function BrandLabPage() {
  const production =
    process.env.VERCEL_ENV === "production" ||
    (process.env.VERCEL_ENV === undefined && process.env.NODE_ENV === "production");
  if (production) notFound();

  return (
    <div className="atlas-v1 brand-lab">
      <header className="brand-lab-head">
        <p className="atlas-eyebrow">NAME ATLAS · BRAND SYSTEM v1.0</p>
        <h1>Evolved Contour — Dark Atlas</h1>
        <p>A surname behaves like a landscape.</p>
      </header>

      <AtlasHero surname="Wiśniewski" eyebrow="NAZWISKO">
        <p className="brand-lab-lede">
          Pochodzenie. Znaczenie. Występowanie. Zawsze ze źródłami.
        </p>
        <SearchInput aria-label="Wpisz nazwisko" placeholder="Wpisz nazwisko, np. Kowalski" />
      </AtlasHero>

      <section className="brand-lab-section">
        <p className="atlas-eyebrow">LOGO · RESPONSIVE MARKS · ATLAS POINT</p>
        <div className="brand-lab-marks">
          <figure>
            <Image
              src="/brand/logo/name-atlas-mark-dark.svg"
              alt="Name Atlas Evolved Contour mark"
              width={144}
              height={144}
            />
            <figcaption>Full · 48 px+</figcaption>
          </figure>
          <figure>
            <Image
              src="/brand/logo/name-atlas-mark-32.svg"
              alt="Name Atlas small mark"
              width={64}
              height={64}
            />
            <figcaption>32 px cut</figcaption>
          </figure>
          <figure>
            <Image
              src="/brand/logo/name-atlas-mark-16.svg"
              alt="Name Atlas favicon mark"
              width={32}
              height={32}
            />
            <figcaption>16 px cut</figcaption>
          </figure>
          <div className="brand-lab-point">
            <AtlasPoint size={18} />
            <CoordinateLabel>YOU ARE HERE</CoordinateLabel>
          </div>
        </div>
      </section>

      <section className="brand-lab-section">
        <p className="atlas-eyebrow">COLOUR · SIGNAL HIERARCHY</p>
        <div className="brand-lab-swatches">
          {SWATCHES.map(([id, label, meta]) => (
            <figure key={id} className="brand-lab-swatch" data-swatch={id}>
              <span aria-hidden="true" />
              <figcaption>
                <strong>{label}</strong>
                <small>{meta}</small>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="brand-lab-section">
        <p className="atlas-eyebrow">TYPOGRAPHY</p>
        <h2 className="atlas-surname">Łukasiewicz</h2>
        <h2 className="brand-lab-serif">Żółkiewski · Sękowski</h2>
        <p className="brand-lab-body">
          Instrument Sans carries interface and reading copy. Fraunces carries the human story.
        </p>
        <CoordinateLabel>[DATASET, DATE] · [SOURCE] · SYGN. 12/4/8</CoordinateLabel>
      </section>

      <section className="brand-lab-section">
        <p className="atlas-eyebrow">SPACING · SURFACES</p>
        <div className="brand-lab-surface-grid">
          <Panel level={1}>
            <CoordinateLabel>LEVEL 1</CoordinateLabel>
            <p>Subtle information region.</p>
          </Panel>
          <Panel level={2}>
            <CoordinateLabel>LEVEL 2</CoordinateLabel>
            <p>Interactive or data module.</p>
          </Panel>
          <Panel level="paper">
            <CoordinateLabel>ARCHIVAL</CoordinateLabel>
            <p>Rare paper surface for a document or editorial interruption.</p>
          </Panel>
        </div>
        <div className="brand-lab-spacing" aria-label="Spacing scale">
          {["04", "08", "16", "24", "40", "64"].map((value) => (
            <span key={value} data-space={value}>
              {value}
            </span>
          ))}
        </div>
      </section>

      <section className="brand-lab-section brand-lab-grid">
        <Panel level={2}>
          <p className="atlas-eyebrow">DATA</p>
          <DataStat value="[COUNT]" label="osób w Polsce" meta="[DATASET, DATE]" />
        </Panel>
        <EvidenceCard
          status="VERIFIED"
          title="Występowanie w Polsce"
          source="[DATASET]"
          date="[DATE]"
        >
          <p>[CLAIM]</p>
        </EvidenceCard>
        <SourceCard title="Źródło archiwalne" source="[SOURCE]" date="[DATE]">
          <p>Dokumentowane źródło pozostaje odróżnione od dekoracyjnej grafiki.</p>
        </SourceCard>
      </section>

      <section className="brand-lab-section">
        <p className="atlas-eyebrow">CONFIDENCE</p>
        <div className="brand-lab-row">
          <ConfidenceBadge level="VERIFIED" />
          <ConfidenceBadge level="LIKELY" />
          <ConfidenceBadge level="POSSIBLE" />
          <ConfidenceBadge level="UNCONFIRMED" />
        </div>
      </section>

      <section className="brand-lab-section brand-lab-topography">
        <p className="atlas-eyebrow">GRAPHIC PRIMITIVES · DETERMINISTIC TOPOGRAPHY</p>
        <ContourField seed={47} density={8} />
        <TopographicCrop seed={21} />
      </section>

      <section className="brand-lab-section">
        <p className="atlas-eyebrow">MAP · CHART TOKENS · PLACEHOLDER DATA ONLY</p>
        <div className="brand-lab-data-viz">
          <div className="brand-lab-map-ramp" aria-label="Map density token ramp">
            <span data-band="no-data">NO DATA</span>
            <span data-band="lowest">LOWEST</span>
            <span data-band="low">LOW</span>
            <span data-band="mid">MID</span>
            <span data-band="high">HIGH</span>
            <span data-band="peak">PEAK</span>
          </div>
          <div className="brand-lab-chart" aria-label="Chart token example">
            <span data-series="context" />
            <span data-series="context" />
            <span data-series="current" />
            <span data-series="historical" />
          </div>
        </div>
      </section>

      <section className="brand-lab-section">
        <p className="atlas-eyebrow">MOTION · LOADING</p>
        <div className="brand-lab-row">
          <LoadingState label="Odnajdujemy udokumentowane ślady…" />
          <LoadingState label="Budujemy widok…" variant="page" />
        </div>
      </section>

      <section className="brand-lab-section">
        <p className="atlas-eyebrow">TIMELINE</p>
        <Timeline>
          <TimelineEvent date="XVI w.">
            <p>[EARLIEST DOCUMENTED OCCURRENCE]</p>
          </TimelineEvent>
          <TimelineEvent date="XIX w.">
            <p>[SOURCE]</p>
          </TimelineEvent>
          <TimelineEvent date="2026">
            <p>[DATASET, DATE]</p>
          </TimelineEvent>
        </Timeline>
      </section>

      <section className="brand-lab-section">
        <p className="atlas-eyebrow">CONTROLS</p>
        <div className="brand-lab-row">
          <Button>Odkryj nazwisko</Button>
          <Button variant="secondary">Zobacz źródła</Button>
          <Button variant="amber">Historia</Button>
        </div>
      </section>

      <section className="brand-lab-section">
        <p className="atlas-eyebrow">SOCIAL · SHARE SYSTEM</p>
        <div className="brand-lab-social">
          <Image
            src="/brand/social/og-master.svg"
            alt="Name Atlas Open Graph master"
            width={600}
            height={315}
          />
          <Image
            src="/brand/social/portrait-1080x1350.svg"
            alt="Name Atlas portrait social master"
            width={324}
            height={405}
          />
        </div>
      </section>

      <section className="brand-lab-section brand-lab-responsive">
        <p className="atlas-eyebrow">RESPONSIVE PRINCIPLE</p>
        <div>
          <strong>Desktop</strong>
          <p>Editorial spatial composition, deliberate asymmetry, larger map/data relationships.</p>
        </div>
        <div>
          <strong>Mobile</strong>
          <p>Focused vertical narrative, cropped edge contours, legible evidence and full-screen maps when needed.</p>
        </div>
      </section>
    </div>
  );
}
