# AonWiki

AonWiki is a wiki application. The public frontend is served by GitHub Pages, while a Cloudflare Worker handles document delivery, APIs, security checks, and D1 access.

## Architecture

- **Frontend:** `index.html`, `app.js`, `style.css`, and the AonWiki-specific renderer styles.
- **Single document renderer:** `Namu_test-main/` contains the WASM parser glue and binary. Both Worker-side SSR and the browser fallback use this same parser. `namumark-wasm.js` is the browser wrapper.
- **Worker:** `worker/src/index.js`; `worker/dist/index.js` is the generated bundle.
- **Database:** Cloudflare D1, bound as `DB`.
- **Production Worker:** `aon.hiakdhs323.workers.dev`.

The retired `parser-src/` parser, its generated browser and Worker bundles, and the separate beta parser have been removed. There is no second document-rendering engine loaded by the frontend.

## Rendering

Normal document requests are parsed on the Cloudflare Worker with the Namu_test-main WASM engine, then sanitized before the rendered document is returned. The browser uses that exact same WASM engine only for the bounded fallback path when a document is too large for Worker parsing. Editor previews call the Worker rendering API, which uses the same engine.

Persistent rendered HTML is versioned by renderer identity. A cache entry from a previous engine version is not considered compatible and is regenerated on demand.

## Build and deployment

- `.github/workflows/build-renderer.yml` checks the frontend integration and rebuilds `worker/dist/index.js` from `worker/src/index.js`.
- `.github/workflows/pages.yml` publishes the frontend to GitHub Pages after changes are pushed to `main`.
- Cloudflare Worker releases are separate from the GitHub Pages frontend release.

## Local validation

Run with Node.js 22 or later:

```bash
node --check app.js
node tests/namutest-renderer-smoke.cjs
npx --yes esbuild@0.25.0 worker/src/index.js --bundle --format=esm --target=es2020 --outfile=worker/dist/index.js
node --check worker/dist/index.js
```

Keep document data in D1. Do not commit access tokens, secrets, or production exports. Preserve the existing Worker bindings and cache invalidation behavior when deploying changes.
