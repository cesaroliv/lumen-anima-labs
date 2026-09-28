# Lumen Anima Labs

Institutional website for **Lumen Anima Labs**, published as a static site with GitHub Pages at [lumenanima.com](https://lumenanima.com/).

The site has no framework, build step, runtime dependency, analytics, cookies, remote JavaScript or backend. It uses semantic HTML and a single local stylesheet.

## Live QA practice product

The public site also includes **QA + Security Bug Hunt Lab**, a browser-based practice product for evidence-first manual QA and defensive security awareness.

- Product landing page: https://lumenanima.com/qa-bug-hunt-lab.html
- Gumroad: https://crispim34.gumroad.com/l/xgznrn?utm_source=github&utm_medium=profile&utm_campaign=qa_lab_launch&utm_content=lumen_repo_readme
- Free supporting QA guides: https://lumenanima.com/guides/

## Structure

- `index.html` — home, product, principles and about sections
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

Before publishing, check keyboard navigation, responsive layouts, relative links, metadata and the privacy pages. The site should work with JavaScript disabled because it does not include JavaScript.

## Publish with GitHub Pages

1. Push the `main` branch to `github.com/cesaroliv/lumen-anima-labs`.
2. In **Settings → Pages**, choose **Deploy from a branch**.
3. Select `main` and `/ (root)`, then save.
4. Keep the custom domain set to `lumenanima.com` and enable HTTPS after DNS validation succeeds.
5. Configure the domain DNS with the records GitHub currently documents for apex domains.

The `CNAME` file must contain only `lumenanima.com`. License and checkout services will use separate infrastructure in the future; no backend belongs in this repository.