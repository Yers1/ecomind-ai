# EcoMind AI

EcoMind AI is a privacy-conscious Manifest V3 browser-extension prototype that locally structures sustainability evidence from clothing product pages and produces a transparent provisional Green Score. The website provides the public story, dashboard, methodology, privacy information and the fictional Threadly fallback store.

**Live website and Threadly fixture:** [https://ecomind-ai-two.vercel.app](https://ecomind-ai-two.vercel.app)

Built by Team 17 for the Teens in AI AI4Good Incubator 2026, addressing SDG 13: Climate Action.

> Scores, factor ranges and rewards are educational prototype estimates—not certifications, lifecycle assessments or verified savings. Retailer compatibility is best-effort and no retailer partnership is claimed.

## Traffic-light Green Score

Every analysed result uses the same shared thresholds from `shared/trafficLight.ts`:

- 70–100: Green — Lower impact;
- 40–69: Amber — Mixed impact;
- 0–39: Red — Higher impact;
- insufficient evidence: Grey — Not enough information.

The status always includes a shape/icon, visible label, score or range, grade where available, confidence and accessible text. It is hidden before analysis. Green means lower impact under the prototype methodology—not environmentally friendly, impact-free or certified.

## Backend-ready community leaderboard

The optional weekly leaderboard ranks server-confirmed EcoPoints earned through meaningful actions—not purchases, scans, spending or average product scores. It includes period tabs for this week, this month and all time; passwordless email OTP; an opt-in nickname profile; top three and full ranking; weekly challenges; current-user pinning; an offline queue; explicit local-progress import; opt-out and account deletion.

Production never fills an empty backend leaderboard with fictional users. Until Supabase is configured and three-account/RLS verification passes, the UI says **Backend setup required** and guest/local product analysis continues to work. Follow [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

Shared point rules live in `shared/ecoPoints.ts`:

- compare a greener alternative: +5;
- save a lower-impact option: +5;
- choose a lower-impact option: +10 when explicitly recorded, never inferred from a purchase;
- repair or reuse: +20, self-reported and capped;
- pause an unnecessary purchase: +25, self-reported and capped;
- complete a weekly challenge: +30, once per challenge and week;
- analyse or scan: 0;
- purchase: 0 automatic points.

Each event has a timestamp, source and deduplication key. Authenticated points are calculated by the protected `award_eco_points` database function; clients cannot submit a point value. Web local storage and `chrome.storage.local` remain separate guest stores. Website and extension sign in separately to the same Supabase account and reconcile through the same backend events.

## What the extension does

After the user selects **Analyse this product**, EcoMind receives temporary access to only the active tab and:

1. selects a retailer-specific or generic parser;
2. reads visible product details and structured product metadata from the current DOM;
3. preserves original evidence beside every normalised value;
4. keeps absent values unknown instead of silently converting them to zero;
5. applies the deterministic prototype formula when sufficient clothing evidence exists;
6. injects the koala widget and evidence drawer through a content script;
7. offers a user-labelled manual correction panel;
8. lets the user save extracted fields and compare two real products across retailers.

All parsing, scoring, corrections and storage run locally. EcoMind does not send page contents to an AI service or product server.

## Multi-retailer architecture

Parsers live under `shared/parsers/` and implement one `ProductPageParser` interface. Registry order is:

1. retailer-specific adapters;
2. Schema.org Product / JSON-LD;
3. Open Graph and `itemprop` metadata;
4. generic visible product details;
5. manual fallback.

Current adapters:

- **Amazon US and UK:** best-effort support for clothing pages using centrally defined fallback selectors;
- **H&M:** JSON-LD enriched with the visible Material & Care and Description & Fit sections;
- **Nike:** Product/ProductGroup JSON-LD enriched with the visible Product Details section;
- **Shopify:** Schema.org product data enriched with visible composition, care, origin, certification and packaging wording;
- **Generic JSON-LD:** Product objects, nested `@graph`, ProductGroup variants, offers, brand, category, image, SKU/GTIN, material and additionalProperty;
- **Generic metadata:** Open Graph product fields and Schema.org `itemprop` fields;
- **Generic visible page:** conservative fallback for product URL patterns and visible product sections;
- **Threadly:** reliable local fixture and presentation fallback;
- **Manual:** available when automatic evidence is incomplete.

Generic support does not mean a retailer officially supports or endorses EcoMind. Retailer markup may change.

## Clothing validation

The prototype methodology applies only to clothing, textile products and footwear/accessories with meaningful material evidence. Electronics, food, cosmetics, furniture and unrelated categories are rejected. Product detection alone is not enough to produce a score.

If a page has no material composition, the extension shows **Score withheld** and offers **Help EcoMind complete this analysis**. Manual values are labelled **Provided by user**.

## Evidence and scoring

The extension distinguishes:

- **Verified page evidence:** structured product data or retailer product specifications;
- **Page-text extraction:** description or visible feature text;
- **User-provided:** explicit manual confirmation or correction;
- **EcoMind estimate:** a documented prototype factor or range;
- **Not disclosed:** no supporting evidence found.

The fixed demo formula remains:

```text
Green Score = Material impact × 35%
            + Estimated carbon × 25%
            + Recycled content × 20%
            + Durability and circularity × 10%
            + Packaging × 10%
```

For real products, disclosed materials can feed a labelled EcoMind prototype material-factor range. Recycled content is known only when explicitly disclosed. Packaging can be estimated only from disclosed packaging wording. Carbon and durability remain unknown unless supporting inputs exist. The midpoint is normalised over supported factors and the displayed range includes uncertainty from missing factors.

The material parser recognises common cotton, recycled cotton, polyester, recycled polyester, nylon, elastane/spandex, linen, hemp, wool, viscose/rayon, modal, lyocell/Tencel, acrylic, silk, leather and recycled-fibre wording. Synonyms are normalised while the original text is retained. Unreasonable percentage totals and percentage ranges are flagged as uncertain.

## Real-product comparison

EcoMind does not present a fictional Threadly item as a real retailer alternative. Instead:

```text
Analyse first real product
→ Save for comparison
→ Open a second product on another retailer
→ Analyse it
→ Record a comparison between the two extracted records
```

Only the fields required for comparison are stored, never the webpage HTML.

## Privacy and permissions

The Manifest requests exactly:

- `activeTab` — temporary access to the tab the user explicitly activates;
- `scripting` — on-demand injection after the button click;
- `storage` — local wishlist, extracted comparison records, corrections, EcoPoints and preferences.

It requests no `history`, `<all_urls>`, broad host, cookies, payment or persistent all-site access. It does not inspect orders, cart contents, unrelated tabs or shopping history. The manifest contains no static content script.

## Run the web application

Requirements: Node.js 20 or later, npm and Chrome.

```bash
npm install
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`.

Production web build:

```bash
npm run build
npm run preview
```

## Build and load the extension

Follow these steps in order:

1. Run the web application with `npm install` and `npm run dev`; keep that terminal open and open the displayed Vite URL.
2. In a second terminal inside the same project folder, run the production extension build: `npm run build:extension`.
3. Open `chrome://extensions` in Chrome.
4. Enable **Developer mode** in the top-right corner.
5. Select **Load unpacked**.
6. Choose the generated `<project-folder>\dist-extension` directory—not the `extension` source directory.
7. Open the included Threadly demo product page from **Product demo** in the web app (or a best-effort supported real clothing page).
8. Open the EcoMind AI popup, select **Analyse this product**, then select the injected koala to review evidence, missing fields and corrections.

Optional but helpful: pin EcoMind AI from Chrome's Extensions menu so its koala icon stays visible.

After changing extension source, rebuild it, select **Reload** on `chrome://extensions`, then refresh the product page.

### Test an Amazon clothing page

1. Open an individual clothing detail page on `amazon.com` or `amazon.co.uk`.
2. Ensure the title and Product details/Fabric type section are visible.
3. Select EcoMind AI → **Analyse this product**.
4. Open the koala.
5. Confirm the retailer reads Amazon, parser reads `amazon`, and **See what EcoMind extracted** cites Amazon selectors.
6. Confirm missing carbon, durability or packaging fields remain **Not disclosed**.
7. If fabric composition is absent, use the manual panel or explicitly mark it not disclosed.
8. If colour/size changes the product identifier, use **Re-analyse product** after EcoMind marks the result outdated.

Amazon support is heuristic and not universal. Amazon may alter markup, regional content or variation data.

## Development diagnostics

Append `?ecomind-debug=true` to a product URL before analysis, or enable the stored development preference. The drawer then shows URL, selected parser, matched selectors, JSON-LD detection, raw fields, normalised fields, rejected uncertain values, missing fields, confidence and score inputs. It is hidden in normal use.

## Commands

```bash
npm install
npm run lint
npm run test:engagement
npm run test:parsers
npm run test:extension
npm run test:backend
npm run test:supabase:local
npm run test
npm run build
npm run build:extension
```

The sanitized fixtures cover full/partial/no-material Amazon layouts, alternate fabric wording, JSON-LD, meta/itemprop, malformed JSON-LD, Threadly, H&M, Nike, Shopify, variation changes, non-products and non-clothing products. Complete copyrighted retailer HTML is not committed.

## Extension output

```text
dist-extension/
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.css
├── popup.js
└── icons/
```

`dist-extension` is generated and excluded from Git.

For a beginner-friendly public release walkthrough, ready-to-paste listing text, permission explanations and privacy answers, see [CHROME_WEB_STORE_RELEASE.md](CHROME_WEB_STORE_RELEASE.md). The owner must submit the extension through their own Chrome Web Store developer account.

## Survey findings

No survey result is displayed until verified data is supplied. Insert reviewed findings only in `src/data/surveyInsights.ts` using the documented `SurveyInsight` type. The landing research section renders only when the exported array is non-empty.

## Project structure

```text
shared/
├── ecomind.ts                 # Threadly records and deterministic demo formula
├── realProductScoring.ts      # Incomplete real-product factor states and ranges
└── parsers/
    ├── parserTypes.ts
    ├── parserRegistry.ts
    ├── materialExtraction.ts
    ├── amazonParser.ts
    ├── hmParser.ts
    ├── nikeParser.ts
    ├── shopifyParser.ts
    ├── genericJsonLdParser.ts
    ├── genericMetaParser.ts
    ├── genericVisibleParser.ts
    ├── threadlyParser.ts
    └── manualParser.ts
extension/                    # Manifest V3 source, popup, worker and icons
tests/fixtures/               # Sanitized parser regression fixtures
scripts/test-parsers.mjs      # Parser/material/scoring suite
scripts/test-extension.mjs    # Injected-flow and persistence suite
```

## Current limitations

- Retailer adapters are best-effort DOM heuristics and may break when sites change.
- Product pages may localise prices, text and variation content differently.
- Material factors and Green Score weights are unvalidated prototype assumptions.
- No live lifecycle, certification or retailer API is connected.
- Carbon is not inferred from material alone.
- Manual corrections are not independently verified.
- Real alternatives come only from products the user analyses and saves; there is no commercial product-search API.
- The connected development environment cannot automate Chrome's protected `chrome://extensions` page, so final Load unpacked confirmation remains a user-controlled step.
- The extension is not yet published in the Chrome Web Store.
- Hosted multi-user operation remains disabled until a Supabase project is configured and the independent-account/RLS checklist passes. The unconfigured production UI shows no fictional participants.
- Website and extension guest stores remain technically separate. Cross-device totals come from Supabase only after the user signs into both clients with the same private email account.

The backend trust model is documented in [LEADERBOARD_BACKEND.md](LEADERBOARD_BACKEND.md), with deployment steps in [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

See [REAL_RETAILER_TESTING.md](REAL_RETAILER_TESTING.md), [VERIFICATION.md](VERIFICATION.md) and [ASSUMPTIONS_AND_LIMITATIONS.md](ASSUMPTIONS_AND_LIMITATIONS.md).

## Repository safety and licence

The repository contains no credentials, cookies, customer records, orders, payment data, private survey responses or complete copied retailer pages. Runtime data remains local to the browser.

MIT. No retailer, certification body or commercial partnership is claimed.
