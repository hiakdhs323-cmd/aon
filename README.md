# AonWiki

AonWiki is a NamuMark-based wiki. The public frontend is served by GitHub Pages, while a Cloudflare Worker handles document delivery, the API, security checks, and database access.

## Architecture

- **Frontend:** `index.html`, `app.js`, `style.css`, and related assets in the repository. GitHub Pages publishes the site.
- **NamuMark source:** `parser-src/`. The build workflow generates a browser bundle at `namumark-parser.js` and a Worker-side module at `worker/src/namumark-parser.js`.
- **Worker:** `worker/src/index.js`. The reproducible, bundled production entrypoint is `worker/dist/index.js`.
- **Database:** Cloudflare D1, bound to the Worker as `DB`. The production database is named `aon`.
- **Production hostname:** `aon69446.p-e.kr`. The Worker loads the static HTML shell and assets from `https://hiakdhs323-cmd.github.io/aon`.

D1 stores wiki pages, revision metadata, member/session data, discussions, page protections, official-document status, image records, and persistent render-cache data. The repository contains no production credentials.

## Rendering

Most documents are parsed and sanitized in the Worker before a complete `/w/<encoded-title>` HTML document is returned.

The `아온` document uses a bounded hybrid path. The Worker expands its includes and prepares only the referenced document/link data; the browser runs the NamuMark parser. This avoids doing the expensive parse inside the Worker's constrained request CPU budget. The normal Worker-side renderer remains in use for other documents and API previews.

Static parser and frontend assets are proxied through the Worker on the custom hostname. This keeps scripts same-origin and allows the strict Content Security Policy to reject inline event handlers.

## Build and deployment

Two GitHub Actions workflows are used:

- `.github/workflows/build-namumark.yml` checks JavaScript, builds both parser bundles, runs `tests/namumark-smoke.cjs`, and generates `worker/dist/index.js`. Generated bundles are committed back to `main`.
- `.github/workflows/pages.yml` deploys the frontend to GitHub Pages. The generated-bundle commit also triggers Pages deployment so the live browser parser cannot remain behind the source parser.

The Worker is deployed separately from the GitHub Pages frontend. Deploy the generated `worker/dist/index.js` bundle as the `aon` Worker while preserving its existing production bindings:

- `DB`: D1 database `aon`
- `ALLOWED_ORIGIN`: `https://hiakdhs323-cmd.github.io,https://aon69446.p-e.kr`
- `FRONTEND_ORIGIN`: `https://hiakdhs323-cmd.github.io/aon`

Do not replace production bindings or secrets with empty values during an upload. The custom domain and 100% traffic deployment are configured on the Cloudflare side.

## Local validation

Run these commands from the repository root with Node.js 22 or later:

```bash
node --check app.js
npx --yes esbuild@0.25.0 parser-src/index.ts --bundle --format=iife --global-name=NamuMarkBundle --target=es2020 --outfile=namumark-parser.js
npx --yes esbuild@0.25.0 parser-src/index.ts --bundle --format=esm --target=es2020 --outfile=worker/src/namumark-parser.js
node tests/namumark-smoke.cjs
npx --yes esbuild@0.25.0 worker/src/index.js --bundle --format=esm --target=es2020 --outfile=worker/dist/index.js
node --check worker/dist/index.js
```

The smoke suite includes parser behavior, rendering, theme/CSS contracts, security headers, sanitization, and deployment-workflow regression checks. It is also run automatically by GitHub Actions before generated bundles are committed.

## Operational notes

- Keep article and user data in D1; do not commit exports, access tokens, or secrets to the repository.
- Preserve the existing cache invalidation behavior when editing or restoring a page.
- Do not add inline script event attributes. Use delegated or explicitly registered event listeners and `data-*` action markers.
- A Worker deployment rollback changes code, not D1 data. Database changes must remain backward-compatible with the code versions that may be rolled back to.
