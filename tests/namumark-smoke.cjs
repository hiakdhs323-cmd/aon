const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

vm.runInThisContext(fs.readFileSync("namumark-parser.js", "utf8"), {
  filename: "namumark-parser.js"
});

const styles = fs.readFileSync("style.css", "utf8");
const cssSource = styles;
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

const folding = render("{{{#!folding [접기 제목]\\n접힌 내용\\n}}}");
assert.ok(folding.includes('class="wiki-fold"><summary>'), "folding syntax must keep its semantic details/summary structure");
assert.ok(folding.includes("[접기 제목]"), "folding summary title text must be preserved");
assert.ok(folding.includes('class="wiki-fold-content opennamu_folding">'), "folding body must keep its content container");
assert.match(folding, /접힌 내용/, "folding body content must remain inside the expandable block");
const foldingStyles = styles.slice(styles.lastIndexOf("EntryWiki-style folding: a compact text row"));
assert.match(foldingStyles, /min-height:23px/, "folding title row must match the compact reference height");
assert.match(foldingStyles, /background:transparent!important/, "folding title and body must not be rendered as filled panels");
assert.match(foldingStyles, /border:0!important/, "folding wrapper and title must not render an outer card border");
assert.match(foldingStyles, /font-weight:400/, "folding title must use normal text weight");
assert.match(foldingStyles, /display:list-item!important/, "folding must use the native disclosure summary marker");
assert.match(foldingStyles, /text-align:center!important/, "folding title must be centered like EntryWiki");
assert.match(foldingStyles, /list-style-type:disclosure-closed!important/, "closed folding must use the native disclosure marker");
assert.match(foldingStyles, /margin:0 0 10px/, "folding rows must retain the reference vertical spacing");

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
assert.ok(workerSource.includes('aonfix", "20261107-namu-parity-v5"'), "SSR must serve the new folding stylesheet under a fresh cache key");
assert.ok(appSource.includes('createAonUiIcon("link","wiki-external-link-icon")'), "external links must append the compact NamuWiki-style chain marker");
assert.ok(appSource.includes("link.prepend(icon)"), "external link icon must precede the unchanged label");
assert.ok(workerSource.includes('aonfix", "20261107-namu-parity-v5"'), "Worker must cache-bust new NamuWiki-style assets");

const htmlSource = fs.readFileSync("index.html", "utf8");
assert.doesNotMatch(workerSource, /--aonwiki-table-auto-bg-(?:light|dark):/, "server renderer must not synthesize or overwrite cell backgrounds");
assert.match(workerSource, /data-aonwiki-authored-fg/, "explicit authored text colors must be marked and preserved");
assert.match(styles, /html\[data-theme="light"\] #article\.wiki-content table td:first-child[^{}]*\{[^}]*color:#20252a!important/s, "light mode must darken text over the existing light label-cell background");
assert.match(styles, /html\[data-theme="dark"\] #article\.wiki-content table td:first-child[^{}]*\{[^}]*color:#f2f3f4!important/s, "dark mode must lighten text without changing the label-cell background");
assert.doesNotMatch(styles, /auto-bg-(?:light|dark)/, "theme switching must not add synthesized cell backgrounds");
assert.match(workerSource, /aonfix", "20261107-namu-parity-v5"/, "SSR asset URLs must receive a new cache key");
assert.match(workerSource, /targeted-db-v25-theme-text-only:/, "server render cache must invalidate old table markup");
assert.match(styles, /:root\s*\{[^}]*color-scheme:dark;/, "dark mode must be the stylesheet default");
assert.match(styles, /html\[data-theme="light"\]\s*\{[^}]*--wiki-bg:#f3f4f5;/, "light mode must retain a dedicated palette");
assert.match(styles, /aonwiki-table-spacer/, "spacer rows must have compact styling");
assert.match(styles, /#article\.wiki-content table td:first-child:not\(\[style\*="background"\]\)/, "first-column background must follow the active theme");
assert.match(workerSource, /aonfix", "20261107-namu-parity-v5"/, "SSR must serve the corrected stylesheet under a fresh cache key");
assert.match(styles, /border:1px solid var\(--wiki-border-strong\)/, "table frame must remain visible around borderless spacer rows");
assert.match(styles, /line-height:1\.55!important/, "table cell line spacing must be compact and consistent");
assert.match(styles, /\.wiki-content h2\{[^}]*color:var\(--wiki-link\)/, "level-2 == headings must retain the blue link color");
assert.match(appSource, /function refreshWikiTableContrast\(root = document\)/, "table contrast must refresh on render and theme changes");
assert.match(appSource, /aonwikiAutoText/, "automatic text colors must be tracked");
assert.match(htmlSource, /document\.documentElement\.dataset\.theme = theme/, "theme must be selected before CSS loads");
assert.ok(htmlSource.includes('id="search-view"'), "standalone search view must exist in the app shell");
assert.ok(htmlSource.includes('id="search-page-form"'), "search page must expose its own form");
assert.ok(appSource.includes("async function loadSearchPage(query,scope="), "search page renderer must exist");
assert.ok(appSource.includes('location.pathname.toLowerCase()==="/search"'), "direct /Search URLs must load the search view");
assert.ok(workerSource.includes('url.pathname.toLowerCase() === "/search"'), "Worker must serve the app shell for /Search URLs");
assert.ok(workerSource.includes('requestedScope === "title" || requestedScope === "files"'), "search API must support title-only and file-only scopes");
assert.ok(workerSource.includes("filename LIKE ? ESCAPE") && workerSource.includes("image_aliases.alias LIKE ? ESCAPE"), "search API must search uploaded filenames and their aliases");
assert.ok(workerSource.includes("SELECT COUNT(*) AS total FROM pages WHERE "), "search API must return exact page result counts");
assert.ok(workerSource.includes("SELECT COUNT(*) AS total FROM images WHERE "), "search API must return exact file result counts");
assert.ok(appSource.includes("function renderSearchFileGroup(host,files,query)"), "search page must render a separate file results group");
assert.ok(appSource.includes("function decorateExternalLinks(root)"), "external links must be decorated with site icons");
assert.ok(appSource.includes('createAonUiIcon("link","wiki-external-link-icon")'), "external links must append a NamuWiki-style chain marker");
assert.ok(appSource.includes("link.prepend(icon)"), "external links must retain their authored text and prepend the chain icon");
assert.ok(styles.includes("background:#00a63c"), "missing site favicons must use the EntryWiki green square");

assert.ok(!appSource.includes('new URL("/favicon.ico",url.origin)'), "external links must not replace their labels with remote favicon requests");
assert.ok(appSource.includes('setAonIconLabel(status,level==="admin"?"shield-lock":"lock"'), "protection states must use their matching lock icon");
assert.ok(appSource.includes('["page-protection","shield-lock","편집 보호"]'), "protection controls must use the shield-lock icon");
assert.ok(cssSource.includes(".wiki-external-link-icon"), "external link chain markers must have compact icon sizing");
assert.ok(cssSource.includes(".aon-ui-icon"), "document controls must share a compact icon style");

assert.ok(appSource.includes('new URL("/media/"+encodeURIComponent(file.id),apiBase()).href'), "file results must open the stored media item");
assert.ok(htmlSource.includes('<option value="files">파일만</option>'), "search scope must expose a files-only option");

const category = render("== 개요 ==\n본문\n[[분류:일반 틀]]\n[[분류:사건 사고]]");
assert.match(category, /opennamu_category_label/, "category strip label must render");
assert.match(category, /분류:/, "category label must say 분류:");
assert.match(category, /일반 틀[\s\S]* \| [\s\S]*사건 사고/, "category links must be separated by a pipe");
assert.doesNotMatch(category, /opennamu_category_button|\(-\)/, "category strip must not show +/- control or minus text");
assert.doesNotMatch(category, /<hr class="main_hr">/, "category must not add a stray horizontal rule");
const numberedList = render("목록 안내\n1. 첫 번째 항목\n1. 두 번째 항목\n\n마지막 문장");
assert.match(numberedList, /wiki-numbered-list/, "the default 1. numbered-list renderer must remain enabled");
assert.match(numberedList, /첫 번째 항목[\s\S]*두 번째 항목/, "ordered-list content and order must be preserved");
const footnotes = render("본문[* 각주 내용]\n\n[각주]");
assert.match(footnotes, /class="opennamu_footnote"/, "the default footnote block must remain enabled");
assert.match(footnotes, /footnote_title/, "footnote content must remain in its semantic element");
assert.match(footnotes, /각주 내용/, "original footnote text must be preserved");
assert.match(footnotes, /rfn_1/, "footnote backlink target must remain present");
const toc = render("== 개요 ==\n본문\n=== 세부 내용 ===\n추가 내용");
assert.match(toc, /class="opennamu_TOC"/, "table of contents must render");
assert.match(toc, /<details[^>]*open/, "table of contents must start expanded");


assert.ok(workerSource.includes("pages_has_more"), "search API must expose paginated result state");
assert.match(workerSource, /title === "대문" && !user\.isAdmin/, "homepage editing must be restricted to administrators");
assert.ok(workerSource.includes("makeSnippet"), "search API must return content excerpts");
assert.ok(workerSource.includes("lower(title) = lower(?)"), "search API must rank exact title matches first");
assert.ok(appSource.includes("function loadMoreSearchResults()"), "search results must support progressive paging");
assert.ok(appSource.includes("search-suggestions"), "header search must provide autocomplete suggestions");
assert.ok(appSource.includes("function getExplicitWikiTextColor"), "wiki links must preserve explicit NamuMark colors");
assert.ok(appSource.includes('!inlineColor.includes("--aonwiki-table-auto-fg-")'), "automatic table contrast must not be mistaken for an authored link color");
assert.ok(appSource.includes('node.hasAttribute?.("data-aonwiki-authored-fg")'), "explicit table foreground colors must be preserved in both themes");
assert.ok(appSource.includes("discussion-wiki-content"), "discussion posts must use the NamuMark renderer");
assert.ok(appSource.includes("이전 토론 더 보기"), "discussion lists must support older topics");
assert.ok(cssSource.includes("--wiki-body-link:#008b68"), "document links must use the green body-link palette");
assert.ok(cssSource.includes(".discussion-post-number"), "discussion replies must have numbered rows");
assert.ok(cssSource.includes(".search-load-more"), "search results must include paging controls");


assert.ok(workerSource.includes('requestedStatus === "open" || requestedStatus === "closed"'), "discussion API must filter active and closed topics");
assert.ok(workerSource.includes('conditions.push("status = ?")'), "discussion status filter must be parameterized");

assert.ok(appSource.includes("discussion-search-toolbar"), "discussion list must provide a search and status filter");
assert.ok(appSource.includes("main.append(link)"), "discussion list must actually render each topic title link");
assert.ok(appSource.includes('quote.textContent="인용"'), "discussion replies must support quoting");
assert.ok(workerSource.includes('requestedStatus === "open" || requestedStatus === "closed"'), "discussion API must filter active and closed topics");
assert.ok(cssSource.includes(".discussion-search-toolbar"), "discussion search controls must be styled");
assert.ok(cssSource.includes("wiki-numbered-list"), "numbered-list CSS must remain present");
assert.ok(cssSource.includes(".opennamu_footnote"), "footnote CSS must remain present");
assert.ok(cssSource.includes('a:not(.opennamu_not_exist_link):not([id*="fn_"]):not([href*="fn_"])'), "footnote markers must keep their native link appearance");
assert.ok(workerSource.includes('aonfix", "20261107-namu-parity-v5"'), "SSR must refresh the latest NamuWiki-style assets");
console.log("NamuMark smoke tests passed: NamuWiki parity links, search, discussions and renderer.");
