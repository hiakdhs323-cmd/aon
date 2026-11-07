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
const workerParserSource = fs.readFileSync("worker/src/namumark-parser.js", "utf8");
const parserSource = workerParserSource;
assert.ok(workerSource.includes('aonfix", "20261107-security-hardening-v3"'), "SSR must serve assets under the current cache key");
assert.ok(appSource.includes('createAonUiIcon("link","wiki-external-link-icon")'), "external links must append the compact NamuWiki-style chain marker");
assert.ok(appSource.includes("link.prepend(icon)"), "external link icon must precede the unchanged label");
assert.ok(workerSource.includes('aonfix", "20261107-security-hardening-v3"'), "Worker must cache-bust the current frontend assets");

const htmlSource = fs.readFileSync("index.html", "utf8");
const buildWorkflowSource = fs.readFileSync(".github/workflows/build-namumark.yml", "utf8");
const pagesWorkflowSource = fs.readFileSync(".github/workflows/pages.yml", "utf8");
const themeSource = fs.readFileSync("theme.js", "utf8");
assert.doesNotMatch(workerSource, /--aonwiki-table-auto-bg-(?:light|dark):/, "server renderer must not synthesize or overwrite cell backgrounds");
assert.match(workerSource, /data-aonwiki-authored-fg/, "explicit authored text colors must be marked and preserved");
assert.match(styles, /html\[data-theme="light"\] #article\.wiki-content table td:first-child[^{}]*\{[^}]*color:#20252a!important/s, "light mode must darken text over the existing light label-cell background");
assert.match(styles, /html\[data-theme="dark"\] #article\.wiki-content table td:first-child[^{}]*\{[^}]*color:#f2f3f4!important/s, "dark mode must lighten text without changing the label-cell background");
assert.doesNotMatch(styles, /auto-bg-(?:light|dark)/, "theme switching must not add synthesized cell backgrounds");
assert.match(workerSource, /aonfix", "20261107-security-hardening-v3"/, "SSR asset URLs must receive a new cache key");
assert.match(workerSource, /targeted-db-v37-render-parser:/, "server render cache must invalidate HTML generated by older TOC renderers");
assert.match(workerParserSource, /class="wiki-heading-number" style="color:var\(--wiki-link\)!important;/, "server parser must emit heading number color independently of body-link styling");
assert.match(workerParserSource, /class="wiki-heading-number-label"/, "server parser must emit a dedicated heading number label");
assert.match(styles, /:root\s*\{[^}]*color-scheme:dark;/, "dark mode must be the stylesheet default");
assert.match(styles, /html\[data-theme="light"\]\s*\{[^}]*--wiki-bg:#f3f4f5;/, "light mode must retain a dedicated palette");
assert.match(styles, /aonwiki-table-spacer/, "spacer rows must have compact styling");
assert.match(styles, /#article\.wiki-content table td:first-child:not\(\[style\*="background"\]\)/, "first-column background must follow the active theme");
assert.match(workerSource, /aonfix", "20261107-security-hardening-v3"/, "SSR must serve the corrected stylesheet under a fresh cache key");
assert.match(styles, /border:1px solid var\(--wiki-border-strong\)/, "table frame must remain visible around borderless spacer rows");
assert.match(styles, /line-height:1\.55!important/, "table cell line spacing must be compact and consistent");
assert.match(styles, /\.wiki-content h2\{[^}]*color:var\(--wiki-text\)/, "level-2 heading text must follow the active theme");
assert.match(styles, /\.wiki-content \.wiki-heading-number,\.wiki-content \.wiki-heading-number-label\{color:var\(--wiki-link\)!important/, "heading number and its label must use the blue link palette");
assert.match(styles, /\.wiki-content \.wiki-heading-text\{color:var\(--wiki-text\)!important\}/, "heading titles must follow the active theme");
assert.match(workerSource, /a:not\(\.opennamu_not_exist_link\):not\(\.wiki-heading-number\)/, "page-wide custom link colors must exclude heading numbers");
assert.match(workerSource, /a\.wiki-heading-number:hover \{color:var\(--wiki-link\) !important\}/, "custom page link colors must not override heading number color");
assert.match(styles, /#article\.wiki-content a\.wiki-heading-number[^{}]*\{color:var\(--wiki-link\)!important/, "heading number color must outrank body-link styling");
assert.match(appSource, /function refreshWikiTableContrast\(root = document\)/, "table contrast must refresh on render and theme changes");
assert.match(appSource, /aonwikiAutoText/, "automatic text colors must be tracked");
assert.match(themeSource, /document\.documentElement\.dataset\.theme = theme/, "theme bootstrap must select the theme before CSS loads");
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
assert.match(category, /class="opennamu_category_label" style="color:var\(--wiki-text\)!important;[^"]*"/, "category label must receive a theme-aware foreground from the server parser");
assert.match(category, /style="color:var\(--wiki-link\)!important;text-decoration:none!important;"/, "category links must receive the blue theme link color from the server parser");

assert.match(category, /분류:/, "category label must say 분류:");
assert.match(category, /일반 틀[\s\S]* \| [\s\S]*사건 사고/, "category links must be separated by a pipe");
assert.doesNotMatch(category, /opennamu_category_button|\(-\)/, "category strip must not show +/- control or minus text");
assert.doesNotMatch(category, /<hr class="main_hr">/, "category must not add a stray horizontal rule");
assert.ok(cssSource.includes("#article.wiki-content .opennamu_category_links a:visited") && cssSource.includes("color:var(--wiki-link)!important"), "category links must retain the blue link color over body-link styling");
const categoryBoxCss = cssSource.slice(cssSource.lastIndexOf("/* Full-width outlined category bar, matching the supplied reference. */"));
assert.ok(categoryBoxCss.includes("width:100%!important") && categoryBoxCss.includes("border:1px solid var(--wiki-border-strong)!important") && categoryBoxCss.includes("border-radius:4px!important"), "category bar must be a full-width rounded outline box");
const categoryBoxRule = categoryBoxCss.split("#article.wiki-content .opennamu_category{")[1]?.split("}")[0] || "";
assert.doesNotMatch(categoryBoxRule, /background(?:-color)?\s*:/, "category bar must retain the existing theme background");
assert.ok(categoryBoxCss.includes("@media(max-width:700px)") && categoryBoxCss.includes("width:100%!important"), "category bar must remain full-width and responsive on mobile");
const numberedList = render("목록 안내\n1. 첫 번째 항목\n1. 두 번째 항목\n\n마지막 문장");
assert.match(numberedList, /wiki-numbered-list/, "the default 1. numbered-list renderer must remain enabled");
assert.match(numberedList, /첫 번째 항목[\s\S]*두 번째 항목/, "ordered-list content and order must be preserved");
const footnotes = render("본문[* 각주 내용]\n\n[각주]");
assert.match(footnotes, /class="opennamu_footnote"/, "the default footnote block must remain enabled");
assert.match(footnotes, /footnote_title/, "footnote content must remain in its semantic element");
assert.match(footnotes, /각주 내용/, "original footnote text must be preserved");
assert.match(footnotes, /rfn_1/, "footnote backlink target must remain present");
const headingColors = render("== 개요 ==\n본문");
assert.match(headingColors, /class="wiki-heading-number"[^>]*><span class="wiki-heading-number-label"[^>]*>1\.<\/span><\/a>/, "heading section number must be rendered as its own themed link");
assert.match(headingColors, /class="wiki-heading-text">개요<\/span>/, "heading title must be separated from its section number");
const toc = render("== 개요 ==\n본문\n=== 세부 내용 ===\n추가 내용");
assert.match(toc, /class="opennamu_TOC"/, "table of contents must render");
assert.match(toc, /<details[^>]*open/, "table of contents must start expanded");
assert.match(toc, /class="opennamu_TOC_entry"/, "TOC entries must use independent block rows");
assert.match(toc, /class="opennamu_TOC_number"[^>]*>1\.<\/span>/, "TOC section number must have a separate colorable element");
assert.match(toc, /class="opennamu_TOC_number"[^>]*>1\.<\/span> <span class="opennamu_TOC_text"/, "TOC number and title must have visible separation");
assert.match(toc, /class="opennamu_TOC_text"[^>]*>개요<\/span>/, "TOC title text must have its own theme-aware element");
assert.match(toc, /class="opennamu_TOC_indent"/, "nested TOC headings must use dedicated indentation elements");
assert.match(styles, /min-width:174px!important/, "TOC must use the compact reference panel width");
assert.ok(styles.includes("font-size:18px!important"), "TOC heading label must use the enlarged typography");
assert.ok(styles.includes("font-size:15px!important"), "TOC entry text and numbers must use the enlarged typography");
assert.match(styles, /\.opennamu_TOC_number\{[\s\S]*?color:var\(--wiki-link\)!important/, "TOC numbers must use the active theme link color");
assert.match(styles, /\.opennamu_TOC_text\{[\s\S]*?color:var\(--wiki-text\)!important/, "TOC titles must use the active theme text color");


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
assert.ok(appSource.includes("let currentDiscussionView=false"), "navigation must distinguish document view from discussion view");
assert.ok(appSource.includes("if(title===currentTitle&&!currentDiscussionView)"), "the linked source document must open even when its title matches the previous document");
assert.ok(appSource.includes("function setArticleTitleLink"), "the current document title must be a navigable link");
assert.ok(appSource.includes('label.className="breadcrumb-current-link"'), "the current breadcrumb document must render as a link");
assert.ok(cssSource.includes(".article-title-link") && cssSource.includes(".breadcrumb-current-link"), "current document links must have visible link styling");
assert.ok(cssSource.includes("scrollbar-width:none") && cssSource.includes("font-variant-ligatures:none"), "discussion syntax overlay must avoid scrollbar and font-metric misalignment");
assert.ok(appSource.includes("function createDiscussionSyntaxEditor"), "discussion input fields must use the live NamuMark syntax highlighter");
assert.ok(appSource.includes("discussion-render-pending-label") && !appSource.includes("box.textContent=source"), "discussion posts must not flash raw NamuMark before server rendering completes");
assert.ok(appSource.includes('textarea.addEventListener("compositionupdate",update)'), "discussion syntax colors must refresh during Korean IME composition");
assert.ok(cssSource.includes(".discussion-render-pending") && cssSource.includes("@media(max-width:560px)"), "discussion render loading state and narrow mobile layout must be styled");
assert.ok(cssSource.includes(".discussion-code-wrap textarea.discussion-markup-input") && cssSource.includes("overscroll-behavior:contain"), "discussion syntax editor must keep its mobile scrolling contained");
assert.ok(appSource.includes("bodyLabel.append(bodyEditor.wrap)"), "new discussion body must use the highlighted editor");
assert.ok(appSource.includes("form.append(replyEditor.wrap,footer,status)"), "discussion replies must use the highlighted editor");
assert.ok(appSource.includes("textarea.dispatchEvent(new Event(\"input\",{bubbles:true}))"), "quoted text must refresh live syntax highlighting");
assert.ok(appSource.includes("buildDiscussionBodyEditForm"), "editing discussion topics and replies must use the highlighted editor");
assert.ok(cssSource.includes(".discussion-code-highlight") && cssSource.includes("textarea.discussion-markup-input"), "discussion highlight overlay must be styled for desktop and mobile");
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
assert.ok(workerSource.includes('aonfix", "20261107-security-hardening-v3"'), "SSR must refresh the latest NamuWiki-style assets");

assert.ok(workerSource.includes("X-AonWiki-Request"), "state-changing API requests must require the AonWiki anti-CSRF header");
assert.ok(workerSource.includes("async function readJsonBody") && workerSource.includes("application/json"), "JSON API bodies must use a bounded application/json parser");
assert.ok(workerSource.includes("Content-Security-Policy") && workerSource.includes("frame-ancestors 'none'"), "Worker responses must send CSP and framing protection");
assert.ok(workerSource.includes("Strict-Transport-Security"), "Worker responses must send HSTS");
assert.ok(workerSource.includes("Cross-Origin-Opener-Policy"), "Worker responses must isolate the browsing context");
assert.ok(workerSource.includes('id="aonwiki-ssr-state" type="application/json"'), "SSR state must not be executable inline JavaScript");
assert.ok(appSource.includes("function appendSanitizedServerHtml") && !appSource.includes("target.innerHTML = String(data.html || \"\")"), "rendered API HTML must pass through a client-side allowlist sanitizer before DOM insertion");
assert.ok(appSource.includes('name==="srcdoc"') && appSource.includes("allowedFrameHosts"), "client renderer must strip executable attributes and restrict iframe hosts");
assert.ok(htmlSource.includes("theme.js?v=20261107-security-hardening-v1"), "theme bootstrap must be an external script");
assert.ok(htmlSource.includes("integrity=\"sha512-LQNxIMR5rXv7o+b1l8+N1EZMfhG7iFZ9HhnbJkTp4zjNr5Wvst75AqUeFDxeRUa7l5vEDyUiAip//r+EFLLCyA==\""), "KaTeX must use SRI");
assert.match(htmlSource, /<script defer src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/highlight\.js\/11\.8\.0\/highlight\.min\.js" crossorigin="anonymous"/, "highlight.js must be loaded as a deferred CDN script");
assert.doesNotMatch(htmlSource, /<script defer src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/highlight\.js\/11\.8\.0\/highlight\.min\.js" integrity=/, "highlight.js must not use the stale mismatched SRI digest");
assert.ok(appSource.includes("X-AonWiki-Request"), "frontend API client must attach the anti-CSRF header");
assert.ok(workerSource.includes("login_account_attempts") && workerSource.includes("accountRate"), "login throttling must include an account-aware bucket in addition to the IP bucket");
assert.ok(workerSource.includes('password-change", 5, 15 * 60 * 1000'), "password changes must be rate limited");


assert.ok(workerSource.includes("official_documents"), "official document state must be persisted in D1");
assert.ok(workerSource.includes('/api/page/official'), "official document API must exist");
assert.ok(workerSource.includes("officialMarkedBy"), "official document metadata must be returned");
assert.ok(appSource.includes('currentCanEdit=typeof data.page.canEdit==="boolean" ? data.page.canEdit : null;'), "client must preserve the server-calculated edit permission state");
assert.ok(appSource.includes('currentCanEdit=initialSsrState?.canEdit===true?true:null'), "SSR false edit state must be re-evaluated after client authentication");
assert.ok(appSource.includes('const permissionFallback=authenticated && (currentProtection.level!==\"admin\" || isWikiAdmin)'), "authenticated refresh must preserve edit controls according to page protection");
assert.ok(appSource.includes('official-document'), "administrator official-document controls must exist");
assert.ok(cssSource.includes(".admin-protection-button") && cssSource.includes(".admin-official-button"), "protection and official controls must use the compact wiki-style admin button treatment");
assert.ok(htmlSource.includes('id="official-status"') && htmlSource.includes('id="official-document"'), "article title bar must expose official document status and admin control");

assert.ok(parserSource.includes("wikiDataStyleMatch.slice(1).find"), "wiki style syntax must accept quoted style values");
assert.ok(parserSource.includes("render)_[^<>]+"), "wiki style blocks must support nested NamuMark blocks");
assert.ok(!workerSource.includes("const officialTemplate = found && /^(?:틀|template):/i.test(actualTitle);"), "template pages must not be auto-marked official");
assert.ok(workerSource.includes("state.official && /^(?:틀|template):/i.test(actualTitle)"), "official template badge requires explicit official marking");
assert.ok(appSource.includes("currentOfficial&&/^(?:틀|template):/i.test(title)"), "client official template badge requires explicit official state");

assert.ok(htmlSource.includes("namumark-parser.js?v=20261107-csp-fix-v1"), "browser NamuMark parser bundle must load before app.js with the CSP fix cache version");
assert.ok(appSource.includes("function renderClientParsedDocument(") && appSource.includes("data.clientRender"), "client-side parser fallback must render server-prepared NamuMark input");
assert.ok(appSource.includes('dataset.clientRenderPending==="true"'), "full-document SSR must route empty Aon content to the client renderer");
assert.ok(workerSource.includes("buildAonClientRenderPayload") && workerSource.includes('page.title === "아온"'), "Aon page GET renders must prepare parser input instead of running the CPU-heavy Worker parser");
assert.ok(workerSource.includes("clientRenderPending = found && actualTitle === \"아온\""), "Aon full-document SSR must skip Worker-side parsing");
assert.ok(workerSource.includes('"namumark-parser.js"') && workerSource.includes('url.pathname.slice(1)'), "Worker must proxy the parser bundle on same-origin root and /aon paths");
assert.ok(workerSource.includes('"namumark-parser.js", "aonwiki-mark.svg"'), "SSR asset rewriting must route the parser bundle through the Worker");
assert.ok(workerSource.includes("script-src-attr 'none'") && workerSource.includes("https://aon69446.p-e.kr"), "Worker CSP must allow the custom origin but keep inline event handlers disabled");
assert.ok(htmlSource.includes("script-src-attr 'none'") && htmlSource.includes("https://aon69446.p-e.kr"), "HTML CSP must use the same strict script policy");
assert.ok(parserSource.includes('data-opennamu-action="heading-fold"') && !parserSource.includes('onclick="javascript:opennamu_heading_folding'), "heading folding markup must not emit inline JavaScript handlers");
assert.ok(appSource.includes('parserAction === "heading-fold"') && appSource.includes('"data-opennamu-action"'), "client sanitizer must preserve and bind the safe heading-fold action");
assert.ok(workerSource.includes('setAttribute("data-opennamu-action","heading-fold")'), "Worker sanitizer must convert legacy heading onclick markup to a safe data action");

const serverSanitizerBlock = workerSource.match(/async function sanitizeServerWikiHtml\([\s\S]*?(?=\nconst namuRenderCache)/)?.[0] || "";
const sanitizerGuardLine = serverSanitizerBlock.split(/\r?\n/).find(line => line.includes(".test(source)")) || "";
assert.ok(sanitizerGuardLine.includes("\\bon[a-z]+\\s*="), "server sanitizer fast-path must detect inline event attributes");
assert.ok(!sanitizerGuardLine.includes("\\\\bon"), "server sanitizer fast-path must not double-escape word boundaries");
const sanitizerGuardLiteral = sanitizerGuardLine.match(/if \(!(.+)\.test\(source\)\)/)?.[1] || "";
assert.ok(sanitizerGuardLiteral.startsWith("/") && sanitizerGuardLiteral.endsWith("/i"), "server sanitizer guard must remain a case-insensitive regex literal");
const sanitizerGuard = new RegExp(sanitizerGuardLiteral.slice(1, sanitizerGuardLiteral.lastIndexOf("/")), "i");
for (const unsafeMarkup of [
  '<img src="x" onerror="alert(1)">',
  '<a onclick="alert(1)">문서</a>',
  '<body onload="alert(1)">',
  '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
  '<form><input formaction="javascript:alert(1)"></form>'
]) assert.ok(sanitizerGuard.test(unsafeMarkup), "server sanitizer must activate for unsafe HTML: " + unsafeMarkup);
assert.ok(!sanitizerGuard.test("<p>일반 문서 내용</p>"), "server sanitizer fast-path must skip ordinary safe markup");
assert.ok(workerSource.includes("fetchFrontendWithRetry") && workerSource.includes("FRONTEND_TRANSIENT_STATUSES"), "frontend upstream requests must retry transient HTTP failures");
assert.ok(workerSource.includes("frontendAssetCache") && workerSource.includes('cacheState: "STALE"'), "static assets must retain a last-known-good response during upstream outages");
assert.ok(workerSource.includes("staleUntil: Date.now() + 24 * 60 * 60 * 1000"), "frontend shell and static assets must have a bounded stale fallback window");
assert.ok(workerSource.includes("cf: { cacheTtl: 3600, cacheEverything: true }"), "static frontend assets must use Cloudflare edge caching");
assert.ok(workerSource.includes("X-AonWiki-Asset-Cache"), "asset proxy responses must expose cache state for troubleshooting");
assert.ok(workerSource.includes("프런트엔드 리소스를 일시적으로 불러오지 못했습니다."), "upstream shell errors must return a clear 503 response");


const authRateLimitBody = workerSource.match(/async function authRateLimited[\s\S]*?(?=async function ensureAdminTokenTable)/)?.[0] || "";
assert.ok(workerSource.includes("let authRateLimitSchemaPromise = null"), "rate-limit schema initialization must be cached per Worker isolate");
assert.ok(workerSource.includes("async function ensureAuthRateLimitSchema"), "rate-limit schema must have a retryable initializer");
assert.doesNotMatch(authRateLimitBody, /CREATE TABLE IF NOT EXISTS/, "hot rate-limit checks must not execute DDL on every request");
const adminTokenSchemaBody = workerSource.match(/async function ensureAdminTokenTable[\s\S]*?(?=async function ensureWikiAdminSchema)/)?.[0] || "";
assert.ok(adminTokenSchemaBody.includes("adminTokenSchemaPromise") && adminTokenSchemaBody.includes("adminTokenSchemaPromise = null"), "admin-token schema setup must be cached and retry after failures");
const wikiAdminSchemaBody = workerSource.match(/async function currentUser[\s\S]*?(?=function anonymousEditorIdentity)/)?.[0] || "";
assert.ok(wikiAdminSchemaBody.includes("await ensureWikiAdminSchema(env)"), "member role lookup must use cached wiki-admin schema initialization");
assert.doesNotMatch(wikiAdminSchemaBody, /CREATE TABLE IF NOT EXISTS/, "authenticated requests must not issue wiki-admin DDL repeatedly");

assert.ok(buildWorkflowSource.includes('      - "index.html"') && buildWorkflowSource.includes('      - "style.css"'), "frontend shell and stylesheet changes must run regression tests");
assert.ok(buildWorkflowSource.includes("cancel-in-progress: false"), "parser builds must be serialized to prevent concurrent generated-bundle pushes");
assert.ok(buildWorkflowSource.includes('git commit -m "Build generated NamuMark bundles"'), "generated bundles must trigger the final Pages deployment instead of being skipped");
assert.ok(pagesWorkflowSource.includes("cancel-in-progress: true"), "Pages deployments must cancel stale in-flight deploys when generated bundles arrive");

console.log("NamuMark smoke tests passed: renderer, security, auth-schema caching and deployment workflow.");

const rewrittenSsrAppScript = '<script defer src="/aon/app.js?aonfix=20261107-security-hardening-v3&v=1"></script>';
const ssrAppScriptPattern = /<script defer src=["'](?:\/aon)?\/app\.js[^"']*["']><\/script>/i;
const rewrittenSsrAppMatch = rewrittenSsrAppScript.match(ssrAppScriptPattern);
assert.ok(rewrittenSsrAppMatch, "SSR injection matcher must recognize the rewritten same-origin /aon/app.js URL");
assert.ok(workerSource.includes("const appScriptMatch = html.match(appScriptPattern)"), "full-document SSR must locate the rewritten app.js script before injecting state");
assert.ok(workerSource.includes("const ssrStateScript = '<script id=\"aonwiki-ssr-state\" type=\"application/json\">'"), "full-document SSR must inject its page state before the application script");
assert.ok(workerSource.includes('if (!appScriptMatch) throw new Error("프런트엔드 app.js 스크립트 위치를 찾을 수 없습니다.")'), "SSR must fail visibly instead of returning a page with missing bootstrap state");
assert.ok(appSource.includes('if(document.body.dataset.ssrPage==="true"){') && appSource.includes("requestAnimationFrame(readRoute)"), "SSR pages without state must fall back to loading the URL route");
const injectedSsrHtml = rewrittenSsrAppScript.replace(ssrAppScriptPattern, '<script id="aonwiki-ssr-state" type="application/json">{}</script>\\n' + rewrittenSsrAppMatch[0]);
assert.ok(injectedSsrHtml.indexOf('id="aonwiki-ssr-state"') < injectedSsrHtml.indexOf('/aon/app.js'), "SSR state must be inserted before app.js executes");
