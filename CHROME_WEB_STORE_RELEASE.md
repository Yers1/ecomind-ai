# Chrome Web Store release guide

This guide is for the first public EcoMind AI release. Chrome Web Store publication cannot be completed by a coding agent because the owner must register a developer account, accept Google's terms, complete the privacy declarations and submit the item for review.

Official references:

- [Register a developer account](https://developer.chrome.com/docs/webstore/register/)
- [Prepare an extension package](https://developer.chrome.com/docs/webstore/prepare/)
- [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish/)
- [Create an accurate listing](https://developer.chrome.com/docs/webstore/best-listing)
- [Chrome Web Store user-data policy](https://developer.chrome.com/docs/webstore/user_data)

## 1. Test the unpacked build first

From PowerShell in the repository:

```powershell
npm install
npm run lint
npm run test
npm run build:extension
```

Load `dist-extension` through `chrome://extensions` and run the Threadly, supported real-product, missing-data and unsupported-page checks from `README.md`.

## 2. Create the upload ZIP

The release command creates a ZIP with `manifest.json` at its root:

```powershell
npm run package:extension
```

Upload `release\ecomind-ai-chrome-extension.zip`. Open it first and confirm that `manifest.json`, `background.js`, `content.js`, `popup.html`, `popup.css`, `popup.js` and `icons` are directly inside it.

## 3. Register the owner account

1. Open the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
2. Sign in with the Google account that should permanently own the extension.
3. Register as a Chrome Web Store developer and pay Google's one-time registration fee.
4. Verify the developer email and keep access to that inbox for review notices.

## 4. Upload the package

1. Select **Add new item**.
2. Upload `release\ecomind-ai-chrome-extension.zip`.
3. Confirm that the dashboard accepts Manifest V3 version `1.1.1`.
4. If the manifest needs a correction, edit `extension/manifest.json`, increase the version, rebuild and create a new ZIP. Manifest metadata cannot be edited inside the dashboard.

## 5. Suggested store listing

**Name**

EcoMind AI

**Summary**

Locally analyses disclosed clothing-product evidence and explains a provisional Green Score.

**Single purpose**

Help users understand and compare sustainability-related evidence disclosed on clothing product pages they explicitly choose to analyse.

**Detailed description**

EcoMind AI is an educational, privacy-conscious shopping companion for clothing and textile product pages.

After you select “Analyse this product”, EcoMind reads the active page locally, identifies disclosed material composition and related product details, and applies a transparent deterministic prototype formula. The injected koala drawer keeps retailer evidence, EcoMind estimates, user corrections and missing data visibly separate.

Key features:

- user-activated local analysis of the current product page;
- best-effort live support for Amazon US/UK clothing pages, with unsupported pages identified honestly;
- visible evidence sources, missing fields and confidence;
- provisional score or score-withheld result when evidence is insufficient;
- separate seller-provided, user-provided and independently verified certification states, including careful OEKO-TEX handling;
- optional user-labelled corrections stored only on the device;
- saved extracted fields for comparison across products and retailers;
- accessible traffic-light explanations whose thresholds are shared with the web app;
- optional Supabase email/password sign-in, backend leaderboard profile and weekly EcoPoints summary;
- no external product-analysis server, advertisements or payment-data access.

Scores are educational prototype estimates, not certifications or lifecycle assessments. Retailer compatibility is best-effort and no retailer partnership is claimed.

**Category suggestion**

Shopping, or the closest current category offered by the dashboard.

**Homepage URL**

https://ecomind-ai-two.vercel.app

**Privacy policy URL**

https://ecomind-ai-two.vercel.app/#/privacy

**Support URL**

https://github.com/Yers1/ecomind-ai/issues

## 6. Prepare listing images

Use only screenshots of the current extension UI. Do not use Amazon, H&M, Nike or another retailer's logo as if they endorse EcoMind.

Prepare:

- the included 128×128 EcoMind extension icon;
- at least one 1280×800 or 640×400 screenshot showing the popup and injected drawer;
- ideally additional screenshots for missing-data/manual correction, real-product comparison and the privacy explanation;
- a 440×280 small promotional tile if the current dashboard requests it.

Keep “provisional estimate”, “local processing” and the Threadly demo label visible where relevant.

## 7. Complete Privacy practices accurately

Use the wording shown by the current dashboard, but keep these facts consistent:

- EcoMind's single purpose is the local analysis and comparison described above.
- It accesses **website content** only on the active page after the user presses the analysis button.
- Product-page content is processed locally and is not transmitted to EcoMind or another server.
- Extracted comparison fields, manual corrections, preferences, wishlist items and local point events are stored in `chrome.storage.local`. A configured build also stores the normal Supabase user session, account identifier and explicit sync queue there; it never stores a password or service-role credential.
- The shared leaderboard receives only approved action type, deduplication key, source and timestamp through the protected RPC. Public rows contain only nickname, koala level, badge, EcoPoints and action count. Product names, scores, browsing history, spending and wishlist contents are not uploaded as leaderboard fields.
- It does not collect browsing history, cookies, account credentials, orders, cart contents or payment information.
- It does not sell data, use data for advertising, or allow humans to read page content.

Permission justifications:

- `activeTab`: temporary access to the page the user explicitly chose to analyse;
- `scripting`: inject the parser and koala only after that action;
- `storage`: keep preferences, corrections, wishlist fields and demo EcoPoints on the device.

A backend-configured build contains one exact host permission for `https://wmyqcmcaaslbowdvoqqy.supabase.co/*`. This is used only for private account sign-in, approved event synchronisation and the opted-in public leaderboard. Passwords are sent directly to Supabase Auth over HTTPS and are never stored by EcoMind. Do not add an all-sites host permission.

Do not say that no website content is accessed—the extension necessarily reads the selected product page. The accurate distinction is that access is user-activated, local and not transmitted.

## 8. Submit for review

1. Complete **Store Listing**, **Privacy**, **Distribution** and any required **Test instructions** tabs.
2. In test instructions, explain: open an Amazon US/UK clothing product page or the clearly labelled public Threadly Demo Mode, click the extension, select **Analyse this product**, then open the koala. Do not claim other marketplaces as live-supported.
3. Choose public visibility only when the team is ready for anyone to install it.
4. Select **Submit for Review**.
5. If desired, choose deferred publishing so approval does not make the item public automatically.

Review time is controlled by Google. Monitor the developer email and respond to any policy or testing question. A future update must use a higher manifest version and a newly built ZIP.
