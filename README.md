# Lumen Anima Labs

Institutional website for **Lumen Anima Labs**, published as a static site with GitHub Pages at [lumenanima.com](https://lumenanima.com/).

The site has no framework, build step, runtime dependency, remote analytics, marketing cookies or backend. Interactive tools use local JavaScript; QA Evidence Generator keeps its usage counters and report content on the visitor's device.

## Live QA practice product

The public site also includes **QA + Security Bug Hunt Lab**, a browser-based practice product for evidence-first manual QA and defensive security awareness.

- Product landing page: https://lumenanima.com/qa-bug-hunt-lab.html
- Gumroad: https://crispim34.gumroad.com/l/xgznrn?utm_source=github&utm_medium=profile&utm_campaign=qa_lab_launch&utm_content=lumen_repo_readme
- Free supporting QA guides: https://lumenanima.com/guides/

## Free QA evidence tool

**QA Evidence Generator** is a local-first bug-report quality coach for QA learners, freelancers and crowdtesters. It scores report completeness, warns about possible sensitive evidence, and exports PT-BR/EN Markdown or PDF-ready HTML.

- Free tool: https://lumenanima.com/tools/qa-evidence-generator.html?utm_source=github&utm_medium=profile&utm_campaign=qa_evidence_finishmode_20260928&utm_content=lumen_repo_readme
- QA practice lab: https://lumenanima.com/qa-bug-hunt-lab.html
- Report text, attachments and local counters are not transmitted by the tool.

## Free Shopee seller pricing tool

**Shopee Price Rescue** maps fee-boundary price cliffs and shows the recovery price at which net profit returns to the pre-boundary level.

- Free tool: https://lumenanima.com/tools/shopee-price-rescue.html?utm_source=github&utm_medium=profile&utm_campaign=price_rescue_finishmode_20260928&utm_content=lumen_repo_readme
- Practical seller guides: https://lumenanima.com/guides/
- No signup required; sellers should confirm account-specific fees in Shopee Seller Center.

## Brand routing

- `/` — Lumen Arts / Obsidian Regalia global entry (PT/ES browsers route to localized art pages)
- `/labs/` — Lumen Anima Labs technical/software home
- `/digital-art.html` — PT-BR art landing
- `/en/digital-art.html` — explicit English art landing
- `/es/digital-art.html` — Spanish art landing

## Structure

- `index.html` — global Lumen Arts / Obsidian Regalia entry
- `labs/index.html` — preserved Lumen Anima Labs technical/software home
- `tools/qa-evidence-generator.html` — local-first QA report scorer/export tool
- `tools/qa-evidence-core.js` — deterministic scoring/export logic shared by the public tool
- `styles.css` — responsive visual system and accessibility states
- `favicon.svg` — original local browser icon
- `privacy.html` — website and Marketplace Sync Guard privacy information
- `terms.html` — website and pre-launch software terms
- `404.html` — custom not-found page
- `robots.txt` — crawler policy
- `CNAME` — custom domain declaration
- `.nojekyll` — serves the repository as plain static files

## Test locally

From the repository root, use any static file server. With Python 3:

```bash
python -m http.server 8080
```

Open port `8080` on the machine running the command. Development addresses are not referenced by the published site.

Before publishing, check keyboard navigation, responsive layouts, relative links, metadata and the privacy pages. Core informational pages remain readable without JavaScript. Interactive tools such as Price Rescue and QA Evidence Generator require local JavaScript for their calculations and exports.

## Publish with GitHub Pages

1. Push the `main` branch to `github.com/cesaroliv/lumen-anima-labs`.
2. In **Settings → Pages**, choose **Deploy from a branch**.
3. Select `main` and `/ (root)`, then save.
4. Keep the custom domain set to `lumenanima.com` and enable HTTPS after DNS validation succeeds.
5. Configure the domain DNS with the records GitHub currently documents for apex domains.

The `CNAME` file must contain only `lumenanima.com`. License and checkout services will use separate infrastructure in the future; no backend belongs in this repository.
## ChatGPT Ads QuickLaunch

Independent productized launch service for businesses entering ChatGPT Ads.

- Service page: https://lumenanima.com/labs/chatgpt-ads-quicklaunch.html
- Includes campaign structure, context hints, measurement preflight and launch QA.
- Independent service; not affiliated with or endorsed by OpenAI.

## Commerce Feed Doctor

Free local-first beta for product-feed readiness and cross-source catalog drift.

- Tool: https://lumenanima.com/tools/commerce-feed-doctor.html
- Checks ChatGPT Ads feed requirements and baseline Google Merchant feed quality.
- CSV/TXT files stay in the browser.
