const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = path => fs.readFileSync(path, "utf8");
const html = read("index.html");
const app = read("app.js");
const wrapper = read("namumark-wasm.js");
const worker = read("worker/src/index.js");

assert.match(html, /namumark-aon\.css/, "AonWiki adapter skin must be loaded");
assert.match(html, /namumark-interactions-aon\.css/, "AonWiki interaction skin must be loaded");
assert.doesNotMatch(html, /namumark-parser\.js|namumark-beta\.css/, "legacy parser bundle and beta skin must not be loaded");
assert.match(app, /import\("\.\/namumark-wasm\.js"\)/, "browser fallback must load the single WASM renderer wrapper");
assert.match(app, /import\("\.\/Namu_test-main\/interactions\.js(?:\?[^"']+)?"\)/, "browser interaction module must come from Namu_test-main");
assert.doesNotMatch(app, /NamuMarkBundle|namumark-beta|toggleNamumarkBeta|openNAMU/, "legacy parser and beta toggle must be absent");
assert.match(wrapper, /from "\.\/Namu_test-main\/namumark\.js"/, "browser wrapper must use the Namu_test-main parser glue");
assert.match(worker, /from "\.\.\/\.\.\/Namu_test-main\/namumark\.js"/, "Worker SSR must use the same Namu_test-main parser glue");
assert.match(worker, /from "\.\.\/\.\.\/Namu_test-main\/namumark_bg\.wasm"/, "Worker SSR must use the Namu_test-main WASM binary");
assert.doesNotMatch(worker, /worker\/src\/namumark-parser|namumark-parser\.js/, "Worker must not include the retired parser bundle");
assert.match(worker, /namutest-main-v6-single-footnote-private-assets:/, "persistent cache keys must be namespaced by the current renderer and asset version");
assert.match(worker, /clearPersistentNamuRenderCache\(env\);/, "page mutations must invalidate all rendered link states");
assert.match(app, /renderedDocumentCache\.set\(key,\{value:data,expiresAt:Date\.now\(\)\+45000\}\)/, "document renders must use a bounded browser cache");
assert.match(worker, /if \(stored && stored\.source_hash === cacheKey\)/, "old renderer cache entries must never be reused");
assert.doesNotMatch(worker, /endsWith\("\\:" \+ sourceDigest\)/, "legacy cache compatibility fallback must be removed");
assert.match(worker, /Namu_test-main\/namumark\.js/, "Worker static proxy must serve the nested Namu_test-main parser module");
assert.match(worker, /Namu_test-main\/namumark_bg\.wasm/, "Worker static proxy must serve the nested Namu_test-main WASM module");
assert.match(app, /wiki-external-image-link/, "external links containing file images must be marked for badge suppression");
assert.match(read("index.html"), /id="home-login-action"/, "homepage must expose the login quick action");
assert.match(read("index.html"), /id="home-create-action"/, "homepage must expose the add-document quick action");
assert.match(read("index.html"), /id="home-search-action"/, "homepage must expose the search quick action");
assert.match(read("index.html"), /id="home-categories-action"/, "homepage must expose the category-grid quick action");
assert.match(app, /home-search-action.*loadSearchPage/s, "homepage search quick action must open the search view");
assert.match(app, /home-categories-action.*loadCategoryIndex/s, "homepage category quick action must open the category index");
assert.ok(read("namumark-aon.css").includes(".wiki-link-external:has(img)::before"), "external image links must suppress the automatic external-link badge");


const removedLegacyFiles = [
  "parser-src/index.ts",
  "parser-src/misc.ts",
  "namumark-parser.js",
  "namumark.js",
  "namumark-beta.js",
  "namumark-beta.css",
  "namumark-adapter.js",
  "worker/src/namumark-parser.js"
];
for (const path of removedLegacyFiles) {
  assert.equal(fs.existsSync(path), false, `legacy renderer file must be removed: ${path}`);
}

assert.doesNotMatch(read("style.css"), /opennamu_/i, "site skin must not contain legacy OpenNAMU renderer selectors");
assert.doesNotMatch(read("UPSTREAM-NOTICE.md"), /builds and runs.*openNAMU/i, "upstream notice must not claim OpenNAMU is the active runtime");

console.log("AonWiki single-renderer integration checks passed.");

assert.match(worker, /SELECT id, filename FROM images/, "image resolver must load image IDs");
assert.match(worker, /SELECT alias, image_id FROM image_aliases/, "image alias resolver must load image IDs");
assert.match(worker, /imageMap/, "client fallback payload must include image mappings");
assert.match(app, /rewriteClientNamuImageUrls/, "browser fallback must rewrite NamuMark image cache URLs");
assert.match(app, /wiki-link-external/, "browser fallback must flatten nested external image links");
assert.match(worker, /NamuMark can emit an invalid nested anchor/, "Worker SSR must flatten nested external image links");
assert.match(app, /normalizeCategoryName/, "document category labels must remove repeated prefixes");
assert.ok(app.includes("M6.11484 19.2188C7.32682 19.7396"), "EntryWiki clock path must be present");
assert.ok(app.includes("M20 20L16.25 16.25H6.875"), "EntryWiki discussion path must be present");
assert.ok(app.includes("M0.000129937 12.6792V18H20"), "EntryWiki archive path must be present");
assert.ok(app.includes("function applyEntryWikiStaticIcons()"), "static EntryWiki icon slots must be hydrated");
assert.match(read("index.html"), /data-entry-icon="clock"/, "recent changes must display the EntryWiki clock icon");
assert.match(read("index.html"), /data-entry-icon="discussion"/, "recent discussion must display the EntryWiki speech icon");
assert.match(read("index.html"), /data-entry-icon="archive"/, "category menus must display the EntryWiki archive icon");
assert.match(read("index.html"), /class="current-tab"><span class="article-tab-icon"/, "document view must have an icon-led current tab");
assert.doesNotMatch(read("style.css"), /html\[data-theme=["'](?:dark|light)["']\][^{}]*\.wiki-content/i, "site skin must not override NamuMark theme colors");

assert.match(read("index.html"), /id="editor-tab-raw"/, "editor must offer plain RAW edit mode");
assert.match(read("index.html"), /id="editor-preview-pane"/, "editor must have a dedicated preview panel");
assert.match(read("index.html"), /id="editor-preview-refresh"/, "editor must provide a preview refresh action");
assert.match(read("index.html"), /id="editor-line-numbers"/, "editor must show line numbers");
assert.match(read("index.html"), /id="editor-public-ack"/, "editor must show a public-edit acknowledgement");
assert.match(app, /function setEditorMode\(mode/, "editor modes must be managed centrally");
assert.match(app, /async function renderEditorPreview\(/, "editor preview must use the shared renderer");
assert.match(app, /function scheduleServerEditorPreview\(/, "editor preview must refresh when source changes");
assert.match(app, /file:\["\[\[파일:/, "editor must support inserting file markup");
assert.match(app, /template:\["\[\[틀:/, "editor must support inserting template markup");
assert.match(app, /if \(data\.clientRender\)/, "editor preview must consume browser WASM fallback payloads");
assert.match(worker, /if \(content\.length > 6000\)/, "long editor previews must bypass Worker parsing");
assert.match(worker, /editor preview switched to browser WASM/, "failed short previews must fall back to browser WASM");
assert.match(app, /editor-draft-indicator/, "editor must report draft autosave state");
assert.match(read("style.css"), /\.editor-code-pane\[hidden\].*display:none!important/, "hidden editor and preview panels must remain hidden");
assert.match(read("style.css"), /#editor-line-numbers/, "editor line-number gutter must be styled");
assert.match(read("style.css"), /body\.editor-active \.site-header/, "editor mode must use the focused full-screen canvas");

assert.match(read("index.html"), /id="editor-backlinks-action"/, "editor title bar must include backlinks action");
assert.match(read("index.html"), /id="editor-move-action"/, "editor title bar must include move/rename action");
assert.match(read("index.html"), /id="editor-delete-action"/, "editor title bar must include delete action");
assert.match(app, /editor-move-action.*titleField\.focus/s, "move action must focus the title field");
assert.match(app, /editor-delete-action.*\$\("delete-page"\)\.click/s, "editor delete action must reuse the guarded delete flow");
assert.match(read("index.html"), /CC0/, "editor must display the CC0 contribution notice");

assert.match(read("index.html"), /editor-monaco\/monaco\.js/, "Monaco bundle must load on the editor page");
assert.match(read("index.html"), /editor-monaco\/monaco\.css/, "Monaco CSS must load on the editor page");
assert.match(app, /initializeAonMonacoEditor/, "Monaco must initialize on entering edit mode");
assert.match(app, /syncAonTextareaFromMonaco/, "Monaco source changes must feed the existing save and draft pipeline");
assert.match(app, /focusAonWikiEditor/, "toolbar and file inserts must focus the active Monaco editor");
assert.match(worker, /editor-monaco\/monaco\.worker\.js/, "Worker must expose the local Monaco web worker");
