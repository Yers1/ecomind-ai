# EcoMind AI: real-product demo script

## 0:00–0:20 — Set the context

“Clothing information is scattered across descriptions, specification accordions and structured metadata. EcoMind AI is a privacy-conscious browser extension that turns the evidence on the active page into a transparent provisional result.”

Open a real H&M, Nike, Amazon or Shopify clothing product page. Keep Threadly ready in another tab as the stable offline fallback.

## 0:20–0:50 — Activate locally

Open the EcoMind popup.

“The popup can recognise a retailer from the current URL, but EcoMind has not read the page. Temporary access starts only when I click **Analyse this product**.”

Select the button, then open the injected koala.

“A retailer-specific adapter enriches shared Schema.org and visible-page fallbacks. No page contents are sent to a server.”

## 0:50–1:25 — Review evidence and uncertainty

Expand **See what EcoMind extracted**.

“Every field keeps its original value, source location and reliability tier. Retailer evidence, page-text extraction, user values and EcoMind estimates never get merged into one unlabeled claim.”

Point out material composition, price and care/origin if present. Then show the breakdown.

“Material evidence can feed a labelled prototype range. Carbon and durability stay unknown without evidence. The fixed formula calculates the midpoint; AI does not invent the score.”

## 1:25–1:45 — Manual correction

On a product with incomplete composition, open **Help EcoMind complete this analysis**.

Paste or enter the composition and rerun.

“This value is visibly marked **Provided by user**. If I mark a field not disclosed, EcoMind keeps it unknown rather than zero.”

Point to the traffic-light result.

“The icon, label, score, grade and confidence all communicate the result, so colour is never the only signal. Green means lower impact under this prototype methodology—not impact-free and not a certification. Incomplete evidence stays provisional, and unreliable evidence produces a grey result.”

## 1:45–2:10 — Cross-retailer comparison

Select **Save for comparison**, open a second real product on another store and analyse it.

“EcoMind compares two products that I actually analysed. It does not pretend a fictional Threadly product is a real recommendation, and it stores only the extracted fields required for comparison.”

Select **Record real-product comparison** to add +5 demo EcoPoints.

## 2:10–2:30 — Show voluntary progress

Open the web dashboard, then the leaderboard.

“EcoPoints reward meaningful actions such as comparing, saving a lower-impact option or recording a repair. Scans and purchases earn nothing. Joining the local leaderboard is optional, fictional participants are labelled as sample data, and traffic-light colours are never used to judge people or rank positions.”

## 2:30–2:45 — Close honestly

“EcoMind requests no browsing-history, payment, cookie or all-sites permission. Retailer support is best-effort, the weights need expert validation, and every score is provisional—not a certification.”

## Reliable fallback

If a live retailer blocks access or changes its DOM, open `https://ecomind-ai-two.vercel.app/#/demo`. Threadly preserves the deterministic presentation flow and regression fixture without implying Amazon branding.
