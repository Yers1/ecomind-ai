# EcoMind AI testing checklist

## Setup

- [ ] `npm install` completes without errors.
- [ ] `npm run build` completes without TypeScript or Vite errors.
- [ ] The app opens without environment variables or network calls.
- [ ] All three local product images load.

## Main pitch journey

- [ ] Landing page primary button opens the product demo.
- [ ] The koala widget is visible on the product page.
- [ ] The initial widget does not claim to have analysed the page.
- [ ] Activating the widget displays the loading state.
- [ ] The drawer opens after analysis.
- [ ] Green Score, grade and status are visible within a few seconds.
- [ ] Every score factor includes its value, detail and weight.
- [ ] Confidence is visible and separate from the score.
- [ ] Missing fields say `Not disclosed`.
- [ ] Source labels are visible.
- [ ] The alternative card uses supportive, non-judgemental language.
- [ ] Compare opens a side-by-side product comparison.
- [ ] Price, materials, recycled content, carbon, packaging, confidence, advantage and trade-off are included.
- [ ] Saving prompts for a profile only after the first analysis.
- [ ] Continuing as the demo user completes the pending action.
- [ ] Comparing the alternative awards 5 demo EcoPoints once.
- [ ] Saving the lower-impact alternative awards another 5 demo EcoPoints once.
- [ ] Koala progression updates after enough points.

## Prototype states

- [ ] Widget idle/collapsed state works.
- [ ] Loading state works.
- [ ] Success state works.
- [ ] Developer controls are absent in the public demo.
- [ ] `?debug=true` or development mode reveals the normal/error controls.
- [ ] Test-error control shows the error state.
- [ ] Error-state retry returns to loading and success.
- [ ] Cotton sample shows low confidence and missing data.
- [ ] Recycled sample shows high confidence.
- [ ] Empty wishlist state is clear and actionable.
- [ ] Saved wishlist state shows score and confidence.
- [ ] Removing a wishlist item works.
- [ ] Wishlist comparison works.

## EcoPoints and dashboard

- [ ] Saving an eligible lower-impact product awards 5 points once.
- [ ] Saving a higher-impact product does not award points.
- [ ] Comparing an alternative awards 5 points once.
- [ ] Repair/reuse challenge awards 20 points once and is labelled self-reported.
- [ ] No-buy challenge awards 25 points once and is labelled self-reported.
- [ ] Dashboard trend is labelled sample data.
- [ ] Traffic status is hidden before analysis and appears afterward with icon, text, confidence and accessible label.
- [ ] 27 is Red/Higher impact, ~51 is Amber/Mixed impact and 78 is Green/Lower impact.
- [ ] Missing or unsupported evidence is Grey/Not enough information.
- [ ] Methodology, drawer and popup contain the traffic-light legend.
- [ ] Leaderboard opt-in accepts a safe nickname and rejects contact information/HTML.
- [ ] Weekly/monthly/all-time tabs update from the same point events as the dashboard.
- [ ] Scans and purchases award no points; duplicate and capped actions do not award again.
- [ ] Weekly challenges can be claimed only once; self-reported items are labelled.
- [ ] Leaving removes the local leaderboard profile without deleting wishlist or private activity.
- [ ] At 390px, ranking rows become stacked cards with no horizontal overflow.
- [ ] Impact copy avoids exact verified-savings claims.
- [ ] Recent activity updates.
- [ ] Page reload preserves wishlist, points and activity.
- [ ] Clearing `ecomind-ai-demo-state-v2` resets progress.

## Accessibility

- [ ] All interactive elements are reachable by keyboard.
- [ ] Focus indicators are visible.
- [ ] Widget button has a meaningful accessible label in every state.
- [ ] Drawer and modal use dialog semantics and support Escape to close.
- [ ] Buttons have clear text or accessible labels.
- [ ] Score meaning is communicated with text and grade, not colour alone.
- [ ] Product images have useful alternative text where they carry meaning.
- [ ] Decorative images use empty alternative text.
- [ ] Heading order is logical.
- [ ] Content remains readable at 200 percent zoom.
- [ ] Reduced-motion preference disables non-essential motion.
- [ ] Contrast is checked with an automated tool and manual review.

## Responsive and browser checks

- [ ] Desktop at 1440 x 900.
- [ ] Small laptop at 1280 x 720.
- [ ] Tablet at 768 x 1024.
- [ ] Mobile at 390 x 844.
- [ ] No horizontal overflow.
- [ ] Widget remains reachable on mobile.
- [ ] Drawer fits the viewport and scrolls internally.
- [ ] Comparison remains readable on mobile.
- [ ] Chrome latest.
- [ ] Edge latest.
- [ ] Firefox latest.
- [ ] Safari latest if available.

## Privacy and content

- [ ] No API keys, credentials or personal data are present.
- [ ] No Amazon branding or customer-order claims appear.
- [ ] No official partner or discount claims appear.
- [ ] Every environmental value is marked sample, demo, listed-demo or estimated where appropriate.
- [ ] Scores are described as estimates, not certifications.
- [ ] People information is separate from the Green Score.
- [ ] The public repository does not include the original brief, attachments or local filesystem paths.

## Chrome extension

- [ ] `npm run build:extension` creates `dist-extension`.
- [ ] `npm run test:extension` passes the production content-script injection and persistence checks.
- [ ] `dist-extension/manifest.json` parses and declares Manifest V3.
- [ ] Chrome accepts `dist-extension` through **Load unpacked** without manifest errors.
- [ ] The manifest requests only `activeTab`, `scripting` and `storage`.
- [ ] No `history`, broad host or payment-related permission is requested.
- [ ] The popup distinguishes Amazon, known retailer, generic possible-product and restricted-page hints without reading page contents before activation.
- [ ] A page initially contains no extension widget.
- [ ] Selecting **Analyse this product** injects `content.js` through `chrome.scripting`.
- [ ] The injected widget is rendered inside a Shadow DOM root.
- [ ] Product name, price, description and material text come from the visible demo page.
- [ ] The extension Green Score matches the web scoring formula.
- [ ] Missing-data and low-confidence states are visible for the cotton demo.
- [ ] Saving adds an item to the extension wishlist.
- [ ] Comparing and saving the lower-impact alternative each award 5 demo EcoPoints only once.
- [ ] Wishlist and points remain in `chrome.storage.local` after refreshing the demo page.
- [ ] Reopening the popup shows the persisted EcoPoints total.
- [ ] The dashboard mirrors extension state when the content-script bridge is active.
- [ ] No product data is sent over the network by the extension.

## Real product parsers

- [ ] `npm run test:parsers` passes every sanitized fixture.
- [ ] Amazon US/UK selector fallbacks extract title, price, image, ASIN, features and labelled detail rows.
- [ ] H&M, Nike and Shopify adapters enrich structured data without duplicating generic parsing.
- [ ] Generic JSON-LD handles Product, ProductGroup and nested `@graph` records.
- [ ] Open Graph and `itemprop` fallback works when JSON-LD is absent or malformed.
- [ ] Material synonyms normalise while original evidence remains visible.
- [ ] Percentage ranges or totals outside 95–105% are marked uncertain.
- [ ] No material composition produces a withheld score and manual next action.
- [ ] Manual corrections are labelled `Provided by user` and recalculate the result.
- [ ] Non-clothing Product data is rejected by the clothing methodology.
- [ ] A product title/identifier/variation change marks the result outdated.
- [ ] Two saved real products from different retailers can be compared.
- [ ] Only extracted comparison fields—not full webpage HTML—are persisted.
