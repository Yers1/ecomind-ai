# Verification record

Verified on 12 August 2026 against the production source on `main`.

## Automated checks

- `npm run build`: passed TypeScript and Vite production build.
- `npm run build:extension`: generated the complete `dist-extension` directory.
- `npx tsc -p extension/tsconfig.json --noEmit`: passed extension TypeScript checks.
- `npm run test:extension`: passed production `content.js` injection, Shadow DOM widget, deterministic score, success and unsupported states, wishlist persistence, EcoPoints persistence and duplicate-reward prevention.
- `npm run lint`: passed with no errors.
- Google Chrome 151 successfully packed the generated extension into a CRX without manifest errors.

## Manifest and privacy checks

- Manifest version is 3.
- Permissions are limited to `activeTab`, `scripting` and `storage`.
- No `host_permissions`, `history`, payment, cookies or network permission is declared.
- The manifest does not auto-register a content script. The popup calls `chrome.scripting.executeScript` only after the user selects **Analyse this product**.
- The content script accepts only pages containing EcoMind's explicit `data-ecomind-demo-product="true"` marker.
- Product interpretation, Green Score calculation, recommendations and persistence run locally.

## Web prototype check

The local production source was opened in Chrome at the demo route. Activating the web prototype displayed the loading flow, a score of 27/100 for the polyester sample, grade D, medium confidence, all five weighted factors, missing fields and the 78/100 greener alternative.

## Final interactive installation

Chrome protects `chrome://extensions` from automated browser control. The generated extension passed Chrome's pack/manifest validation; use the exact **Load unpacked** steps in the README for the final interactive installation confirmation.
