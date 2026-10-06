# Component Guidelines

Implementation: `apps/web/src/design-system/components/index.tsx`.

## Shared rules

- Components consume semantic tokens/classes.
- Product truth stays outside the component.
- Sizes: `sm | md | lg` where relevant.
- States must include hover/focus/disabled and error where relevant.
- Interactive targets meet mobile target guidance.
- Paper surfaces are explicit variants, never default.

## Button

Purpose: explicit action.

Variants:
- primary — Atlas Blue;
- secondary — dark Level 2 with border;
- ghost — quiet text action;
- amber — only for a historical/geographic action where amber meaning is appropriate.

Do not make every CTA amber.

## IconButton

Same variants; accessible label is mandatory.

## SearchInput / TextInput

Search may use the rare light paper field in hero contexts. Regular form inputs default dark.

Must preserve native label semantics, autocomplete and error description.

## Tabs

Use for peer views, not process steps. Active state = text + rule/marker, not colour alone.

## Navigation

Quiet typography and clear current-page state. Mobile disclosure/drawer must retain keyboard/screen-reader behavior.

## Badge / ConfidenceBadge / SourceBadge

Badges communicate categories/status only. Confidence badge always includes the label.

## SourceCard / EvidenceCard

Anatomy:
1. status/eyebrow;
2. claim or source title;
3. supporting metadata;
4. source/dataset;
5. date;
6. optional method/action.

Avoid “legal footer” styling.

## DataStat

Number/value + human meaning + source/date where applicable. Never render a value without the context required by the product contract.

## MapLegend

Direct labels preferred; no-data is explicit.

## Tooltip / Popover / Modal / Drawer

Use Level 3 surface, strong focus management, Escape close where appropriate, restore focus on close. Tooltip never contains essential interactive content.

## Accordion

Use for optional evidence detail. Native disclosure semantics preferred.

## Timeline / TimelineEvent

Vertical on mobile; trace may animate only under normal motion preference. Each event can carry source/confidence.

## Citation / DatasetReference / CoordinateLabel

Mono evidence voice. Keep copyable/selectable. Do not fabricate coordinate-like decoration inside factual modules.

## RegionList

Text equivalent/companion to a factual map. Selected region state mirrors map selection.

## SearchResult

Surname + compact supporting descriptor. Do not infer meaning/family connection.

## Breadcrumb / Divider

Quiet structural aids; divider should not become card chrome.

## LoadingState

Brand sequence: resolve → locate → reveal. Provide accessible status text.

## EmptyState

Explain what is missing and next action. No fake metrics.

## ErrorState

Explain system failure and recovery. Do not confuse with insufficient evidence.

## Correct use

A source card appears because source material is a discrete object.

## Incorrect use

Wrapping every paragraph, statistic and heading in identical rounded rectangles.
