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
- [ ] Saving or choosing prompts for a profile only after the first analysis.
- [ ] Continuing as the demo user completes the pending action.
- [ ] Choosing the alternative awards 35 demo EcoPoints once.
- [ ] Koala progression updates after enough points.

## Prototype states

- [ ] Widget idle/collapsed state works.
- [ ] Loading state works.
- [ ] Success state works.
- [ ] Normal-state control resets the widget.
- [ ] Test-error control shows the error state.
- [ ] Error-state retry returns to loading and success.
- [ ] Cotton sample shows low confidence and missing data.
- [ ] Recycled sample shows high confidence.
- [ ] Empty wishlist state is clear and actionable.
- [ ] Saved wishlist state shows score and confidence.
- [ ] Removing a wishlist item works.
- [ ] Wishlist comparison works.

## EcoPoints and dashboard

- [ ] Saving an eligible lower-impact product awards 15 points once.
- [ ] Saving a higher-impact product does not award points.
- [ ] Choosing an alternative awards 35 points once.
- [ ] Repair challenge awards 25 points once.
- [ ] No-buy challenge awards 30 points once.
- [ ] Dashboard trend is labelled sample data.
- [ ] Impact copy avoids exact verified-savings claims.
- [ ] Recent activity updates.
- [ ] Page reload preserves wishlist, points and activity.
- [ ] Clearing `ecomind-ai-demo-state-v1` resets progress.

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
- [ ] The popup reports unsupported pages without injecting the widget.
- [ ] The demo page initially contains no extension widget.
- [ ] Selecting **Analyse this product** injects `content.js` through `chrome.scripting`.
- [ ] The injected widget is rendered inside a Shadow DOM root.
- [ ] Product name, price, description and material text come from the visible demo page.
- [ ] The extension Green Score matches the web scoring formula.
- [ ] Missing-data and low-confidence states are visible for the cotton demo.
- [ ] Saving adds an item to the extension wishlist.
- [ ] Choosing the alternative awards demo EcoPoints only once.
- [ ] Wishlist and points remain in `chrome.storage.local` after refreshing the demo page.
- [ ] Reopening the popup shows the persisted EcoPoints total.
- [ ] The dashboard mirrors extension state when the content-script bridge is active.
- [ ] No product data is sent over the network by the extension.
