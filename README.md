# EcoMind AI

EcoMind AI is a polished hackathon prototype that helps young online shoppers understand the environmental impact of clothing products while they shop.

**Live web app:** [https://ecomind-ai-two.vercel.app](https://ecomind-ai-two.vercel.app)

Built by Team 17 for the Teens in AI AI4Good Incubator 2026, addressing SDG 13: Climate Action.

> Prototype notice: every product, source label, score, reward and environmental value in this repository is sample or estimated data. EcoMind scores are educational estimates, not certifications.

## The problem

Young shoppers often see incomplete and inconsistent sustainability information. Material composition, recycled content, packaging, carbon footprint and product life are difficult to compare during a purchase decision.

## The solution

EcoMind includes both a privacy-conscious browser-extension simulation inside the web app and a real installable Manifest V3 extension for the same generic online clothing demo. After the shopper activates the koala widget, EcoMind:

- structures the available product listing;
- calculates one transparent Green Score;
- separates score confidence from the score itself;
- shows sources and missing information;
- suggests an affordable, lower-impact local alternative;
- rewards meaningful actions through demo EcoPoints;
- saves wishlist and progress in browser local storage.

The first product analysis works without an account. A demo profile is requested only when the shopper saves progress or collects EcoPoints.

## Target users

Young people aged 15-24 who shop online, including frequent and occasional shoppers and people who do or do not currently consider environmental impact.

No survey results have been invented. The interface uses the placeholder: `Survey finding to be added after analysis.`

## MVP scope

- Clothing and fabric products only.
- Three local T-shirt samples: polyester, cotton and recycled/lower-impact blend.
- Generic online-store page, not Amazon branding.
- Local TypeScript product data. No scraping, retailer API or external database.
- Simulated browser-extension widget in a responsive React app.
- Installable Chrome extension built with Manifest V3 for the included demo product pages.
- Local storage instead of a backend or authentication service.

## Main journey

1. Open the product demo.
2. Select a local sample T-shirt.
3. Activate the collapsed koala widget.
4. See the analysis loading state and expanded score drawer.
5. Inspect the score breakdown, confidence, sources and missing fields.
6. Compare a lower-impact option side by side.
7. Save or choose the alternative.
8. Continue with a local demo profile only at this point.
9. Earn demo EcoPoints and unlock a koala level.
10. View the dashboard and wishlist.

## Tech stack

- React 19
- TypeScript
- Vite
- Maintainable custom CSS with semantic design tokens
- Phosphor Icons
- Browser local storage
- No paid APIs, environment variables, database or runtime network requests

## Run locally

Requirements: Node.js 20 or later and npm.

```bash
npm install
npm run dev
```

Open the local URL shown by Vite, normally `http://localhost:5173`.

Production build:

```bash
npm run build
npm run preview
```

## Install the Chrome extension

The extension analyses only the Amazon-style demo product pages in this project. It does not claim full compatibility with Amazon or other retailers.

1. Run the web application:

   ```bash
   npm install
   npm run dev
   ```

2. Run the production build for the extension:

   ```bash
   npm run build:extension
   ```

   Optional automated integration check:

   ```bash
   npm run test:extension
   ```

3. Open `chrome://extensions` in Chrome.
4. Enable **Developer mode**.
5. Select **Load unpacked**.
6. Choose the generated `dist-extension` directory inside this project.
7. Open the local web app and choose **Product demo**, or open [the deployed demo](https://ecomind-ai-two.vercel.app/#/demo).
8. Open the EcoMind AI extension popup and select **Analyse this product**.

The popup starts the analysis. Only then does `chrome.scripting` inject `content.js` into the active demo page. The content script reads the visible demo product name, price, description and material information, calculates the score locally, then injects the collapsed koala and drawer through Shadow DOM.

### Extension build output

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

`dist-extension` is generated and intentionally excluded from Git. Build it locally before using **Load unpacked**.

### Extension permissions

The Manifest V3 extension requests only:

- `activeTab`: temporary access to the page the user explicitly activates;
- `scripting`: inject the content script after the user selects **Analyse this product**;
- `storage`: save demo EcoPoints, wishlist items and preferences locally.

It requests no browsing-history permission, no broad host permission and no payment access. It sends no product information to an external server.

### Extension states

The popup and content script implement:

- Ready to analyse;
- Analysing;
- Successful analysis;
- Missing product data;
- Low confidence;
- Unsupported page;
- Analysis error.

Chrome extension state is stored under `ecomindExtensionState` in `chrome.storage.local`. When the injected extension and web dashboard share the same open demo tab, the content script also exposes a narrow in-page event bridge so the React dashboard can mirror the saved demo points and wishlist where technically practical.

## Green Score methodology

The deterministic formula is:

```text
Green Score = Material impact x 35%
            + Estimated carbon footprint x 25%
            + Recycled content x 20%
            + Durability and circularity x 10%
            + Packaging x 10%
```

Each factor is normalised from 0 to 100, multiplied by its fixed weight and rounded to the nearest whole number. The implementation lives in [`src/lib/scoring.ts`](src/lib/scoring.ts).

The current demo uses:

- fixed sample impact factors for polyester, cotton, recycled cotton and lyocell;
- a simple carbon scale: `100 - estimated kg CO2e x 12`, clamped to 0-100;
- the disclosed recycled percentage, or zero when it is not disclosed;
- the average of demo durability and circularity ratings;
- fixed sample factors for each packaging type.

Missing information is displayed as `Not disclosed`. Confidence is a separate label:

- High: most relevant fields are present.
- Medium: some values are missing or estimated.
- Low: important product details are unavailable.

Labour and people information is shown separately and does not affect the environmental score.

## Where AI is used

The prototype does not call a live AI model. It simulates AI functions with deterministic local logic:

- extracting material information from listing text;
- converting listing details into structured fields;
- flagging missing or uncertain values;
- producing a short plain-language score explanation;
- selecting a relevant alternative from the local dataset;
- presenting personalised education and challenges.

AI does not calculate the numeric Green Score. The published formula does.

## Project structure

```text
EcoMind-AI/
├── public/products/             # Original generated demo catalog images
├── src/
│   ├── components/              # Widget, drawer, comparison, mascot and shared UI
│   ├── data/products.ts         # Structured local product dataset
│   ├── lib/scoring.ts           # Deterministic score calculation
│   ├── pages/                   # Landing, store, dashboard, wishlist and policy pages
│   ├── state/EcoMindContext.tsx # Local profile, EcoPoints and wishlist state
│   ├── App.tsx                  # Hash-based prototype navigation
│   └── styles.css               # Design system, states and responsive layouts
├── extension/                   # Manifest V3 source, popup, worker, content script and icons
├── scripts/build-extension.mjs  # Reproducible dist-extension build
├── scripts/test-extension.mjs   # Injection, score and storage integration check
├── ASSUMPTIONS_AND_LIMITATIONS.md
├── DATA_REPLACEMENT_GUIDE.md
├── DEMO_SCRIPT.md
└── TESTING_CHECKLIST.md
```

## Local storage

The key `ecomind-ai-demo-state-v1` stores:

- demo sign-in state;
- EcoPoints;
- saved product IDs;
- completed action IDs;
- recent activity.

Use the browser developer tools to clear this key and reset the prototype.

## Current limitations

- The data model and scoring factors have not been independently reviewed.
- Product carbon values are sample or estimated data, not lifecycle assessments.
- Demo confidence is assigned in the local dataset rather than derived from a validated completeness model.
- The profile is simulated and has no security boundary.
- The alternative engine follows local `alternativeProductId` links.
- Estimated impact is directional and does not claim verified real-world savings.
- Product images were generated for the prototype and do not represent real products.
- The Manifest V3 extension is a demo build and is not published in the Chrome Web Store.
- The extension intentionally supports only EcoMind's included demo product pages, not real Amazon pages.

See [ASSUMPTIONS_AND_LIMITATIONS.md](ASSUMPTIONS_AND_LIMITATIONS.md) for the full list.

## Future development

- Review the scoring framework with textile lifecycle experts.
- Test comprehension, usefulness and tone with users aged 15-24.
- Validate the minimal-permission extension in a controlled pilot before supporting any additional sites.
- Integrate licensed textile and lifecycle datasets with provenance and versioning.
- Add country-specific repair, resale and recycling guidance.
- Build a confidence model from field coverage, source quality and freshness.
- Add moderation, appeals and correction workflows for brands and users.
- Conduct accessibility, privacy, security and bias reviews before release.

## Replacing demo data

Start with [`src/data/products.ts`](src/data/products.ts) and preserve the `Product` interface in [`src/types.ts`](src/types.ts). Do not write API responses directly into the UI. Instead:

1. map the external record into the internal `Product` shape;
2. preserve source name, URL, licence, retrieval date and field-level provenance;
3. represent missing values as `null`, never invented numbers;
4. validate material percentages and units;
5. calculate confidence from source quality and field coverage;
6. run the deterministic scoring function only after validation;
7. label estimates separately from supplier-listed or independently verified values.

The complete migration checklist is in [DATA_REPLACEMENT_GUIDE.md](DATA_REPLACEMENT_GUIDE.md).

## Documentation

- [2-3 minute demo script](DEMO_SCRIPT.md)
- [Assumptions and limitations](ASSUMPTIONS_AND_LIMITATIONS.md)
- [Testing checklist](TESTING_CHECKLIST.md)
- [Verification record](VERIFICATION.md)
- [Demo-data replacement guide](DATA_REPLACEMENT_GUIDE.md)
- [GitHub publishing details](GITHUB_PUBLISHING.md)

## Privacy and public repository safety

This repository contains no API keys, credentials, customer records, retailer order data or private survey responses. The original pasted project brief and local filesystem paths are not included. Runtime data remains local to the browser.

## Licence

MIT. Product names and rewards are fictional demo content. No retailer, streaming service, certification body or other company partnership is claimed.
