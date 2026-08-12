# GitHub publishing details

The local repository is initialised on the `main` branch and contains two public-safe commits. The working tree should be clean before publishing.

## Recommended repository metadata

**Repository name**

```text
ecomind-ai-hackathon-2026
```

**Description**

```text
Hackathon-ready React prototype giving young online shoppers transparent clothing Green Scores, confidence, greener alternatives and behaviour-first EcoPoints. Team 17, Teens in AI AI4Good Incubator 2026.
```

**Visibility**

```text
Public
```

**Topics**

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
hackathon
accessibility
browser-extension-prototype
```

**Licence**

```text
MIT
```

## Public-safety status

The prepared repository has been checked for:

- credential-shaped strings;
- local user and Codex paths;
- the original pasted brief or attachment;
- environment files;
- retailer customer data;
- private survey responses;
- runtime API dependencies.

None were found. The product images are original generated demo assets, and all environmental data is labelled as sample or estimated.

## Publish through github.com

1. Open `https://github.com/new` while signed in.
2. Enter the recommended repository name and description.
3. Select **Public**.
4. Do not add a README, `.gitignore` or licence on GitHub because they already exist locally.
5. Create the repository.
6. From this project folder, replace `YOUR_USERNAME` and run:

```bash
git remote add origin https://github.com/YOUR_USERNAME/ecomind-ai-hackathon-2026.git
git push -u origin main
```

7. Add the topics from the list above in the repository settings.

## Publish with GitHub CLI

If GitHub CLI is installed and authenticated:

```bash
gh repo create ecomind-ai-hackathon-2026 \
  --public \
  --source=. \
  --remote=origin \
  --push \
  --description "Hackathon-ready React prototype giving young online shoppers transparent clothing Green Scores, confidence, greener alternatives and behaviour-first EcoPoints. Team 17, Teens in AI AI4Good Incubator 2026."
```

Then add topics:

```bash
gh repo edit --add-topic ecomind-ai,climate-action,sdg13,ai4good,teens-in-ai,react,typescript,vite,sustainability,hackathon,accessibility,browser-extension-prototype
```

## Suggested About text

```text
EcoMind AI helps young shoppers understand the environmental impact of clothing with a transparent Green Score, visible confidence and lower-impact alternatives. Built for Teens in AI AI4Good Incubator 2026.
```

## Suggested first release

- Tag: `v1.0.0-hackathon`
- Title: `EcoMind AI hackathon prototype`
- Notes: `Working local-first MVP with the extension-style koala widget, deterministic Green Score, comparison, wishlist, EcoPoints, dashboard, methodology and privacy views.`
