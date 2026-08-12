# Assumptions and limitations

## Product assumptions

- The hackathon MVP focuses on T-shirts displayed in a generic online store.
- Currency is GBP for the demo.
- The Manifest V3 extension analyses only the active EcoMind demo product page after explicit activation.
- The first analysis should work without an account.
- A local demo profile is enough to show gated saving and EcoPoints behaviour.
- EcoPoints thresholds are 0-14 for Starter Koala, 15-39 for Eco Explorer and 40 or more for Climate Champion.
- Demo rewards have no monetary value and no partner backing.
- A “similar price” alternative may cost a small amount more, with the difference stated clearly.

## Data assumptions

- All three products are fictional.
- Prices, material shares, product descriptions, ratings, reviews and footprint values are demo data.
- Carbon values are product-level estimates for demonstration only.
- Material impact factors are prototype assumptions, not peer-reviewed lifecycle factors.
- Durability and circularity values are demo ratings.
- Confidence labels are calculated deterministically from required-field completeness.
- Source labels name demo inputs and do not represent live integrations.
- Product images are original AI-generated catalog assets created for this prototype.

## Scoring limitations

- The score is not a lifecycle assessment, environmental product declaration or certification.
- Material factors do not account for geography, energy mix, dyeing, finishing, transport, care or end-of-life outcomes.
- The carbon formula is intentionally simple and needs expert validation.
- Missing factors remain `null`, reduce confidence and are excluded from the provisional midpoint calculation rather than being treated as confirmed zero.
- Incomplete records show an approximation mark and a score range spanning the minimum and maximum contribution of unknown factors.
- Score thresholds and letter grades need comprehension and behaviour-change testing.
- Labour ethics is excluded from the environmental score and shown separately.

## AI limitations

- No live AI model is called.
- Extraction, explanations and alternative matching are simulated with deterministic local logic.
- A production AI system would need grounded outputs, citations, field-level provenance and strong refusal behaviour when information is absent.
- A production system should never use model-generated sustainability facts as evidence.

## Impact and incentives limitations

- The dashboard trend is labelled sample data.
- The impact summary is directional and does not claim exact verified savings.
- EcoPoints are demo rewards only.
- The prototype does not verify purchases, repairs, reuse or no-buy decisions.
- Reward design needs abuse testing and should avoid encouraging extra consumption.

## Privacy and security limitations

- Local storage is convenient but is not a secure account system.
- The demo profile does not authenticate a real person.
- The web prototype does not request browser-extension permissions.
- The installable extension uses temporary `activeTab` access and supports only the included EcoMind demo product pages.
- The optional dashboard bridge works while the injected content script is active in the same demo tab. Chrome extension storage is not directly readable by ordinary web pages.
- A production extension needs minimum permissions, retention controls, deletion controls, security review and a clear privacy notice.
- The repository contains no secrets or personal user data.

## Research limitations

- No survey statistics are included because none were supplied.
- The empty `src/data/surveyInsights.ts` data source is the only survey placeholder; no public survey section is rendered until verified findings are added.
- The prototype has not yet been validated with users aged 15-24.
- Accessibility was designed into the prototype but still needs testing with assistive technologies and real users.
