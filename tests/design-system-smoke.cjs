const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("design-system.css", "utf8");
const buildWorkflow = fs.readFileSync(".github/workflows/build-renderer.yml", "utf8");
const deployWorkflow = fs.readFileSync(".github/workflows/deploy-worker.yml", "utf8");
const worker = fs.readFileSync("worker/src/index.js", "utf8");

assert.ok(!html.includes("skip-link") && !css.includes(".skip-link"),
  "the unnecessary skip-to-content link and its unused styles must be removed");
assert.equal((html.match(/<main(?:\s|>)/g) || []).length, 1,
  "the page must use one main landmark without nested main elements");
assert.ok(html.includes('<main class="main">'),
  "the page must retain a single semantic main landmark");
assert.ok(html.includes('<form id="home-search-form" class="home-search-form" role="search">'),
  "the homepage must expose a real, prominent search form");
assert.ok(html.includes('id="home-search-query"') && html.includes('id="home-categories-action"'),
  "homepage search and navigation actions must remain reachable");
assert.ok(!html.includes('id="home-search-hint"'),
  "the redundant search hint must be replaced by the functional search form");
assert.ok(html.includes('id="search-create-page"') && html.includes('class="search-result-summary"'),
  "the create-page action must live with the search result summary");
assert.ok(html.includes("design-system.css?v=20261121-home-search-ux-v2"),
  "the editorial design system must be loaded after the existing wiki skins");
assert.ok(css.includes(".home-quick-nav .home-shortcut {"),
  "homepage quick actions must style the actual button markup");
assert.ok(css.includes("min-height: 68px;"),
  "homepage quick actions must have comfortable touch targets");
assert.ok(css.includes(".global-rail {"),
  "the activity rail must receive a defined layout");
assert.ok(css.includes("@media (max-width: 760px)"),
  "the layout must have a dedicated small-screen breakpoint");
assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"),
  "motion-sensitive users must receive reduced-motion styles");
assert.ok(css.includes('html[data-theme="dark"]'),
  "the design system must define a complete dark palette");
assert.ok(css.includes('html[data-theme="light"]'),
  "the design system must define a complete light palette");
assert.ok(!css.includes("@import url") &&
          !css.includes("fonts.googleapis.com") &&
          !css.includes("fonts.gstatic.com"),
  "the design system must not add a remote font dependency");
assert.ok(buildWorkflow.includes("design-system.css"),
  "the build workflow must track changes to the design system");
assert.ok(buildWorkflow.includes("node tests/design-system-smoke.cjs"),
  "the build workflow must run the design-system regression test");
assert.ok(deployWorkflow.includes("design-system.css"),
  "the Worker deployment workflow must track changes to the design system");
assert.ok(deployWorkflow.includes("node tests/design-system-smoke.cjs"),
  "the Worker deployment workflow must run the design-system regression test");

const rewriteStart = worker.indexOf("function rewriteFrontendAssets(");
const rewriteEnd = worker.indexOf("const FRONTEND_TRANSIENT_STATUSES", rewriteStart);
assert.ok(rewriteStart >= 0 && rewriteEnd > rewriteStart,
  "the Worker frontend asset rewrite helper must remain available");
const rewriteFrontendAssets = new Function("URL", worker.slice(rewriteStart, rewriteEnd) + String.fromCharCode(10) + "return rewriteFrontendAssets;")(URL);
const rewrittenShell = rewriteFrontendAssets('<link rel="stylesheet" href="design-system.css?v=20261120-editorial-shell-v1">', "https://hiakdhs323-cmd.github.io/aon", false);
assert.ok(rewrittenShell.includes('href="/aon/design-system.css?'),
  "frontend fallback must route the editorial design system through the Worker static asset proxy");

let braceDepth = 0;
for (const character of css) {
  if (character === "{") braceDepth++;
  if (character === "}") braceDepth--;
  assert.ok(braceDepth >= 0, "CSS must not close a block before it opens");
}
assert.ok(braceDepth === 0, "CSS rule blocks must be balanced");


const app = fs.readFileSync("app.js", "utf8");
assert.ok(app.includes('homeSearchForm.addEventListener("submit"'),
  "homepage search must submit through the same search flow as the header");
assert.ok(app.includes('event.key==="ArrowDown"') && app.includes('event.key==="ArrowUp"'),
  "header autocomplete must support keyboard selection");
assert.ok(app.includes('event.key==="Enter"'),
  "header autocomplete must open the selected suggestion on Enter");
assert.ok(app.includes('문서 "+pageTotal.toLocaleString("ko-KR")+"건 · 파일 "+fileTotal.toLocaleString("ko-KR")+"개'),
  "search summary must show useful document and file counts without timing noise");

console.log("AonWiki design system smoke test passed.");
