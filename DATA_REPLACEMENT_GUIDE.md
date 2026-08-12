# Replacing demo data with real datasets

EcoMind is intentionally structured around an internal product model. New sources should be adapted into that model rather than coupled directly to components.

## 1. Confirm data rights first

Before connecting any source, document:

- licence and permitted use;
- commercial and redistribution restrictions;
- attribution requirements;
- geographic coverage;
- update frequency;
- deletion and correction obligations;
- whether product-level comparison is supported by the methodology.

Do not scrape retailer pages or use customer account data without explicit permission and a legal/privacy review.

## 2. Preserve the internal product contract

The `Product` interface is in `src/types.ts`. Keep the UI dependent on this internal shape:

```ts
interface Product {
  id: string
  productName: string
  category: 'Clothing'
  materials: MaterialShare[]
  recycledContentPercentage: number | null
  estimatedCarbonKg: number | null
  carbonValueType: 'listed' | 'estimated' | 'unavailable'
  packagingType: PackagingType | null
  durabilityRating: number
  circularityRating: number
  sourceLabels: string[]
  missingFields: string[]
  confidenceLevel: 'High' | 'Medium' | 'Low'
  alternativeProductId: string | null
}
```

Create one adapter per source:

```text
src/data/adapters/
  retailerListingAdapter.ts
  footprintDatasetAdapter.ts
  certificationAdapter.ts
```

Each adapter should return a validated partial record plus field-level provenance.

## 3. Add provenance, not just labels

For production, replace the demo `sourceLabels` array with structured provenance:

```ts
interface FieldProvenance {
  field: string
  sourceName: string
  sourceUrl?: string
  sourceType: 'retailer' | 'supplier' | 'database' | 'certification' | 'estimate'
  retrievedAt: string
  methodologyVersion?: string
  licence?: string
  confidence: number
}
```

Users should be able to see which source supports each field.

## 4. Validate and normalise

Before scoring:

- verify that material percentages total approximately 100;
- normalise names such as `rPET` and `recycled polyester`;
- convert carbon values to one functional unit and system boundary;
- never compare cradle-to-gate with cradle-to-grave without a clear warning;
- store the original value and conversion;
- separate supplier-listed, independently verified and EcoMind-estimated values;
- use `null` for absent information;
- reject impossible percentages, negative values and malformed currencies;
- preserve conflicts instead of silently choosing one source.

## 5. Calculate confidence explicitly

Replace manually assigned confidence with a documented model based on:

- field coverage;
- source type and independence;
- age of the data;
- agreement between sources;
- methodology compatibility;
- whether the value is listed, estimated or verified.

Confidence must remain separate from the Green Score.

## 6. Review the scoring factors

Do not ship the sample factors in `src/lib/scoring.ts` as scientific truth.

Before using real data:

1. define the functional unit;
2. define system boundaries;
3. select licensed textile lifecycle data;
4. document factor versions and geography;
5. obtain expert review;
6. test sensitivity to missing values;
7. test fairness across price bands and product types;
8. version the methodology;
9. preserve old score versions for auditability.

## 7. Ground any AI extraction

A production extraction pipeline should:

- return a quote or exact source span for every extracted field;
- return `unknown` when evidence is absent;
- never generate carbon or recycled-content facts;
- use a strict schema and validation step;
- keep extraction separate from scoring;
- record model and prompt version;
- support human correction and appeals;
- test hallucination, conflict and adversarial-listing cases.

## 8. Replace local alternatives safely

The demo uses `alternativeProductId`. A production recommender should filter by:

- category and product purpose;
- price range chosen by the user;
- size and availability;
- region and delivery practicality;
- confidence threshold;
- genuinely lower environmental score;
- no paid placement without a visible label.

Explain the main advantage and trade-off. Do not shame affordability constraints.

## 9. Add caching and fallbacks

For a real API integration:

- cache source responses with retrieval timestamps;
- show stale-data warnings;
- preserve the last valid record if a source is temporarily unavailable;
- expose a clear error state;
- avoid blocking the retailer page;
- let the user retry or continue shopping without EcoMind.

## 10. Migration sequence

- [ ] Add source-specific adapter and tests.
- [ ] Add structured field provenance.
- [ ] Add schema validation.
- [ ] Add unit and boundary normalisation.
- [ ] Add explicit missing-data handling.
- [ ] Add documented confidence calculation.
- [ ] Replace sample material and carbon factors after expert review.
- [ ] Add methodology versioning.
- [ ] Add user-visible source links and licences.
- [ ] Add privacy, security and legal review.
- [ ] Run accessibility and youth user testing.
- [ ] Remove prototype disclaimers only when each claim is supported.
