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
assert.match(app, /import\("\.\/Namu_test-main\/interactions\.js"\)/, "browser interaction module must come from Namu_test-main");
assert.doesNotMatch(app, /NamuMarkBundle|namumark-beta|toggleNamumarkBeta/, "legacy parser and beta toggle must be absent");
assert.match(wrapper, /from "\.\/Namu_test-main\/namumark\.js"/, "browser wrapper must use the Namu_test-main parser glue");
assert.match(worker, /from "\.\.\/\.\.\/Namu_test-main\/namumark\.js"/, "Worker SSR must use the same Namu_test-main parser glue");
assert.match(worker, /from "\.\.\/\.\.\/Namu_test-main\/namumark_bg\.wasm"/, "Worker SSR must use the Namu_test-main WASM binary");
assert.doesNotMatch(worker, /worker\/src\/namumark-parser|namumark-parser\.js/, "Worker must not include the retired parser bundle");
assert.match(worker, /namutest-main-v1-renderer:/, "persistent cache keys must be namespaced by the new renderer identity");
assert.match(worker, /if \(stored && stored\.source_hash === cacheKey\)/, "old renderer cache entries must never be reused");
assert.doesNotMatch(worker, /endsWith\("\\:" \+ sourceDigest\)/, "legacy cache compatibility fallback must be removed");
assert.match(worker, /Namu_test-main\\/namumark\.js/, "Worker static proxy must serve the nested Namu_test-main parser module");
assert.match(worker, /Namu_test-main\\/namumark_bg\.wasm/, "Worker static proxy must serve the nested Namu_test-main WASM module");


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

console.log("AonWiki single-renderer integration checks passed.");
