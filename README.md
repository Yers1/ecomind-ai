# EcoMind AI

EcoMind AI is a privacy-conscious browser-extension prototype that helps young shoppers understand the estimated environmental impact of clothing while they shop. The website provides the landing page, current-session dashboard, methodology, privacy information and the fictional Threadly demo store; the Manifest V3 extension is the final product format.

**Live web app:** [https://ecomind-ai-two.vercel.app](https://ecomind-ai-two.vercel.app)

Built by Team 17 for the Teens in AI AI4Good Incubator 2026, addressing SDG 13: Climate Action.

> Every product, environmental value, source label and reward is fictional sample or prototype-estimate data. Green Scores are educational estimates, not certifications or verified savings.

## Product experience

EcoMind analyses only after the user activates it. On an included Threadly demo product page it:

- reads the visible name, price, description and material information;
- simulates AI-assisted extraction into a transparent structured record;
- calculates a deterministic Green Score using the published formula;
- separates score confidence from the score and shows missing information;
- compares a lower-impact option from the local sample dataset;
- stores the wishlist, preferences and demo EcoPoints locally.

The project does not scrape or claim compatibility with Amazon or other real retailers. It sends no product information to an external server and collects no payment information.

## Website and extension

- **Website:** public story, fictional Threadly store, in-page simulation, wishlist, dashboard, methodology and privacy pages. It uses `localStorage` for the demo profile.
- **Chrome extension:** real Manifest V3 popup and on-demand injected content script. It uses `chrome.storage.local` and only supports pages carrying the explicit EcoMind demo marker.
- **Shared core:** both builds import the same local product records, score formula, confidence logic, source metadata and product terminology from `shared/ecomind.ts`.

The web dashboard can mirror extension actions through a narrow same-tab event bridge while the extension is injected. Chrome extension storage remains separate from ordinary web storage.

## Main two-minute journey

1. Open the Threadly demo and select a product.
2. Activate EcoMind from the extension popup or the in-page simulation.
3. Wait for the local analysis and open the koala drawer.
4. Expand **See what AI extracted**.
5. Review the score, confidence, missing data and source labels.
6. Select **Compare greener alternative**.
7. Save the lower-impact option or view its demo product page.
8. Open the dashboard to see current-session actions and demo EcoPoints.

## Requirements

- Node.js 20 or later
- npm
- Google Chrome for the installable extension

## Run the website locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`, then select **Try the product demo**.

Create and preview the web production build:

```bash
npm run build
npm run preview
```

## Build and install the Chrome extension

1. Start the web application:

   ```bash
   npm install
   npm run dev
   ```

2. In a second terminal, create the production extension:

   ```bash
   npm run build:extension
   ```

3. Open `chrome://extensions` in Chrome.
4. Enable **Developer mode** in the top-right corner.
5. Select **Load unpacked**.
6. Choose this generated directory, not the `extension` source directory:

   ```text
   <project-folder>\dist-extension
   ```

7. Open `http://localhost:5173/#/demo` or the [deployed Threadly demo](https://ecomind-ai-two.vercel.app/#/demo).
8. Select the EcoMind AI toolbar icon. If it is hidden, pin it from Chrome's Extensions menu.
9. Select **Analyse this product**.
10. Click the injected koala to open the analysis drawer.

After source changes, run `npm run build:extension`, then select the extension's **Reload** icon on `chrome://extensions` and refresh the demo page.

The ready-to-load output contains:

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

### Minimum permissions

The extension requests only:

- `activeTab` — temporary access to the tab the user activates;
- `scripting` — inject `content.js` after **Analyse this product** is selected;
- `storage` — keep local EcoPoints, wishlist items and preferences.

It declares no broad host permissions and requests no `history`, payment, cookie or external-network access. The manifest does not register an always-on content script.

### Extension states

The popup/content experience covers Ready to analyse, Analysing, Successful analysis, Missing product data, Low confidence, Unsupported page and Analysis error.

Extension state is stored under `ecomindExtensionStateV2` in `chrome.storage.local`.

## AI-assisted extraction

No live AI model or API is used. Local deterministic logic simulates the role an AI system could perform: extract listing text into named fields, surface uncertainty, flag absent fields and explain the result. The drawer lets the user inspect the exact listing text and resulting structure.

The extraction never fills an absent environmental fact. The published formula—not an AI model—calculates the numeric score.

## Green Score and confidence

```text
Green Score = Material impact × 35%
            + Estimated carbon × 25%
            + Recycled content × 20%
            + Durability and circularity × 10%
            + Packaging × 10%
```

Factor inputs are normalised from 0–100 and combined with fixed prototype weights. Complete records return an exact demo score. For incomplete records, unknown factors remain `null`; they are never silently converted to confirmed zero. The UI shows **Not disclosed**, lowers confidence and presents a provisional `~score` with a possible range calculated from the known factors.

Confidence is deterministic and separate from the score:

- **High:** all required score inputs are present.
- **Medium:** one relevant field is absent or important listing context is limited.
- **Low:** two or more required score inputs are absent.

The weights and factor values are prototype assumptions, have not been scientifically validated and may overlap—for example, material and carbon impacts. Expert review and real data provenance are required before any real-world release. People/labour information stays outside the environmental score.

## EcoPoints integrity

New profiles start at 0. Demo points are awarded once per action:

- compare a greener alternative: **+5**;
- save a lower-impact option: **+5**;
- self-report a repair/reuse challenge: **+20**;
- self-report “I do not need this item”: **+25**.

Analysing, saving a higher-impact item, or clicking a store purchase button earns no points. Koala levels are Starter at 0–14, Eco Explorer at 15–39 and Climate Champion at 40+.

Web demo state is stored under `ecomind-ai-demo-state-v2` in `localStorage`. Clear that key to reset the web profile. Extension state can be cleared from the extension's details page under site data/storage.

## Survey findings

No survey results are displayed because verified findings have not been supplied. Add reviewed results only in `src/data/surveyInsights.ts` using:

```ts
type SurveyInsight = {
  statement: string
  evidence: string
  questionNumber?: number
  respondentCount?: number
}
```

Append verified objects to `surveyInsights`. The landing-page research section renders only when the array is non-empty. Do not add inferred statistics, paraphrases without evidence or personally identifiable responses.

## Commands and verification

```bash
npm install
npm run build
npm run build:extension
npm run lint
npm run test
```

`npm run test` checks the shared scoring rules and extension injection, statuses, comparison rewards, wishlist persistence and duplicate-reward prevention.

## Project structure

```text
EcoMind-AI/
├── public/products/                 # Fictional demo product images
├── shared/ecomind.ts                # Shared records, score and confidence logic
├── src/
│   ├── components/                  # Widget, drawer, comparison and shared UI
│   ├── data/                        # Web product adapter and survey insert point
│   ├── hooks/useAccessibleDialog.ts # Focus trap, Escape and focus restoration
│   ├── pages/                       # Landing, Threadly, dashboard and policy pages
│   └── state/EcoMindContext.tsx     # Web demo state and extension bridge
├── extension/                       # Existing Manifest V3 source and icons
├── scripts/build-extension.mjs      # Reproducible extension build
├── scripts/test-core.mjs            # Shared score tests
└── scripts/test-extension.mjs       # Content-script integration tests
```

## Current limitations and future requirements

- All three products, environmental inputs and images are fictional demo content.
- Carbon and factor values are not lifecycle assessments; no savings are verified.
- Alternative matching follows explicit local links rather than a production recommender.
- The demo profile is local-only and is not a secure account.
- The extension is not published in the Chrome Web Store and supports only the included Threadly pages.
- Automated checks validate the manifest and production bundle, but the final **Load unpacked** confirmation must be performed interactively in the user's Chrome.
- A production version needs reviewed lifecycle/environmental-footprint and textile data, licensed retailer information, provenance and versioning, independent methodology review, correction workflows, accessibility research, privacy/security review and user testing.

See [ASSUMPTIONS_AND_LIMITATIONS.md](ASSUMPTIONS_AND_LIMITATIONS.md) and [DATA_REPLACEMENT_GUIDE.md](DATA_REPLACEMENT_GUIDE.md) for details.

## Documentation

- [2-minute demo script](DEMO_SCRIPT.md)
- [Testing checklist](TESTING_CHECKLIST.md)
- [Verification record](VERIFICATION.md)
- [GitHub publishing details](GITHUB_PUBLISHING.md)

## Repository safety and licence

The repository contains no API keys, credentials, customer records, retailer orders, private survey responses or original local task attachments. Runtime demo data remains in the user's browser.

MIT. No retailer, certification body or commercial partnership is claimed.
