# AonWiki

AonWiki is migrating to Svelte and SvelteKit with server-side rendering on Cloudflare Workers.

## Architecture

- UI and routing: Svelte 5 + SvelteKit.
- Rendering: SvelteKit server routes render article HTML before the response is sent.
- NamuMark engine: pinned WebAssembly build from https://uiovasot.github.io/namumark/.
- Compatibility: constructs requiring existing D1-backed page or image context use the existing Worker renderer as a compatibility fallback.
- API and database: the existing Cloudflare Worker API and D1 database remain in place. SvelteKit proxies API requests and reads existing article data through the current API.
- Static assets: existing CSS and browser interaction code are served from SvelteKit's static asset directory during the transition.

## Existing D1 documents

No content migration or destructive SQL is performed. SvelteKit reads the current /api/page response and renders the original source. CI downloads the pinned upstream WASM and runs a read-only compatibility scan against every title returned by /api/page-index. Constructs requiring D1 context (file references, includes, custom wiki/style/code macros, redirects) use the legacy renderer so image aliases, includes, and existing behavior remain available.

The compatibility scan is read-only. It does not write to D1 or rewrite article content.

## Development

Run npm install, npm run prepare:wasm, and npm run dev.

## Validation

Run npm run check, npm run build, and npm run test:live-compat.

The live compatibility check fails if the API is unavailable, if the index hits its 10,000-title cap, or if an existing page cannot be fetched/rendered.

## Cloudflare deployment

The SvelteKit Worker is configured in wrangler.jsonc as aonwiki-sveltekit. It uses the existing API Worker at https://aon.hiakdhs323.workers.dev and retains the existing D1 binding. The current API Worker configuration is preserved in worker/wrangler.toml.

Deploy only after the GitHub Actions build and live compatibility scan pass. The initial deployment uses its workers.dev address. Do not switch aon69446.p-e.kr until the Cloudflare zone is Active and the new Worker has passed production smoke tests.
