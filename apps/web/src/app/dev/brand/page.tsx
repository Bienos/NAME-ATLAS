import { notFound } from "next/navigation";
import { AtlasHero, AtlasPoint, ContourField, CoordinateLabel, TopographicCrop } from "../../../design-system/graphics/index.js";
import { Button, ConfidenceBadge, DataStat, EvidenceCard, LoadingState, Panel, SearchInput, SourceCard, Timeline, TimelineEvent } from "../../../design-system/components/index.js";

export const metadata = { title: "Name Atlas Brand System v1.0", robots: { index: false, follow: false } };

export default function BrandLabPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return (
    <div className="atlas-v1 brand-lab">
      <header className="brand-lab-head"><p className="atlas-eyebrow">NAME ATLAS · BRAND SYSTEM v1.0</p><h1>Evolved Contour — Dark Atlas</h1><p>A surname behaves like a landscape.</p></header>
      <AtlasHero surname="Wiśniewski" eyebrow="NAZWISKO">
        <p className="brand-lab-lede">Pochodzenie. Znaczenie. Występowanie. Zawsze ze źródłami.</p>
        <SearchInput aria-label="Wpisz nazwisko" placeholder="Wpisz nazwisko, np. Kowalski" />
      </AtlasHero>

      <section className="brand-lab-section"><p className="atlas-eyebrow">LOGO / POINT</p><div className="brand-lab-row"><img src="/brand/logo/name-atlas-mark-dark.svg" alt="Name Atlas Evolved Contour mark"/><AtlasPoint size={18}/><CoordinateLabel>52.2297 N · 21.0122 E</CoordinateLabel></div></section>

      <section className="brand-lab-section"><p className="atlas-eyebrow">TYPE</p><h2 className="atlas-surname">Łukasiewicz</h2><h2 className="brand-lab-serif">Żółkiewski · Sękowski</h2><p>Instrument Sans carries interface and reading copy.</p><CoordinateLabel>[DATASET, DATE] · [SOURCE]</CoordinateLabel></section>

      <section className="brand-lab-section brand-lab-grid"><Panel level={2}><p className="atlas-eyebrow">DATA</p><DataStat value="[COUNT]" label="osób w Polsce" meta="[DATASET, DATE]"/></Panel><EvidenceCard status="VERIFIED" title="Występowanie w Polsce" source="[DATASET]" date="[DATE]"><p>[CLAIM]</p></EvidenceCard><SourceCard title="Źródło archiwalne" source="[SOURCE]" date="[DATE]"><p>Dokumentowane źródło pozostaje odróżnione od dekoracyjnej grafiki.</p></SourceCard></section>

      <section className="brand-lab-section"><p className="atlas-eyebrow">CONFIDENCE</p><div className="brand-lab-row"><ConfidenceBadge level="VERIFIED"/><ConfidenceBadge level="LIKELY"/><ConfidenceBadge level="POSSIBLE"/><ConfidenceBadge level="UNCONFIRMED"/></div></section>

      <section className="brand-lab-section brand-lab-topography"><ContourField seed={47} density={8}/><TopographicCrop seed={21}/></section>

      <section className="brand-lab-section"><p className="atlas-eyebrow">MOTION / LOADING</p><LoadingState label="Odnajdujemy udokumentowane ślady…"/></section>

      <section className="brand-lab-section"><p className="atlas-eyebrow">TIMELINE</p><Timeline><TimelineEvent date="XVI w."><p>[EARLIEST DOCUMENTED OCCURRENCE]</p></TimelineEvent><TimelineEvent date="XIX w."><p>[SOURCE]</p></TimelineEvent><TimelineEvent date="2026"><p>[DATASET, DATE]</p></TimelineEvent></Timeline></section>

      <section className="brand-lab-section"><p className="atlas-eyebrow">CONTROLS</p><div className="brand-lab-row"><Button>Odkryj nazwisko</Button><Button variant="secondary">Zobacz źródła</Button><Button variant="amber">Historia</Button></div></section>
    </div>
  );
}
