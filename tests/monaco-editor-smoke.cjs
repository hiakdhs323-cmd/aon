const fs = require("node:fs");
const assert = require("node:assert/strict");
const read = (path) => fs.readFileSync(path, "utf8");

const pkg = JSON.parse(read("package.json"));
assert.equal(pkg.devDependencies["monaco-editor"], "0.57.0", "Monaco version must remain pinned");
const entry = read("editor/monaco-entry.js");
assert.match(entry, /setMonarchTokensProvider/, "NamuMark syntax highlighting must use Monaco Monarch");
assert.ok(entry.includes("aon.macro"), "NamuMark macros must receive syntax highlighting");
assert.ok(entry.includes("aon.table.attribute"), "NamuMark table attributes must receive syntax highlighting");
assert.ok(entry.includes("aon.list.number"), "numbered NamuMark lists must receive syntax highlighting");
assert.ok(entry.includes('next: "@colorStyle"'), "NamuMark inline color syntax must use its dedicated tokenizer state");
assert.ok(entry.includes('next: "@sizeStyle"'), "NamuMark inline size syntax must use its dedicated tokenizer state");
assert.ok(entry.includes("aon.color.text"), "NamuMark color text must receive syntax highlighting");
assert.ok(entry.includes("aon.size.text"), "NamuMark size text must receive syntax highlighting");
assert.ok(entry.includes('{ token: "aon.table.attribute", foreground: "79C0FF" }'), "table attribute highlighting must have a theme color");
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

const styles = read("style.css");
assert.match(styles, /Mobile-first editing controls/, "mobile editor accessibility overrides must be present");
assert.match(styles, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/, "mobile editor tabs must stay visible in one row");
assert.match(styles, /flex-wrap:wrap!important/, "mobile markup toolbar controls must wrap instead of requiring horizontal scrolling");
assert.match(styles, /env\(safe-area-inset-bottom/, "mobile save action must account for the device safe area");
assert.match(styles, /min-height:48px!important/, "mobile save action must have a comfortable touch target");
assert.match(styles, /font-size:16px!important/, "mobile summary input must avoid automatic zoom on iOS");
assert.match(styles, /height:clamp\(260px,52dvh,540px\)!important/, "mobile Monaco editor height must adapt to the dynamic viewport");

assert.match(styles, /body\.editor-active \.global-rail\s*\{[^}]*display:grid!important/s, "recent changes and discussions must remain visible on mobile edit screens");
assert.match(styles, /body\.editor-active \.global-rail\s*\{[^}]*grid-column:1\/-1!important/s, "mobile activity rail must be placed below the main editor");
assert.match(styles, /body\.editor-active \.global-rail \.rail-scroll-tools\s*\{[^}]*grid-column:1\/-1!important/s, "top and bottom page controls must move below the activity panels");
assert.match(styles, /body\.editor-active \.global-rail \.rail-scroll-tools button\s*\{[^}]*min-height:42px!important/s, "mobile page movement controls must have touch-friendly targets");



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

assert.match(entry, /defineTheme\("aonwiki-light"/, "Monaco must provide a real light editor theme");
assert.match(entry, /defineTheme\("aonwiki-dark"/, "Monaco must preserve the dark editor theme");
assert.match(entry, /theme: getAonMonacoThemeName\(\)/, "Monaco editor must start with the active AonWiki theme");
assert.match(entry, /new MutationObserver\(syncAonMonacoTheme\)/, "Monaco theme must update when the site appearance changes");
assert.match(entry, /monaco\.editor\.setTheme\(getAonMonacoThemeName\(\)\)/, "Monaco must switch themes without recreating the editor");

const builtMonaco = read("editor-monaco/monaco.js");
assert.ok(builtMonaco.includes("aon.heading"), "built Monaco bundle must contain NamuMark syntax tokens");
assert.ok(builtMonaco.includes("aon.color.text"), "built Monaco bundle must preserve inline style highlighting");
assert.ok(builtMonaco.includes("aonwiki-dark"), "built Monaco bundle must preserve dark syntax colors");
assert.ok(builtMonaco.includes("aonwiki-light"), "built Monaco bundle must include light syntax colors");
