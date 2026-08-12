# Verification record

Verified on 12 August 2026 against the presentation-ready source.

## Commands executed

- `npm install` — passed; 190 packages audited, 0 vulnerabilities.
- `npm run lint` — passed with 0 errors and 0 warnings.
- `npm run build` — passed TypeScript and Vite production build; 4,596 modules transformed.
- `npm run build:extension` — generated `dist-extension`.
- `npx tsc -p extension/tsconfig.json --noEmit` — passed extension TypeScript checks.
- `npm run test` — passed shared-core, parser and production extension integration suites.

## Automated behaviour covered

- deterministic complete scores (27 and 78);
- unknown fields remain `null` rather than confirmed zero;
- provisional cotton score, range and Low confidence;
- shared structured source metadata;
- production content-script injection and Shadow DOM widget;
- Amazon, H&M, Nike, Shopify, Threadly, JSON-LD and meta/itemprop adapter selection;
- malformed structured data, alternate material wording and percentage normalisation;
- ready, analysing, successful, missing-data, low-confidence, unsupported, unsupported-category, product-changed and error paths;
- manual corrections labelled as user-provided, with opt-in persistence;
- real cross-retailer comparison and the clearly labelled Threadly demo comparison;
- wishlist and EcoPoints persistence;
- duplicate reward prevention.

## Browser journey

The local development and production builds were exercised in connected Chrome:

1. Threadly opened without the EcoMind site navigation.
2. Public production mode hid **Normal state** and **Test error**.
3. Product-selector cards showed image, name and price without a Green Score.
4. Activating EcoMind showed loading and opened the analysis drawer.
5. Performance Tee showed 27/100, grade D and Medium confidence.
6. **See what AI extracted** exposed the exact listing text and structured fields.
7. The drawer displayed source labels, missing fields and clearly labelled Threadly demo-alternative actions.
8. Comparison showed Performance Tee against Renew Loop Tee.
9. Compare and save actions produced exactly 10 demo EcoPoints in total.
10. The dashboard showed one analysis, one comparison, one saved alternative and matching activity.
11. Refresh preserved the dashboard totals and wishlist.
12. Cotton Tee showed `~51/100`, Low confidence and a 35–66 range.
13. Renew Loop Tee showed 78/100 and High confidence without a provisional label.
14. The forced error state appeared and retry recovered to a successful result.
15. Escape/focus behaviour, inert background, unique action labels and horizontal overflow at the connected desktop viewport were checked through DOM state, not only visual inspection.
16. Landing, methodology and privacy pages were opened in the production preview and their required content was confirmed.
17. The updated local landing page was re-opened in connected Chrome after the multi-retailer changes; navigation and the complete Threadly analysis drawer were exercised successfully.

The connected Chrome surface was 1536 × 720 and did not expose a viewport-resize control. Responsive CSS includes breakpoints at 1050, 820 and 560 pixels; the 390 × 844 drawer layout should receive a final manual device-toolbar check before presenting. This record does not claim that exact viewport was interactively tested.

## Manifest and privacy

- Manifest version is 3.
- Permissions are exactly `activeTab`, `scripting` and `storage`.
- There are no `host_permissions`, history, payment, cookie or network permissions.
- No static content script is registered; the popup calls `chrome.scripting.executeScript` only after user activation.
- The content script runs only after the popup action and then selects a retailer-specific, generic structured-data or manual adapter.
- Product extraction, score calculation, manual correction and persistence run locally.
- Manifest assertions are part of `test:extension`: exactly the three permissions above, no `host_permissions`, and no static `content_scripts` registration.

## Real-retailer validation

- Current public product DOM was inspected in connected Chrome for Amazon US, Amazon UK, H&M US, Nike US and United By Blue (Shopify).
- A Nike footwear page with missing percentage composition was included specifically to verify the score-withheld boundary.
- Sanitized fixtures derived from only the relevant structures run through the actual production parser bundle in automated tests.
- Details and the honest interactive-installation boundary are recorded in `REAL_RETAILER_TESTING.md`.

## Chrome installation boundary

The generated manifest parses and the complete production bundle is ready in `dist-extension`. Browser automation cannot control Chrome's protected `chrome://extensions` page, so this verification does not claim a fresh interactive **Load unpacked** installation. Follow the exact README steps for that final user-controlled confirmation.
