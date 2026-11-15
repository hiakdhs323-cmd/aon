const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const app = fs.readFileSync("app.js", "utf8");
const wasm = fs.readFileSync("namumark-wasm.js", "utf8");
const worker = fs.readFileSync("worker/src/index.js", "utf8");
const ignored = fs.readFileSync(".assetsignore", "utf8");
const bundle = fs.readFileSync("app.bundle.js", "utf8");

assert.match(html, /<script type="module" src="app\.bundle\.js\?v=20261115-source-bundle-v1"><\/script>/);
assert.doesNotMatch(html, /highlight\.min\.js|highlightjs-line-numbers\.min\.js/);
assert.doesNotMatch(html, /src="app\.js(?:\?|")/);

assert.match(app, /import hljs from "highlight\.js"/);
assert.match(app, /import\("\.\/Namu_test-main\/interactions\.js"\)/);
assert.doesNotMatch(app, /import\("\.\/Namu_test-main\/interactions\.js\?/);
assert.match(wasm, /import wasmDataUrl from "\.\/Namu_test-main\/namumark_bg\.wasm"/);
assert.match(wasm, /initWasm\(path = wasmDataUrl\)/);

assert.match(ignored, /^app\.js$/m);
assert.match(ignored, /^namumark-wasm\.js$/m);
assert.match(ignored, /^Namu_test-main\/$/m);

assert.match(worker, /"app\.bundle\.js"/);
assert.doesNotMatch(worker, /"Namu_test-main\/(?:namumark\.js|namumark_bg\.wasm|interactions\.js)"/);
assert.doesNotMatch(worker, /"namumark-wasm\.js"/);
assert.doesNotMatch(bundle, /sourceMappingURL=/);
assert.ok(bundle.length > 100000, "the minified bundle should contain the parser and application runtime");

console.log("Frontend source-bundle smoke test passed.");
