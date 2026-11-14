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
assert.doesNotMatch(read("style.css"), /html\[data-theme=["'](?:dark|light)["']\][^{}]*\.wiki-content/i, "site skin must not override NamuMark theme colors");
