# Real marketplace validation record

Date: 13 August 2026

## Scope and method

The only marketplace claimed as supported is Amazon US/UK clothing product detail pages. Five real Amazon US product pages were opened in the connected browser. The production `amazon` parser and shared `scoreRealProduct` engine were run against the page elements visible in the current DOM. No account, cart, order, cookies, browsing history or unrelated tabs were inspected. No CAPTCHA was solved and no page content was submitted anywhere.

This is separate from the sanitised fixtures in `tests/fixtures`. A fixture pass is not counted as a live-page pass.

Classification:

- **Passed:** title and complete, unambiguous material composition extracted; provisional score available.
- **Partially passed:** product detected, but evidence was insufficient or variation-dependent, so score was withheld.
- **Failed:** product DOM unavailable/blocked or the parser could not identify a product.

## Results

| Result | Real URL | Visible evidence extracted | Shared-engine result | Missing / limitation |
|---|---|---|---|---|
| Passed | https://www.amazon.com/Amazon-Essentials-Classic-Fit-Short-Sleeve-Multipacks/dp/B0D8TGLHMB | Title; localised price; 56% Cotton, 37% Modal, 7% Elastane; care; origin | ~50/100, grade C, Amber/Mixed impact, Low confidence | Recycled content, both packaging stages and weight not disclosed |
| Partially passed | https://www.amazon.com/Amazon-Essentials-Slim-Fit-Short-Sleeve-Crewneck/dp/B0CD86ZVRS | Title; localised price; `Solids: 100% Cotton; Heathers: 60% Cotton, 40% Polyester` | Score withheld after the new variation safeguard | User must confirm the selected colour/style composition; packaging and recycled content absent |
| Partially passed | https://www.amazon.com/SheIn-Womens-Sexy-Polka-Sheer/dp/B07JYX55ML | Title; localised price; Polyester named without a reliable percentage in the extracted field | Score withheld, Grey/Not enough information, Low confidence | Complete percentage composition, origin, packaging, recycled content and weight absent |
| Passed | https://www.amazon.com/SheIn-Womens-Sleeve-Square-Multicolor/dp/B09VGDNXQF | Title; localised price; 100% Polyester; care; origin | ~29/100, grade D, Red/Higher impact, Low confidence | Recycled content, both packaging stages and weight absent |
| Passed | https://www.amazon.com/Amazon-Essentials-Mens-Slim-fit-Stretch/dp/B07K4FX4WZ | Redirected to the current variation; title; localised price; 98% Polyester, 2% Elastane; care; origin | ~29/100, grade D, Red/Higher impact, Low confidence | Page wording did not independently verify the search-indexed recycled claim; both packaging stages and weight absent |

Summary: **3 passed, 2 partially passed, 0 blocked failures** in this run.

## Important observations

- Prices were localised for the test location. The parser used the displayed value; this has no effect on the Green Score.
- Amazon displayed repeated detail blocks. The parser deduplicates normalised materials, but a page can still describe several colour-dependent compositions. The new `Solids / Heathers / Others / Colours / Styles` safeguard marks these uncertain and withholds a score.
- No inspected page disclosed both manufacturer and fulfilment packaging. EcoMind correctly left them separate and unknown.
- Certification claims are not upgraded from seller wording to independent verification. The redirected golf-pant page did not visibly provide the independently verifiable evidence required for a bonus, so no bonus was added.
- These results are a dated compatibility sample, not a promise that all Amazon clothing pages work.

## Demo-only and regression-only coverage

- Threadly products, complete scores, designed alternatives and predictable success/error states are Demo Mode.
- H&M, Nike, Shopify, generic JSON-LD and malformed-page cases are sanitised regression fixtures only in this build.
- Chrome’s **Load unpacked** confirmation is still a user-controlled check because `chrome://extensions` is a protected browser page.

## Repeat the live test

1. Build and load `dist-extension` using the README.
2. Open each URL above without signing in.
3. Select **Analyse this product**.
4. Compare the drawer’s extracted title, composition and sources with what is visibly rendered.
5. Record Passed/Partially passed/Failed without correcting the page first.
6. If a variation changes, re-analyse and record the final URL/ASIN.
7. Record any CAPTCHA or access block as Failed—do not bypass it.
