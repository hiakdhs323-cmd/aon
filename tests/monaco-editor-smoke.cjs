const fs = require("node:fs");
const assert = require("node:assert/strict");
const read = (path) => fs.readFileSync(path, "utf8");

const app = read("app.js");
const html = read("index.html");
const styles = read("style.css");

assert.match(app, /function highlightNamuLine\(/, "the original NamuMark line highlighter must remain active");
assert.match(app, /function updateEditorHighlight\(/, "the original live highlight renderer must remain active");
assert.match(app, /code\.innerHTML = value\.split\("\\n"\)/, "the original source overlay must paint each edited line");
assert.match(app, /wrap\.classList\.add\("highlight-active"\)/, "the source overlay must activate after rendering");
assert.doesNotMatch(app, /aonMonacoEditor|initializeAonMonacoEditor|AonMonacoEditor/, "the editor must not initialize or depend on Monaco");

assert.match(html, /id="editor-highlight-code"/, "the original syntax-highlight overlay must be present");
assert.match(html, /id="editor-content"/, "the original textarea must remain the source of truth");
assert.doesNotMatch(html, /editor-monaco\/monaco\.(?:js|css)|editor-monaco-host/, "the page must not load or mount Monaco");

assert.match(styles, /\.editor-code-wrap\.highlight-active #editor-content/, "the textarea must become transparent only after the matching overlay is ready");
assert.match(styles, /#editor-highlight \.mk-syntax/, "the original syntax token colors must remain defined");
assert.match(styles, /#editor-highlight \.mk-include-target/, "include tokens must keep their dedicated color");
assert.match(styles, /html\[data-theme="light"\] #editor-highlight/, "legacy syntax colors must support light mode");
assert.match(styles, /html\[data-theme="dark"\] #editor-highlight/, "legacy syntax colors must support dark mode");

assert.match(styles, /body\.editor-active\s*\{[^}]*background:var\(--wiki-bg\)!important/s, "the editor shell must follow the active site background theme");
assert.match(styles, /body\.editor-active \.editor-card\s*\{[^}]*background:var\(--wiki-panel\)!important/s, "the editor card must follow the active site panel theme");
assert.match(styles, /body\.editor-active \.editor-preview-pane \.editor-preview\s*\{[^}]*background:var\(--wiki-panel\)!important/s, "the editor preview must not be forced into dark mode");
assert.doesNotMatch(styles, /body\.editor-active\s*\{[^}]*background:#222!important/s, "the editor must not force a dark page background");

assert.match(styles, /Mobile-first editing controls/, "mobile editor layout must remain available");
assert.match(styles, /body\.editor-active \.global-rail\s*\{[^}]*display:grid!important/s, "recent changes and discussions must remain visible on mobile edit screens");
assert.match(styles, /body\.editor-active \.global-rail \.rail-scroll-tools\s*\{[^}]*grid-column:1\/-1!important/s, "page movement controls must remain below the activity panels");
console.log("Legacy editor syntax highlighting smoke tests passed.");
