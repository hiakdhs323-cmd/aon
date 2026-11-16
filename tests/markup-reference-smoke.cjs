const assert = require("node:assert/strict");
const fs = require("node:fs");

(async () => {
  const parserSource = fs.readFileSync("Namu_test-main/namumark.js", "utf8");
  const parser = await import("data:text/javascript;base64," + Buffer.from(parserSource, "utf8").toString("base64"));
  parser.initSync({ module: fs.readFileSync("Namu_test-main/namumark_bg.wasm") });

  const cases = [
    ["heading", "== 제목 =="],
    ["toc", "[목차]"],
    ["headingFold", "==# 접힌 제목 #==\n본문"],
    ["bold", "'''굵게'''"],
    ["italic", "''기울임''"],
    ["underline", "__밑줄__"],
    ["strike", "~~취소선~~"],
    ["sup", "^^위첨자^^"],
    ["sub", ",,아래첨자,,"],
    ["size", "{{{+2 크게}}}"],
    ["textColor", "{{{#3366cc 파란 글자}}}"],
    ["backgroundColor", "{{{@#eeeeee 배경}}}"],
    ["backgroundStyle", '{{{#!wiki style="background-color:#eeeeee; padding:8px;"\\n배경\\n}}}'],
    ["internalLink", "[[문서 제목|표시 이름]]"],
    ["externalLink", "[https://example.com|공식 사이트]"],
    ["externalLinkSpace", "[https://example.com 공식 사이트]"],
    ["externalLinkAuto", "https://example.com"],
    ["bulletList", "* 첫째\n** 하위"],
    ["numberList", "1. 첫째\n1. 둘째"],
    ["alphaList", "a. 첫째\na. 둘째"],
    ["romanList", "i. 첫째\ni. 둘째"],
    ["quote", "> 인용문"],
    ["table", "|| 이름 || 설명 ||\n|| AonWiki || 위키 ||"],
    ["tableOptions", "||<tablewidth=100%><tablealign=center><tablebordercolor=#888888> 표 ||\n||<bgcolor=#eeeeee><color=#222222> 셀 ||"],
    ["file", "[[파일:logo.png]]"],
    ["include", "[include(틀:안내)]"],
    ["footnote", "각주[* 각주 내용]"],
    ["folding", "{{{#!folding 제목\n접힌 내용\n}}}"],
    ["syntax", "{{{#!syntax python\nprint('hello')\n}}}"],
    ["wikiStyle", "{{{#!wiki style=\"border:1px solid #888; padding:10px;\"\n내용\n}}}"],
    ["dateMacro", "[date]"],
    ["dateTimeMacro", "[datetime]"],
    ["breakMacro", "앞[br]뒤"],
    ["clearFixMacro", "앞[clearfix]뒤"],
    ["pageCountMacro", "[pagecount]"],
    ["anchorMacro", "[anchor(운영정책)]\n[[문서#운영정책]]"],
    ["rubyMacro", "[ruby(漢字,ruby=かんじ)]"],
    ["redirect", "#redirect 문서 제목"],
    ["heading1", "= 첫 번째 제목 ="],
    ["heading3", "=== 세 번째 제목 ==="],
    ["heading4", "==== 네 번째 제목 ===="],
    ["heading5", "===== 다섯 번째 제목 ====="],
    ["heading6", "====== 여섯 번째 제목 ======"],
    ["externalSquare", "[https://example.com]"],
    ["externalSquareLabel", "[https://example.com 공식 사이트]"],
    ["externalDouble", "[[https://example.com]]"],
    ["externalDoubleLabel", "[[https://example.com|공식 사이트]]"],
    ["externalWiki", "[[외부:Example]]"],
    ["listSpace", " * 첫 번째\\n * 두 번째"],
    ["listTwoSpaces", "  * 첫 번째\\n  * 두 번째"],
    ["listTab", "\\t* 첫 번째\\n\\t* 두 번째"],
    ["listDash", "- 첫 번째\\n- 두 번째"],
    ["listHash", "# 첫 번째\\n# 두 번째"],
    ["listOrdered", " 1. 첫 번째\\n 1. 두 번째"],
    ["listOrderedParen", "1) 첫 번째\\n2) 두 번째"],
    ["listOrderedHash", "#1 첫 번째\\n#2 두 번째"],
    ["wikiBackgroundStyle", `{{{#!wiki style="background-color:#eeeeee; padding:8px;"\\n배경\\n}}}`],
    ["strikeAlias", "--취소선--"],
    ["sizeNegative", "{{{-2 작게}}}"],
    ["redirectAnchor", "#redirect 문서 제목#문단"]
  ];

  const callbacks = {
    documentExists(name) { return String(name || "") === "문서 제목"; },
    getDocumentContent(name) { return String(name || "") === "틀:안내" ? "포함된 안내 내용" : ""; },
    getPagecount() { return 321; }
  };
  for (const [name, source] of cases) {
    try {
      const result = parser.parse_with_callbacks(source, callbacks);
      try {
        const out = String(result.html || "").replace(/\s+/g, " ").trim();
        console.log("AON_GRAMMAR_PROBE " + name + " " + JSON.stringify({
          html: out.slice(0, 720),
          categories: result.categories,
          backlinks: result.backlinks,
          redirect_target: result.redirect_target,
          redirect_anchor: result.redirect_anchor
        }));
      } finally { result.free(); }
    } catch (error) {
      console.log("AON_GRAMMAR_PROBE " + name + " ERROR " + String(error && error.message || error));
    }
  }

  const category = parser.parse_with_metadata("[[분류:공식 문서]]");
  try {
    assert.ok((category.categories || []).includes("공식 문서"), "category syntax must be returned as a category");
  } finally { category.free(); }

  const includeOptions = new parser.RendererOptions();
  const include = parser.parse_with_callbacks_and_options("[include(틀:안내)]", callbacks, includeOptions);
  try {
    assert.match(include.html, /포함된 안내 내용/, "include syntax must insert the target page content");
  } finally { include.free(); includeOptions.free(); }

  const footnote = parser.parse_to_html("[* 각주 내용]");
  assert.match(footnote, /wiki-fn-content/, "footnote marker must be rendered");
  assert.match(footnote, /footnote-list/, "footnote body must be rendered");

  console.log("AonWiki markup reference probes completed.");
})().catch(error => {
  console.error("AON_GRAMMAR_REFERENCE_PROBE_FAILED", error);
  process.exitCode = 1;
});
