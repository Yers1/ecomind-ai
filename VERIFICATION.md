# Verification record

Verified on 13 August 2026 against the production source.

## Automated commands

- `npm run lint` — passed with no errors.
- `npm run test` — passed shared core, engagement/accessibility, backend contract, parser regression and production extension-injection suites.
- `npm run build` — passed TypeScript and Vite production build. OCR is split into a separate lazy-loaded chunk; Vite reports a non-blocking main-chunk size warning.
- `npm run build:extension` — generated a Manifest V3 build in `dist-extension`.
- `npm run package:extension` — generated `release/ecomind-ai-chrome-extension.zip`.
- Package audit after adding OCR/ZIP tooling — 0 vulnerabilities.

The extension integration suite verifies the content-script-injected Shadow DOM widget, Amazon evidence extraction, provisional scoring, manual corrections, unsupported marketplaces, Threadly Demo Mode and wishlist/EcoPoints persistence across a simulated refresh. Manifest assertions verify only `activeTab`, `scripting` and `storage`, with no static content script or broad host/history permission.

## Real marketplace run

Five live Amazon US clothing product pages were opened and current visible product elements were passed to the production parser and shared scoring engine: 3 passed and 2 partially passed. One partial result had no complete percentage; the other contained variation-dependent Solids/Heathers compositions and now triggers a score-withholding safeguard. No CAPTCHA appeared. Exact URLs and fields are in [REAL_RETAILER_TESTING.md](REAL_RETAILER_TESTING.md).

Sanitised Amazon, H&M, Nike, Shopify, Schema.org and Threadly fixtures passed separately. Only Amazon US/UK is claimed as the live marketplace pilot; fixture passes are not counted as real compatibility.

## Mobile production-browser run

The production preview was exercised at exactly **390×844**:

1. Analyse page loaded with the six guided tasks.
2. Amazon URL validation and visible-text capture worked.
3. Extracted evidence appeared in the editable review step.
4. Confirmation produced `~47/100`, grade C, Amber/Mixed impact and Medium confidence from the shared engine.
5. Breakdown, missing/source evidence, alternative policy and privacy sections opened.
6. Task progress reached 6/6 and displayed the feedback link.
7. Document width remained within the viewport with no horizontal overflow.

The real screenshot upload control was also exercised. Local Tesseract OCR extracted `100% Cotton` and opened the review step. The test screenshot also demonstrated that OCR can misread a title, which is why the UI requires review and labels OCR as low/medium-confidence user-provided evidence.

## Honest remaining boundary

Chrome’s protected `chrome://extensions` screen cannot be automated by this environment. The manifest parses and the generated bundle passed integration tests, but a fresh human **Load unpacked** confirmation remains required. The official feedback-survey URL was not present in the repository; without `VITE_FEEDBACK_SURVEY_URL`, the final button opens a local-only fallback survey rather than inventing an external form.
