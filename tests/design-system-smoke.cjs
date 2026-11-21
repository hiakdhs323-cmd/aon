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
assert.ok(!html.includes('id="home-search-form"') && !html.includes('id="home-search-query"'),
  "the homepage must not duplicate the existing header and search-page search UI");
assert.ok(!html.includes('class="home-hero-mark"') && !html.includes('home-hero-logo'),
  "the homepage must not repeat the AonWiki logo already shown in the header");
assert.ok(html.includes('<form id="search" class="searchbar" role="search">') &&
          html.includes('id="query"') && html.includes('id="search-page-form"'),
  "the existing header search and dedicated search-page form must remain available");
assert.ok((html.match(/enterkeyhint="search"/g) || []).length === 2,
  "header and dedicated search fields must request the mobile search keyboard");
assert.ok(html.includes('id="search-page-query"') && html.includes('id="search-page-scope"') &&
          html.includes('id="search-result-groups"'),
  "the existing search page must retain its query, scope, and results controls");
assert.ok(html.includes('id="search-create-page"') && html.includes('class="search-result-summary"'),
  "the create-page action must live with the search result summary");
assert.ok(html.includes("design-system.css?v=20261121-experience-readability-v4"),
  "the editorial design system must be loaded after the existing wiki skins");
assert.ok(css.includes(".home-quick-nav .home-shortcut {"),
  "homepage quick actions must style the actual button markup");
assert.ok(css.includes(".searchbar.has-search-suggestions .search-suggestions") &&
          css.includes(".search-page-form") && css.includes(".search-result-row"),
  "the existing search entry point, search form, and result rows must receive the redesign");
assert.ok(css.includes(".article-titlebar") && css.includes(".editor-card") && css.includes(".global-rail"),
  "the document, editor, and activity rail must share the site-wide visual system");
assert.ok(css.includes(".global-rail {"),
  "the activity rail must receive a defined layout");
assert.ok(css.includes("@media (max-width: 900px)") && css.includes("@media (max-width: 560px)"),
  "the design must define tablet and phone layouts");
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


const staticAssetRouteStart = worker.indexOf("const staticFiles = new Set(");
const staticAssetRouteEnd = worker.indexOf(");", staticAssetRouteStart);
assert.ok(staticAssetRouteStart >= 0 && staticAssetRouteEnd > staticAssetRouteStart &&
          worker.slice(staticAssetRouteStart, staticAssetRouteEnd).includes('"design-system.css"'),
  "the Worker static asset allowlist must serve the versioned unified design stylesheet");

let braceDepth = 0;
for (const character of css) {
  if (character === "{") braceDepth++;
  if (character === "}") braceDepth--;
  assert.ok(braceDepth >= 0, "CSS must not close a block before it opens");
}
assert.ok(braceDepth === 0, "CSS rule blocks must be balanced");


const app = fs.readFileSync("app.js", "utf8");
assert.ok(!app.includes('homeSearchForm.addEventListener("submit"') &&
          !app.includes('home-search-action'),
  "the old duplicated homepage search handlers must be removed");
assert.ok(app.includes('event.key==="ArrowDown"') && app.includes('event.key==="ArrowUp"'),
  "header autocomplete must support keyboard selection");
assert.ok(app.includes('event.key==="Enter"'),
  "header autocomplete must open the selected suggestion on Enter");
assert.ok(app.includes('setAttribute("aria-expanded","true")') &&
          app.includes('setAttribute("aria-activedescendant"'),
  "autocomplete must expose its expanded and active option to assistive technology");
assert.ok(app.includes('문서 "+pageTotal.toLocaleString("ko-KR")+"건 · 파일 "+fileTotal.toLocaleString("ko-KR")+"개'),
  "search summary must show useful document and file counts without timing noise");


assert.ok(html.includes("class=\"aon-brand-mark\"") &&
          html.includes("aonwiki-mark.svg?v=20261121-experience-readability-v4"),
  "secondary page entry points must reuse the existing AonWiki logo asset");
assert.ok(html.includes("search-page-kicker-inner") &&
          html.includes("editor-brand-context") &&
          html.includes("editor-preview-brand-link"),
  "search, editor, and editor preview must use the established AonWiki brand mark");
assert.ok(app.includes("function createAonWikiBrandMark(") &&
          app.includes("createAonWikiBrandMark(\"breadcrumb-brand-mark\")") &&
          app.includes("createAonWikiBrandMark(\"discussion-brand-mark\")"),
  "dynamic breadcrumbs and discussion surfaces must reuse the original brand asset");
assert.ok(css.includes(".aon-brand-mark") &&
          css.includes(".reading-measure") &&
          css.includes("--wiki-body-size: 15px") &&
          css.includes(".global-rail") &&
          css.includes("@media (max-width: 680px)"),
  "the full interface must share readable typography, content measures, logo treatment, and responsive behavior");

console.log("AonWiki design system smoke test passed.");
