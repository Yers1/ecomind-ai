# EcoMind AI

EcoMind AI is a testable cross-device sustainability-evidence prototype for clothing. It has two interfaces powered by the same deterministic Green Score engine:

- a Manifest V3 Chrome extension for user-activated extraction from the currently visible Amazon US/UK product page;
- a mobile-friendly web flow for a product URL plus pasted visible text or local screenshot OCR.

**Live web prototype:** [https://ecomind-ai-two.vercel.app](https://ecomind-ai-two.vercel.app)

**No-GitHub tester installation page:** [https://ecomind-ai-two.vercel.app/#/install](https://ecomind-ai-two.vercel.app/#/install)

**Demo Mode:** the fictional Threadly products are sanitised fixtures. They demonstrate complete UI states; they are not proof of retailer compatibility.

> Every score is a provisional educational estimate, not a certification or lifecycle assessment. Missing evidence remains unknown. No retailer partnership is claimed.

## What is genuinely supported

The only claimed live marketplace pilot is **Amazon US and Amazon UK clothing product detail pages**. Support is best-effort because Amazon can change markup, localise content, redirect variations or present access challenges. Five real pages were checked separately from fixtures; see [REAL_RETAILER_TESTING.md](REAL_RETAILER_TESTING.md).

H&M, Nike, Shopify and generic Schema.org parsers remain useful regression fixtures and future adapter work. They are **not claimed as live-supported marketplaces** in this build. Other sites receive an honest unsupported-page state.

## Shared Green Score methodology

Both interfaces call the same code in `shared/realProductScoring.ts`, with shared weights in `shared/ecomind.ts` and traffic-light thresholds in `shared/trafficLight.ts`:

```text
Material impact × 35%
+ estimated carbon × 25%
+ recycled content × 20%
+ durability and circularity × 10%
+ fulfilment packaging × 5%
+ manufacturer packaging × 5%
+ independently relevant verified certification adjustment (0 to +3)
```

Visible retailer text is seller-provided page evidence, not independent verification. User corrections and screenshot OCR are labelled user-provided. EcoMind estimates are labelled as estimates. Unavailable fields say `Not disclosed`; they are never converted to confirmed zeroes. Variation-dependent wording such as `Solids / Heathers / Colours` blocks scoring until the selected composition is confirmed.

OEKO-TEX® STANDARD 100 is recognised as chemical-safety evidence and adds no environmental points. OEKO-TEX® MADE IN GREEN is recognised as multi-criteria evidence, but its small prototype adjustment is available only after a product-specific ID is confirmed through the official OEKO-TEX Label Check. A seller claim alone adds zero.

Traffic-light thresholds are 70–100 Green/lower impact, 40–69 Amber/mixed impact, 0–39 Red/higher impact, and Grey/not enough information. Colour is always accompanied by an icon, label, score or range, grade where applicable, confidence and accessible text.

## Run the website

Requirements: Node.js 20+, npm and a current Chromium browser.

```powershell
npm ci
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. Select **Analyse a product**. At 390×844 the complete flow is:

1. Paste an Amazon US/UK clothing URL, or leave it blank when using only a screenshot.
2. Paste visible product text or select **Upload screenshot**.
3. Review and correct product name, material, recycled content, certification wording and both packaging stages.
4. Confirm the evidence to calculate with the shared engine.
5. Open score breakdown, missing data, alternative and privacy sections.
6. Select **EcoMind Prototype Feedback**.

The web app deliberately does not fetch another marketplace across origins. Screenshot OCR is started only after the user selects a file. The image stays in the browser; Tesseract may download its worker/language model assets, but the product image is not uploaded to an EcoMind server.

Configure the team’s official survey link in `.env.local`:

```text
VITE_FEEDBACK_SURVEY_URL=https://your-survey.example/form
```

Without that variable, the final button opens a clearly labelled local-only fallback form that saves a draft locally and copies it for manual submission. No survey URL was present in the project, so one is not invented.

## Build, install and test the Chrome extension

```powershell
npm run build:extension
```

Then:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose this project’s `dist-extension` directory.
5. Open an Amazon US/UK clothing product detail page.
6. Open EcoMind AI and select **Analyse this product**.
7. Select the injected koala to inspect product name, materials, certification evidence, fulfilment packaging, manufacturer packaging, score, grade, traffic light, confidence and missing data.
8. Save the item or analyse a second real product for comparison.

After analysis, EcoMind appears as a compact score pill rather than opening over the shop. Select it to open the drawer; use **−** to minimise or **Hide on this page** to remove it temporarily. If hidden, select the EcoMind toolbar icon and **Open EcoMind analysis** to restore it. In the popup you can disable automatic appearance and choose Koala, Panda, Polar Bear, Leaf or Sprout. Both preferences persist in `chrome.storage.local`.

The extension requests only `activeTab`, `scripting` and `storage`. It has no static content script, broad host permission or browsing-history permission. The content script is injected only after the user’s action. Page contents are processed locally and are not sent to a product-analysis server.

To test fixtures, open **Demo Mode** on the web app and analyse a Threadly product. The popup labels Threadly as Demo Mode.

After source changes, rebuild, select **Reload** on `chrome://extensions`, and refresh the page.

## Downloadable extension ZIP

Build the installable archive with:

```powershell
npm run package:extension
```

Output: [`release/ecomind-ai-chrome-extension.zip`](release/ecomind-ai-chrome-extension.zip). Unzip it first, then load the extracted directory through **Load unpacked**. Chrome cannot load the ZIP directly.

The same generated file is copied to `public/downloads/` and deployed at `https://ecomind-ai-two.vercel.app/downloads/ecomind-ai-chrome-extension.zip`, so testers do not need GitHub.

The Vercel production build also runs `package:extension`. After the public Supabase variables are configured in Vercel and a new deployment is created, the direct-download ZIP is automatically rebuilt with the same Supabase project URL, public anon/publishable key and one exact Supabase host permission. No service-role key is used.

## Guided prototype test

The **Analyse a product** page visibly tracks six respondent tasks:

1. analyse a clothing product;
2. understand the score and traffic light;
3. open the score breakdown;
4. identify missing data and evidence sources;
5. view the higher-scoring-alternative policy or Demo comparison;
6. review privacy.

The final feedback link appears after all six tasks, while a persistent finish button remains available in the result.

## Verification commands

```powershell
npm run lint
npm run test
npm run build
npm run build:extension
npm run package:extension
```

`npm run test` covers the shared formula, traffic-light accessibility, backend contract, parser fixtures, content-script injection, unsupported pages, manual correction and `chrome.storage.local` persistence. Passing fixtures prove regression behaviour only; they do not prove live compatibility.

The production web flow was also exercised in a browser at exactly 390×844 with no horizontal overflow: URL check → visible-text extraction → review/correction → shared score → all six guided tasks → feedback link. A generated screenshot was uploaded and processed through the actual local OCR path; material composition was extracted and the review step appeared.

The live leaderboard uses a dedicated Supabase project with version-controlled tables, RLS policies and server-owned EcoPoint rules. Account creation and sign-in use a private email plus a password of at least 10 characters. Email is never a public leaderboard field. Joining is a separate opt-in action; an account can remain private, leave the leaderboard without losing private points, or delete all backend account data.

## Preserved product areas

The existing Demo Mode, wishlist, dashboard, EcoPoints, multi-user leaderboard contract, authentication setup and local stored data remain in place. The extension uses `chrome.storage.local`; the web guest experience uses local storage. Cross-device totals require the optional Supabase setup and a separate sign-in in each interface; see [SUPABASE_SETUP.md](SUPABASE_SETUP.md). Production does not invent leaderboard users when the backend is unconfigured.

## Retailer Insights Demo

Open `/#/insights` or select **Retailer Insights Demo** in the footer. This is a future B2B interface made entirely from fictional aggregate sample values. It is not connected to real users, retailers or analytics and contains no names, emails, browsing history, purchase histories or individual-level records. The page includes preferred materials, recycled-versus-virgin fibres, packaging preferences, certification interest, second-hand demand and compared categories. Its **Download sample CSV** action downloads `ecomind-retailer-insights-demo.csv`, which labels every row as `fictional_demo`.

## Known limitations

- Amazon is the only claimed live marketplace, and support is best-effort rather than universal.
- A URL alone cannot give the mobile web app cross-origin access to the product page; the user must paste visible evidence or upload a screenshot.
- OCR can misread titles and values, so review is mandatory. It is evidence capture, not independent verification.
- Amazon variation text can describe several compositions; EcoMind withholds the score until one is confirmed.
- Seller-provided certification wording is not treated as independently verified and adds no environmental points.
- Packaging, carbon and durability are commonly absent and remain unknown.
- The app does not provide barcode scanning because clothing barcodes rarely contain enough sustainability evidence.
- No live retailer, lifecycle or certification-provider API is connected.
- Chrome’s protected `chrome://extensions` installation screen remains a user-controlled final check.
- The official feedback survey URL must be supplied by the team through `VITE_FEEDBACK_SURVEY_URL`.

For release copy and Chrome Web Store steps, see [CHROME_WEB_STORE_RELEASE.md](CHROME_WEB_STORE_RELEASE.md). For the exact live evidence record, see [REAL_RETAILER_TESTING.md](REAL_RETAILER_TESTING.md). MIT licensed.
