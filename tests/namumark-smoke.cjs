const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

vm.runInThisContext(fs.readFileSync("namumark-parser.js", "utf8"), {
  filename: "namumark-parser.js"
});

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

const category = render("== 개요 ==\n본문\n[[분류:일반 틀]]");
assert.match(category, /opennamu_category_label/, "category strip label must render");
assert.match(category, /분류:/, "category label must say 분류:");
assert.doesNotMatch(category, /opennamu_category_button/, "category strip must not show +/- control");

const toc = render("== 개요 ==\n본문\n=== 세부 내용 ===\n추가 내용");
assert.match(toc, /class="opennamu_TOC"/, "table of contents must render");
assert.match(toc, /<details[^>]*open/, "table of contents must start expanded");

console.log("NamuMark smoke tests passed: bracket table, colspan, width/alignment, category strip, and TOC.");
