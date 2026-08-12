# Real retailer testing record

Date: 12 August 2026

Public product pages below were opened in connected Chrome and their current DOM/structured product evidence was inspected. No account, cart, cookies, orders or unrelated tabs were read. Automated parser execution is covered separately by sanitized fixtures derived only from the relevant structures. A fresh interactive installation of the new build through `chrome://extensions` remains user-controlled and is not claimed here.

| Retailer | URL | Expected adapter | Product and price observed | Material evidence | Missing / uncertainty | Expected confidence and result | Manual correction |
|---|---|---|---|---|---|---|---|
| Amazon US | https://www.amazon.com/Amazon-Essentials-Classic-Fit-Short-Sleeve-Multipacks/dp/B0D8TGLHMB | `amazon` | Amazon Essentials Women's Classic-Fit Short-Sleeve V-Neck T-Shirt, Multipacks; localised price element detected | `56% Cotton, 37% Modal, 7% Elastane` in `#productFactsDesktopExpander` | Packaging, carbon and durability absent | Low; provisional score allowed because composition totals 100% | Not required for composition |
| Amazon UK | https://www.amazon.co.uk/dp/B09TPKBK4J | `amazon` | Amazon Essentials Men's Cotton Regular-Fit Short-Sleeve Crewneck T-Shirt; price absent for selected variation | `Heather: 60% Cotton, 40% Polyester; Others: 100% Cotton` | Composition depends on selected colour and is internally ambiguous | Low; score withheld until one variation's composition is confirmed | Recommended |
| H&M US | https://www2.hm.com/en_us/productpage.1264833033.html | `hm` | Cotton T-Shirt; `$14.99` | `Cotton 97%, Spandex 3%` in Material & Care | Recycled content, packaging, carbon and durability absent | Low; expected `~47/100`, range `13–86` | No |
| Nike US | https://www.nike.com/t/sportswear-mens-t-shirt-l3njS8/DZ2989-100 | `nike` | Nike Sportswear Men's T-Shirt; `$29.97` during test | `100% cotton` in Product Details | Recycled content, exact origin, packaging, carbon and durability absent | Low; expected `~48/100`, wide provisional range | No |
| United By Blue (Shopify) | https://unitedbyblue.com/products/the-mens-responsible-flannel | `shopify` | The Responsible Flannel; `$98.00` | `60% organic cotton, 40% REPREVE recycled polyester` | Carbon and durability absent | Medium; expected `~59/100`, range `34–78` | No |
| Nike footwear—missing full composition | https://www.nike.com/t/air-max-plus-mens-shoes-x9G2xF/HQ3824-001 | `nike` | Nike Air Max Plus Men's Shoes; `$142.97` in ProductGroup variant offer | Qualitative mesh/synthetic-leather wording; no percentage composition | Full composition, packaging, carbon and durability absent | Low; score withheld | Required before scoring |
| IKEA non-clothing boundary | https://www.ikea.com/us/en/p/lack-side-table-white-30449908/ | generic product detection | LACK Side table; `$16.99` | Furniture construction materials, not clothing composition | Outside the clothing/textile methodology | Category rejected; no score | Not applicable |
| Schema.org documentation boundary | https://schema.org/Product | `manual` fallback | Documentation page titled Product; no sale offer | None | Not a retail product detail page | Product not detected; no score | Optional manual fallback remains available |

## Selector observations

- Amazon US/UK currently exposed `#productTitle`, `.a-price .a-offscreen`, `#productFactsDesktopExpander`, `#detailBulletsWrapper_feature_div` and `#productDescription`. UK composition varied by colour wording.
- H&M exposed ProductGroup JSON-LD plus `#section-materialsAndCareAccordion`; current class names were hashed and therefore are not used as stable adapter selectors.
- Nike exposed ProductGroup JSON-LD and a visible heading named `Product Details`; a location chooser was also present, but the product DOM remained available.
- United By Blue exposed multiple Schema.org Product blocks, Open Graph product metadata and visible Details content on Shopify.
- IKEA exposed a real furniture product page and was inspected as the non-clothing category boundary. The generic test fixture confirms this kind of product is rejected before scoring.
- Schema.org's Product documentation page was opened as a non-product boundary; the sanitized non-product fixture confirms that a heading containing “Product” alone is not enough for automatic scoring.

## Honest testing boundary

The actual pages were opened and their visible DOM/structured evidence was inspected. Expected scores above are deterministic outputs for the observed normalized evidence, not a claim that the unpacked extension was clicked on every live URL. Production adapters were regression-tested against sanitized structures representing these fields. Chrome's protected extension-management page cannot be automated in this environment, so use the README checklist for the final interactive pass.

## Example developer diagnostic

For the H&M Cotton T-Shirt page observed above, the adapter path and normalized scoring input are expected to look like this (retailer markup can change):

```json
{
  "parserUsed": "hm",
  "matchedSignals": ["ProductGroup JSON-LD", "#section-materialsAndCareAccordion"],
  "rawEvidence": {
    "title": "Cotton T-Shirt",
    "price": "$14.99",
    "material": "Cotton 97%, Spandex 3%",
    "weight": "270 g"
  },
  "normalizedFields": {
    "materials": [
      { "name": "Cotton", "percentage": 97 },
      { "name": "Elastane", "percentage": 3 }
    ],
    "recycledContentPercentage": null,
    "packaging": null,
    "weightGrams": 270
  },
  "missingFields": ["recycledContent", "packaging", "carbon", "durability"],
  "score": "~47/100",
  "possibleRange": "13–86/100",
  "confidence": "Low"
}
```

The extension exposes equivalent live diagnostics only when `ecomind-debug=true` is present in the product URL or the local diagnostics preference is enabled. Normal users do not see raw diagnostics by default.
