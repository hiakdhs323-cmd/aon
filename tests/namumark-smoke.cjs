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
