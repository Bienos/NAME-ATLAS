# Name Atlas Brand System v1.0

**Visual identity:** Evolved Contour — Dark Atlas  
**Core idea:** **A surname behaves like a landscape.**

Name Atlas gradually reconstructs the documented landscape of a surname from linguistic, geographic, historical and archival evidence.

## Start here

- Canonical rules: [NAME_ATLAS_BRAND_GUIDELINES.md](./NAME_ATLAS_BRAND_GUIDELINES.md)
- Current implementation audit: [CURRENT_UI_AUDIT.md](./CURRENT_UI_AUDIT.md)
- Tokens: [DESIGN_TOKENS.md](./DESIGN_TOKENS.md)
- Type: [TYPOGRAPHY.md](./TYPOGRAPHY.md)
- Graphics: [GRAPHIC_LANGUAGE.md](./GRAPHIC_LANGUAGE.md)
- Components: [COMPONENT_GUIDELINES.md](./COMPONENT_GUIDELINES.md)
- Motion: [MOTION_GUIDELINES.md](./MOTION_GUIDELINES.md)
- Accessibility: [ACCESSIBILITY.md](./ACCESSIBILITY.md)
- Migration: [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

## Developer entry points

- Raw/foundation values: `apps/web/src/lib/design-tokens.ts`
- Semantic Brand System v1 tokens: `apps/web/src/design-system/tokens/`
- Brand CSS: `apps/web/src/design-system/brand-system.css`
- Components: `apps/web/src/design-system/components/`
- Graphics: `apps/web/src/design-system/graphics/`
- Logo/assets: `apps/web/public/brand/`
- Living reference: `/dev/brand` outside production.

## Build a page that looks like Name Atlas

1. Use the shared shell and product semantics already in the app.
2. Put the new surface inside the `.atlas-v1` scope.
3. Use semantic tokens, never raw colours.
4. Let Fraunces carry surnames/editorial discoveries; Instrument Sans carries interface/body; IBM Plex Mono carries evidence/data.
5. Start with dark Level 0. Add Level 1/2 surfaces only when structure requires them.
6. Use one dominant discovery per composition.
7. Use Atlas Blue for action/focus/location; amber only for history/geographic emphasis.
8. Use a contour primitive sparingly: one field/crop is normally enough.
9. Keep every factual number connected to source/date/confidence as the product contract allows.
10. Test keyboard, focus, contrast, mobile and reduced motion.

## Never

- turn the product into a wall of rounded dashboard cards;
- use blue and amber as decoration everywhere;
- use random mountain photography;
- invent archival material;
- use contour lines as wallpaper;
- imply surname = family line, ancestry, ethnicity or coat of arms;
- derive facts in presentation code;
- represent missing data as zero;
- expose `/dev/brand` in production.
