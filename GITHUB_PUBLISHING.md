# GitHub and deployment details

## Public repository

- Repository: [Yers1/ecomind-ai](https://github.com/Yers1/ecomind-ai)
- Visibility: Public
- Default branch: `main`
- Licence: MIT

Suggested description:

```text
Local-first EcoMind AI prototype with an installable Manifest V3 Chrome extension, transparent clothing Green Scores, greener alternatives, wishlist and demo EcoPoints.
```

Suggested topics:

```text
ecomind-ai
climate-action
sdg13
ai4good
teens-in-ai
react
typescript
vite
sustainability
manifest-v3
chrome-extension
hackathon
```

## Production deployment

- Provider: Vercel
- Production URL: [ecomind-ai-two.vercel.app](https://ecomind-ai-two.vercel.app)
- Deployment source: GitHub `main`

Vercel is connected to the GitHub repository. A push to `main` triggers the production deployment. The generated Chrome extension is intentionally not hosted or distributed as a Chrome Web Store package; build `dist-extension` locally with `npm run build:extension` and load it unpacked.

## Public-safety status

The repository contains no API keys, credentials, retailer customer data, payment data, private survey responses or runtime product-data uploads. Product images are generated demo assets, and environmental values are labelled sample, demo, listed-demo or estimated.
