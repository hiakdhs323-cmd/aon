"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const app = fs.readFileSync("app.js", "utf8");
const css = fs.readFileSync("style.css", "utf8");
const start = app.indexOf("function escapeHighlightText(");
const end = app.indexOf("function handleNamuSquareBracketKeydown(", start);
assert.ok(start >= 0 && end > start, "production highlighter source must be extractable");

const context = {};
vm.runInNewContext(
  app.slice(start, end) +
    "\nglobalThis.__aonHighlighter = { highlightNamuInline, highlightNamuLine, highlightNamuColorValue };",
  context,
  { filename: "app.js#namumark-highlighter" }
);
const h = context.__aonHighlighter;

const cases = [
  ["document links", h.highlightNamuInline("[[문서#문단|표시]]"), ["mk-link-target", "mk-anchor-target"]],
  ["categories", h.highlightNamuInline("[[분류:유저]]"), ["mk-category-label"]],
  ["files and file options", h.highlightNamuInline("[[파일:로고.webp|width=200]]"), ["mk-file-label", "mk-attribute-name"]],
  ["include", h.highlightNamuInline("[include(틀:AonWiki 개발자)]"), ["mk-include-target"]],
  ["anchors", h.highlightNamuInline("[anchor(문단)]"), ["mk-anchor-target"]],
  ["footnotes with spaces", h.highlightNamuInline("[* 각주 ]"), ["mk-footnote-token"]],
  ["external links", h.highlightNamuInline("[https://example.com 표시]"), ["mk-external-url"]],
  ["inline formatting", h.highlightNamuInline("'''굵게''' ''기울임'' __밑줄__ ~~취소선~~ ^^위첨자^^ ,,아래첨자,,"), ["mk-bold-text", "mk-italic-text", "mk-underline-text", "mk-strike-text", "mk-script-text"]],
  ["directives", h.highlightNamuInline("[br] [youtube(id)] [ruby(漢字,かんじ)] [math(x^2)]"), ["mk-magic", "mk-directive"]],
  ["table options and colours", h.highlightNamuLine("||<tablewidth=100%><bgcolor=#aabfdd>셀||", false), ["mk-table-line", "mk-table-delimiter", "mk-attribute-name", "mk-color-picker-inline"]],
  ["wiki style custom properties", h.highlightNamuInline('{{{#!wiki style="--accent-color: #aabfdd; -webkit-text-fill-color: #ffffff;"'), ["mk-macro-name", "mk-css-variable", "mk-css-property-color", "mk-color-picker-inline"]],
  ["colour macros", h.highlightNamuInline("{{{#aabfdd,#ffffff 색상}}}"), ["mk-color-picker-inline"]],
  ["headings", h.highlightNamuLine("== 이름 ==", false), ["mk-heading-line", "mk-heading-text"]],
  ["lists", h.highlightNamuLine("* 목록", false), ["mk-list-marker"]],
  ["quotes", h.highlightNamuLine("> 인용", false), ["mk-quote-marker"]],
  ["redirects", h.highlightNamuLine("#redirect 문서", false), ["mk-redirect"]],
  ["horizontal rules", h.highlightNamuLine("----", false), ["mk-horizontal-rule"]],
  ["comments", h.highlightNamuLine("## 주석 ##", false), ["mk-comment"]],
  ["inline code", h.highlightNamuInline("{{{코드}}}"), ["mk-inline-code"]]
];

for (const [name, output, expectedClasses] of cases) {
  for (const className of expectedClasses) {
    assert.ok(output.includes(className), name + ": expected " + className);
  }
}
assert.match(h.highlightNamuLine("== 이름 ==", false), /mk-heading-line/);
assert.match(h.highlightNamuColorValue("#aabfdd"), /type="color" value="#aabfdd"/);
assert.match(h.highlightNamuColorValue("#abc"), /type="color" value="#aabbcc"/);
assert.doesNotMatch(h.highlightNamuColorValue("#aabbccdd"), /mk-color-picker-inline/, "alpha hex values must not lose alpha when edited");
assert.doesNotMatch(h.highlightNamuLine("color: #aabfdd", true), /mk-color-picker-inline/, "literal code blocks must not become interactive");
assert.doesNotMatch(h.highlightNamuInline("<script>alert(1)</script>"), /<script>/, "unrecognized HTML must stay escaped");

assert.match(css, /\.mk-heading-line[^}]*box-shadow:inset 0 1px 0 var\(--wiki-border-strong\)/s, "heading separator must use the existing theme border");
assert.match(css, /#editor-highlight code \.mk-color-picker-inline[^}]*pointer-events:auto/s, "main editor colour inputs must be clickable over the textarea");
assert.match(css, /\.discussion-code-highlight code \.mk-color-picker-inline[^}]*pointer-events:auto/s, "discussion editor colour inputs must also be clickable");
assert.match(app, /function bindNamuInlineColorPickers\(/, "colour changes must be mapped back into the source textarea");
assert.match(app, /range\.setEndBefore\(token\)/, "colour changes must locate the exact source token instead of searching duplicate values");

console.log("Editor highlighter smoke test passed: " + cases.length + " syntax families.");
