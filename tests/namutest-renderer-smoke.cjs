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
assert.match(app, /6\\.11484 19\\.2188C7\\.32682 19\\.7396/, "EntryWiki clock path must be present");
assert.match(app, /M20 20L16\\.25 16\\.25H6\\.875/, "EntryWiki discussion path must be present");
assert.match(app, /0\\.000129937 12\\.6792V18H20/, "EntryWiki archive path must be present");
assert.match(app, /function applyEntryWikiStaticIcons\\(\\)/, "static EntryWiki icon slots must be hydrated");
assert.match(read("index.html"), /data-entry-icon="clock"/, "recent changes must display the EntryWiki clock icon");
assert.match(read("index.html"), /data-entry-icon="discussion"/, "recent discussion must display the EntryWiki speech icon");
assert.match(read("index.html"), /data-entry-icon="archive"/, "category menus must display the EntryWiki archive icon");
assert.match(read("index.html"), /class="current-tab"><span class="article-tab-icon"/, "document view must have an icon-led current tab");
assert.doesNotMatch(read("style.css"), /html\[data-theme=["'](?:dark|light)["']\][^{}]*\.wiki-content/i, "site skin must not override NamuMark theme colors");
