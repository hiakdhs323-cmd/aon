const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

vm.runInThisContext(fs.readFileSync("namumark-parser.js", "utf8"), {
  filename: "namumark-parser.js"
});

const styles = fs.readFileSync("style.css", "utf8");
assert.ok(styles.includes("#article.wiki-content details.opennamu_TOC"), "TOC panel styles must exist");
assert.ok(styles.includes("background:var(--wiki-panel)!important"), "TOC panel must retain its background");
assert.ok(!styles.includes(".opennamu_category_links a+a::before"), "category links must not add a second separator");
assert.ok(styles.includes("table td{background-color:transparent}"), "table cells must reveal table backgrounds");
assert.ok(styles.includes('table tr[style*="background"]>td'), "row backgrounds must remain visible through cells");

const NamuMark = globalThis.NamuMarkBundle?.NamuMark;
assert.equal(typeof NamuMark, "function", "NamuMark parser export must be available");

function render(source, title = "AonWiki:파서 테스트") {
  const parser = new NamuMark(source, { docName: title, docType: "view" }, { data: [] });
  return parser.parse()[0];
}

const infoBox = render([
  "[table(align=right,width=400)]",
  "[tr][th=2]문서 정보[/th][/tr]",
  "[tr][td]분류[/td][td]일반 틀[/td][/tr]",
  "[tr][td]주제[/td][td]한국지리[/td][/tr]",
  "[tr][td]문서 상태[/td][td]정식 문서[/td][/tr]",
  "[/table]"
].join("\n"));

assert.match(infoBox, /wiki-bracket-table/, "bracket table must render a table");
assert.match(infoBox, /float:right/, "align=right must float the information box");
assert.match(infoBox, /width:400px/, "numeric width must be converted to px");
assert.match(infoBox, /<th colspan="2">/, "th colspan must be preserved");
assert.match(infoBox, /문서 정보/, "table header text must be preserved");
assert.match(infoBox, /한국지리/, "table cell text must be preserved");
assert.match(infoBox, /정식 문서/, "last table cell must be preserved");

const columnColorTable = render([
  "||<-2><colbgcolor=#74B9FF><colcolor=white>문서 정보||",
  "||멤버 수||54명||"
].join("\n"));
const columnCells = [...columnColorTable.matchAll(/<td\b([^>]*)>/g)].map(match => match[1]);
assert.ok(columnCells.length >= 3, "column-color test table must render all cells");
const secondRowCells = columnCells.slice(-2);
assert.match(secondRowCells[0], /background:#74B9FF/i, "colbgcolor applies to the first column");
assert.match(secondRowCells[0], /color:white/i, "colcolor applies to the first column");
assert.doesNotMatch(secondRowCells[1], /background:#74B9FF/i, "colbgcolor must not leak across a colspan");
assert.doesNotMatch(secondRowCells[1], /color:white/i, "colcolor must not leak across a colspan");

const warningNotice = render([
  "||<tablewidth=100%><tablebgcolor=#1b1c1e><tablealign=center><rowbgcolor=><height=10>||",
  "||{{{+1 주의. 사건·사고 관련 내용을 설명합니다.[br][br]}}}'''{{{#ff9100 [https://aon.hiakdhs323.workers.dev/w/AonWiki%3A%ED%8E%B8%EC%A7%91%EC%A7%80%EC%B9%A8#s-4 사건 사고 관련 서술 규정]}}}'''{{{을 유의하시기 바랍니다.}}} ||"
].join("\n"));
assert.match(warningNotice, /<table[^>]*style="[^"]*width:100%[^"]*background:#1b1c1e/i, "tablewidth and tablebgcolor must reach the rendered table");
assert.match(warningNotice, /<tr class="aonwiki-table-spacer"[^>]*><td aria-hidden="true"/, "empty height rows must render a valid spacer cell");
assert.match(warningNotice, /height:10px/i, "empty parameter row height must be retained");
assert.doesNotMatch(warningNotice, /background:\s*;/i, "empty rowbgcolor must not emit invalid CSS");

const appSource = fs.readFileSync("app.js", "utf8");
const workerSource = fs.readFileSync("worker/src/index.js", "utf8");
const htmlSource = fs.readFileSync("index.html", "utf8");
assert.doesNotMatch(workerSource, /--aonwiki-table-auto-bg-(?:light|dark):/, "server renderer must not synthesize or overwrite cell backgrounds");
assert.match(workerSource, /data-aonwiki-authored-fg/, "explicit authored text colors must be marked and preserved");
assert.match(styles, /html\[data-theme="light"\] #article\.wiki-content table td:first-child[^{}]*\{[^}]*color:#20252a!important/s, "light mode must darken text over the existing light label-cell background");
assert.match(styles, /html\[data-theme="dark"\] #article\.wiki-content table td:first-child[^{}]*\{[^}]*color:#f2f3f4!important/s, "dark mode must lighten text without changing the label-cell background");
assert.doesNotMatch(styles, /auto-bg-(?:light|dark)/, "theme switching must not add synthesized cell backgrounds");
assert.match(workerSource, /aonfix", "20261106-theme-text-only-v1"/, "SSR asset URLs must receive a new cache key");
assert.match(workerSource, /targeted-db-v25-theme-text-only:/, "server render cache must invalidate old table markup");
assert.match(styles, /:root\s*\{[^}]*color-scheme:dark;/, "dark mode must be the stylesheet default");
assert.match(styles, /html\[data-theme="light"\]\s*\{[^}]*--wiki-bg:#f3f4f5;/, "light mode must retain a dedicated palette");
assert.match(styles, /aonwiki-table-spacer/, "spacer rows must have compact styling");
assert.match(styles, /#article\.wiki-content table td:first-child:not\(\[style\*="background"\]\)/, "first-column background must follow the active theme");
assert.match(workerSource, /aonfix", "20261106-theme-text-only-v1"/, "SSR must serve the corrected stylesheet under a fresh cache key");
assert.match(styles, /border:1px solid var\(--wiki-border-strong\)/, "table frame must remain visible around borderless spacer rows");
assert.match(styles, /line-height:1\.55!important/, "table cell line spacing must be compact and consistent");
assert.match(appSource, /function refreshWikiTableContrast\(root = document\)/, "table contrast must refresh on render and theme changes");
assert.match(appSource, /aonwikiAutoText/, "automatic text colors must be tracked");
assert.match(htmlSource, /document\.documentElement\.dataset\.theme = theme/, "theme must be selected before CSS loads");

const category = render("== 개요 ==\n본문\n[[분류:일반 틀]]\n[[분류:사건 사고]]");
assert.match(category, /opennamu_category_label/, "category strip label must render");
assert.match(category, /분류:/, "category label must say 분류:");
assert.match(category, /일반 틀[\s\S]* \| [\s\S]*사건 사고/, "category links must be separated by a pipe");
assert.doesNotMatch(category, /opennamu_category_button|\(-\)/, "category strip must not show +/- control or minus text");
assert.doesNotMatch(category, /<hr class="main_hr">/, "category must not add a stray horizontal rule");
const toc = render("== 개요 ==\n본문\n=== 세부 내용 ===\n추가 내용");
assert.match(toc, /class="opennamu_TOC"/, "table of contents must render");
assert.match(toc, /<details[^>]*open/, "table of contents must start expanded");

console.log("NamuMark smoke tests passed: bracket table, colspan, width/alignment, category strip, and TOC.");
