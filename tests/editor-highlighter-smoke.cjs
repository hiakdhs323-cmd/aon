
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
    "\nglobalThis.__aonHighlighter = { highlightNamuInline, highlightNamuLine, highlightNamuColorValue, renderEditorHighlightLines };",
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
  ["table options and colours", h.highlightNamuLine("||<tablewidth=100%><bgcolor=#aabfdd>셀||", false), ["mk-table-line", "mk-table-delimiter", "mk-attribute-name", "mk-color-value-has-picker"]],
  ["wiki style custom properties", h.highlightNamuInline('{{{#!wiki style="--accent-color: #aabfdd; -webkit-text-fill-color: #ffffff;"'), ["mk-macro-name", "mk-css-variable", "mk-css-property-color", "mk-color-value-has-picker"]],
  ["colour macros", h.highlightNamuInline("{{{#aabfdd,#ffffff 색상}}}"), ["mk-color-value-has-picker"]],
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
assert.match(h.highlightNamuColorValue("#aabfdd"), /mk-color-value-has-picker/);
assert.match(h.highlightNamuColorValue("#aabfdd"), /data-source-color="#aabfdd"/);
assert.match(h.highlightNamuColorValue("#abc"), /data-source-color="#abc"/);
assert.doesNotMatch(h.highlightNamuColorValue("#aabbccdd"), /mk-color-picker-inline/, "alpha hex values must not lose alpha when edited");
assert.doesNotMatch(h.highlightNamuLine("color: #aabfdd", true), /mk-color-picker-inline/, "literal code blocks must not become interactive");
assert.doesNotMatch(h.highlightNamuInline("<script>alert(1)</script>"), /<script>/, "unrecognized HTML must stay escaped");

assert.match(css, /#editor-highlight code \.mk-heading-line::before[\s\S]*?border-top:1px solid var\(--wiki-border-strong\)/, "heading separator must use a full-width theme border");
assert.match(css, /#editor-highlight\{position:absolute;inset:0;z-index:0;/, "highlight plane must stay below the textarea so scrollbars remain accessible");
assert.match(css, /\.namu-color-picker-layer\{[^}]*z-index:2;[^}]*pointer-events:none/s, "only the sparse picker layer may sit above the editor");
assert.match(css, /\.namu-color-picker-layer \.mk-color-picker-inline\{[^}]*pointer-events:auto/s, "colour swatches must remain clickable without blocking editor scrolling");
assert.match(app, /function bindNamuInlineColorPickers\(/, "colour changes must be mapped back into the source textarea");
assert.match(app, /range\.setEndBefore\(token\)/, "colour changes must locate the exact source token instead of searching duplicate values");
assert.match(app, /const NAMU_COLOR_PICKER_BINDINGS = new WeakMap\(\)/, "color picker controls must be maintained outside the syntax overlay");
assert.match(app, /field\.addEventListener\("scroll",\(\)=>requestAnimationFrame\(state\.render\)/, "color picker positions must follow the textarea while scrolling");

console.log("Editor highlighter smoke test passed: " + cases.length + " syntax families.");

assert.match(app, /function renderEditorHighlightLines\(/, "the overlay renderer must account for block heading lines");
assert.match(app, /code\.innerHTML = renderEditorHighlightLines\(value\)/, "the input and syntax overlay must share one line-layout algorithm");
assert.doesNotMatch(app, /resizeEditorSourcePane|editorSourceResizeFrame|field\.scrollHeight/, "source height must be determined by natural text flow, not a stale JavaScript measurement");
assert.match(css, /body\.editor-active #editor-highlight\s*\{[^}]*position:relative!important;[\s\S]*?height:auto!important;[\s\S]*?overflow:visible!important/s, "highlighted text must determine the complete editor height in normal flow");
assert.match(css, /body\.editor-active #editor-content\s*\{[^}]*position:absolute!important;[\s\S]*?inset:0!important;[\s\S]*?height:100%!important/s, "the textarea must overlay the complete intrinsic-height source");
assert.match(css, /body\.editor-active #editor-highlight code,\s*body\.editor-active #editor-highlight code \*\s*\{[^}]*font:inherit!important;[^}]*font-weight:400!important;[^}]*font-style:normal!important;[^}]*line-height:inherit!important;/s, "all syntax tokens must inherit the input's exact font and line metrics");
assert.match(css, /#editor-highlight code \.mk-heading-line,[\s\S]*?height:1\.6em;[\s\S]*?border:0;/s, "heading separators must not add height to the source line");
assert.match(css, /#editor-highlight code \.mk-heading-line::before[\s\S]*?position:absolute;[\s\S]*?border-top:1px solid/s, "the heading separator must be painted without affecting text layout");

const headingRendered = h.renderEditorHighlightLines("위 문장\n== 이름 ==\n아래 문장");
assert.ok(headingRendered.includes("위 문장\n<span class=\"mk-heading-line\">"), "a heading must keep the source line break before it");
assert.ok(headingRendered.includes("</span>아래 문장"), "a block heading must not receive a second newline after its block boundary");
assert.doesNotMatch(headingRendered, /<\/span>\n아래 문장/, "a heading must not create a phantom blank line");
assert.equal((headingRendered.match(/mk-heading-line/g) || []).length, 1, "one heading source line must create exactly one heading block");
assert.equal(h.renderEditorHighlightLines("첫 줄\n둘째 줄"), "첫 줄\n둘째 줄", "ordinary source lines must keep their original line breaks");
assert.ok(h.renderEditorHighlightLines("== 이름 ==\n").endsWith("</span>\n"), "a trailing newline after a heading must preserve the final editable line");

assert.match(css, /html:has\(body\.editor-active\)\{[^}]*overflow-y:visible!important/s, "the viewport must own vertical scrolling while the editor is active");
assert.match(css, /body\.editor-active \.editor-card\{[^}]*overflow:visible!important/s, "the editor card must not clip the form bottom");
assert.match(css, /body\.editor-active \.editor-fields,[\s\S]*?overflow:visible!important/s, "editor form ancestors must retain their full content height");
assert.match(app, /requestAnimationFrame\(\(\)\s*=>\s*\{\s*window\.scrollTo\(\{top:0,left:0,behavior:"auto"\}\)/, "opening the editor must start at the top of its complete page");


const expandedCases = [
  ["datetime and time magic", h.highlightNamuInline("[datetime] [time] [date] [pagecount] [clearfix]"), ["mk-magic"]],
  ["unfinished document link", h.highlightNamuInline("[[문서명"), ["mk-link-target"]],
  ["unfinished category", h.highlightNamuInline("[[분류:유저"), ["mk-category-label"]],
  ["unfinished include", h.highlightNamuInline("[include(틀:AonWiki 개발자"), ["mk-include-target"]],
  ["unfinished bold", h.highlightNamuInline("'''입력 중"), ["mk-bold-text"]],
  ["unfinished underline", h.highlightNamuInline("__입력 중"), ["mk-underline-text"]],
  ["unfinished text size", h.highlightNamuInline("{{{+2 큰 글씨"), ["mk-size-value"]],
  ["unfinished colour macro", h.highlightNamuInline("{{{#aabfdd 색상"), ["mk-color-value"]],
  ["level six heading", h.highlightNamuLine("====== 최상위 제목 ======", false), ["mk-heading-line", "mk-heading-text"]],
  ["unfinished heading", h.highlightNamuLine("== 제목 입력 중", false), ["mk-heading-line", "mk-heading-text"]],
  ["table spans", h.highlightNamuInline("||<^|2><-3>셀"), ["mk-table-option"]],
  ["inline HTML attributes", h.highlightNamuInline("<span class=wide style=\"color:#aabfdd\">텍스트</span>"), ["mk-tag-name", "mk-attribute-name", "mk-css-property-color"]]
];
for (const [name, output, expectedClasses] of expandedCases) {
  for (const className of expectedClasses) {
    assert.ok(output.includes(className), name + ": expected " + className);
  }
}
assert.match(css, /#editor-highlight code \.mk-heading-line::before[\s\S]*?border-top:1px solid var\(--wiki-border-strong\)/, "heading line must draw a full-width separator above the heading");
assert.match(app, /const left=rect\.right-wrapRect\.left-wrap\.clientLeft\+4;/, "colour picker must appear beside, not on top of, the source colour code");
assert.match(css, /html:has\(body\.editor-active\)\{[^}]*overflow-y:visible!important/s, "the html viewport must own vertical editor scrolling");
assert.match(css, /body\.editor-active\{[^}]*overflow:visible!important/s, "body must not create a nested scroll container while editing");

assert.match(css, /body\.editor-active #editor-highlight\s*\{[^}]*position:relative!important;[\s\S]*?height:auto!important;[\s\S]*?overflow:visible!important/s, "highlight must be the normal-flow height source");
assert.match(css, /body\.editor-active #editor-content\s*\{[^}]*position:absolute!important;[\s\S]*?inset:0!important;[\s\S]*?height:100%!important/s, "textarea must cover the measured source layer");
assert.match(css, /body\.editor-active #editor-highlight code \.mk-bold-text[\s\S]*?font-weight:400!important|body\.editor-active #editor-highlight code \*\s*\{[^}]*font-weight:400!important/s, "bold tokens must not change character advance");
assert.match(css, /body\.editor-active #editor-highlight code \.mk-italic-text[\s\S]*?font-style:normal!important|body\.editor-active #editor-highlight code \*\s*\{[^}]*font-style:normal!important/s, "italic tokens must not change character advance");
assert.doesNotMatch(app, /resizeEditorSourcePane|editorSourceResizeFrame/, "JS must not force a potentially incorrect editor height");
