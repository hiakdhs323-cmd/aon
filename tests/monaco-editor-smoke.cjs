const fs = require("node:fs");
const assert = require("node:assert/strict");
const zlib = require("node:zlib");
const read = (path) => fs.readFileSync(path, "utf8");

const pkg = JSON.parse(read("package.json"));
assert.equal(pkg.devDependencies["monaco-editor"], "0.57.0", "Monaco version must remain pinned");
const entry = read("editor/monaco-entry.js");
const buildScript = read("scripts/build-monaco.mjs");
const extraCss = zlib.gunzipSync(fs.readFileSync("editor/monaco-extra.css.gz")).toString("utf8");
assert.match(buildScript, /gunzipSync/, "the uploaded Monaco widget CSS must be included in the editor build");
assert.match(extraCss, /\.monaco-editor \.selection-anchor/, "the uploaded Monaco CSS must include selection styling");
assert.match(extraCss, /\.monaco-editor \.tokens-inspect-widget/, "the uploaded Monaco CSS must include token inspection styling");
assert.doesNotMatch(extraCss, /\/skins\/nbs\/assets\/codicon-/, "the uploaded CSS must not depend on the external NBS Codicon font");
assert.match(entry, /aon\.table\.attribute/, "NamuMark table attributes must receive syntax highlighting");
assert.match(entry, /aon\.color\.text/, "NamuMark inline color markup must receive syntax highlighting");
assert.match(entry, /aon\.size\.text/, "NamuMark inline size markup must receive syntax highlighting");
assert.match(entry, /aon\.list\.number/, "numbered lists must receive syntax highlighting");
assert.match(entry, /setMonarchTokensProvider/, "NamuMark syntax highlighting must use Monaco Monarch");
assert.match(entry, /registerCompletionItemProvider/, "NamuMark autocomplete must be registered");
assert.match(entry, /getWorker\(/, "Monaco worker routing must be local");
const app = read("app.js");
assert.match(app, /initializeAonMonacoEditor/, "AonWiki must initialize Monaco in the edit view");
assert.match(app, /syncAonTextareaFromMonaco/, "Monaco content must sync to the legacy save pipeline");
assert.match(app, /setLanguage\(aonMonacoEditor/, "RAW edit mode must switch to plain text");
const html = read("index.html");
assert.match(html, /editor-monaco\/monaco\.js/, "Monaco main bundle must load before app.js");
assert.match(html, /editor-monaco\/monaco\.css/, "Monaco stylesheet must load");
const worker = read("worker/src/index.js");
assert.match(worker, /editor-monaco\/monaco\.js/, "Worker must expose the Monaco main bundle");
assert.match(worker, /editor-monaco\/monaco\.worker\.js/, "Worker must expose Monaco's web worker");
assert.match(worker, /editor-monaco\/monaco\.css/, "Worker must expose Monaco's CSS");

for (const file of [
  "editor-monaco/monaco.js",
  "editor-monaco/monaco.worker.js",
  "editor-monaco/monaco.css",
  "editor-monaco/LICENSE.monaco.txt"
]) {
  assert.ok(fs.existsSync(file), `missing built Monaco asset: ${file}`);
  assert.ok(fs.statSync(file).size > 100, `empty built Monaco asset: ${file}`);
}
console.log("Monaco editor integration smoke tests passed.");
