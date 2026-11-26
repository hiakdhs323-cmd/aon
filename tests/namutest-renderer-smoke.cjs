const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = path => fs.readFileSync(path, "utf8");
const html = read("index.html");
const app = read("app.js");
const wrapper = read("namumark-wasm.js");
const worker = read("worker/src/index.js");

assert.match(html, /namumark-aon\.css/, "AonWiki adapter skin must be loaded");
assert.match(html, /namumark-interactions-aon\.css/, "AonWiki interaction skin must be loaded");
assert.doesNotMatch(html, /namumark-parser\.js|namumark-beta\.css/, "legacy parser bundle and beta skin must not be loaded");
assert.match(app, /import\("\.\/namumark-wasm\.js"\)/, "browser fallback must load the single WASM renderer wrapper");
assert.match(app, /import\("\.\/Namu_test-main\/interactions\.js(?:\?[^"']+)?"\)/, "browser interaction module must come from Namu_test-main");
assert.match(app, /preview-footnote-root-scope-v2/, "footnote interaction fix must use a fresh browser module cache key");
assert.doesNotMatch(app, /NamuMarkBundle|namumark-beta|toggleNamumarkBeta|openNAMU/, "legacy parser and beta toggle must be absent");
assert.match(wrapper, /from "\.\/Namu_test-main\/namumark\.js"/, "browser wrapper must use the Namu_test-main parser glue");
assert.match(worker, /from "\.\.\/\.\.\/Namu_test-main\/namumark\.js"/, "Worker SSR must use the same Namu_test-main parser glue");
assert.match(worker, /from "\.\.\/\.\.\/Namu_test-main\/namumark_bg\.wasm"/, "Worker SSR must use the Namu_test-main WASM binary");
assert.doesNotMatch(worker, /worker\/src\/namumark-parser|namumark-parser\.js/, "Worker must not include the retired parser bundle");
assert.match(worker, /namutest-main-v7-include-category-isolation:/, "persistent cache keys must be namespaced by the category-isolation renderer version");
assert.match(worker, /clearPersistentNamuRenderCache\(env\);/, "page mutations must invalidate all rendered link states");
assert.match(app, /renderedDocumentCache\.set\(key,\{value:data,expiresAt:Date\.now\(\)\+45000\}\)/, "document renders must use a bounded browser cache");
assert.match(worker, /if \(stored && stored\.source_hash === cacheKey\)/, "old renderer cache entries must never be reused");
assert.doesNotMatch(worker, /endsWith\("\\:" \+ sourceDigest\)/, "legacy cache compatibility fallback must be removed");
assert.match(worker, /Namu_test-main\/namumark\.js/, "Worker static proxy must serve the nested Namu_test-main parser module");
assert.match(worker, /Namu_test-main\/namumark_bg\.wasm/, "Worker static proxy must serve the nested Namu_test-main WASM module");
assert.match(worker, /local frontend shell unavailable; falling back to FRONTEND_ORIGIN/, "SSR must fall back to the configured frontend origin when Worker Assets cannot supply index.html");
assert.match(worker, /rewriteFrontendAssets\(shell, frontendOrigin, false\)/, "the fallback shell must rewrite static assets to the frontend proxy path");
assert.match(worker, /Worker Assets index\.html returned/, "a missing local shell must be recorded and trigger the fallback path");
assert.match(worker, /AonWiki document SSR failed; serving client-side route fallback/, "a failed full-document SSR must fall back to the normal client-side document route");
assert.match(worker, /X-AonWiki-SSR-Fallback/, "client-side fallback responses must be identifiable in the response headers");
assert.match(worker, /url\.pathname === "\/favicon\.ico"/, "the default browser favicon request must redirect to the AonWiki SVG mark");
assert.match(read("wrangler.toml"), /\[observability\][\s\S]*enabled = true/, "Worker observability must be enabled for server-side exception diagnostics");
assert.match(html, /<meta name="google-site-verification" content="[^"]+"/, "existing Search Console ownership verification tag must be retained");
assert.match(html, /<link rel="canonical" href="https:\/\/aon\.hiakdhs323\.workers\.dev\/">/, "homepage canonical URL must use the production Worker host");
assert.match(html, /<meta name="description" content="[^"]*아온 위키/, "homepage must expose a Korean search description");
assert.match(html, /<meta property="og:description"/, "homepage must expose an Open Graph description for chat previews");
assert.match(html, /"@type": "WebSite"/, "homepage must expose WebSite structured data for the AonWiki name");
assert.match(worker, /function renderedHtmlToPreviewText\(/, "document social descriptions must be extracted from rendered HTML");
assert.match(worker, /function namuSourceToPreviewText\(/, "long/client-rendered documents must have NamuMark syntax stripped from fallback descriptions");
assert.match(worker, /renderedPreviewText \|\| sourcePreviewText/, "document descriptions must prefer actual rendered text");
assert.match(worker, /property="og:description"/, "document responses must publish their rendered description to Open Graph");
assert.match(worker, /id="aonwiki-page-jsonld"/, "document responses must publish per-page structured data");
assert.match(worker, /max-image-preview:large/, "indexable document responses must allow rich search snippets");
assert.match(worker, /SELECT title, updated_at FROM pages ORDER BY title COLLATE NOCASE ASC LIMIT 5000/, "dynamic sitemap must continue enumerating all public wiki documents");
assert.match(read("robots.txt"), /Sitemap: https:\/\/aon\.hiakdhs323\.workers\.dev\/sitemap\.xml/, "robots.txt must reference the canonical dynamic sitemap");


const ssrBundleScriptPattern = /<script\b(?=[^>]*\bsrc=["'](?:\/aon)?\/?(?:app\.bundle\.js|app\.js)(?:\?[^"']*)?["'])[^>]*>\s*<\/script>/i;
assert.match(html, ssrBundleScriptPattern, "document SSR must recognize the bundled module script in index.html");
const sourceSlash = String.fromCharCode(92); assert.ok(worker.includes("app" + sourceSlash + ".bundle" + sourceSlash + ".js|app" + sourceSlash + ".js"), "document SSR must inject its state before either bundled or legacy app entrypoint");

assert.match(app, /wiki-external-image-link/, "external links containing file images must be marked for badge suppression");
assert.match(read("index.html"), /id="home-login-action"/, "homepage must expose the login quick action");
assert.match(read("index.html"), /id="home-create-action"/, "homepage must expose the add-document quick action");
assert.doesNotMatch(read("index.html"), /id="home-search-form"|id="home-search-query"|home-hero-logo/, "homepage must not repeat search UI or the header logo");
assert.match(read("index.html"), /id="search" class="searchbar"/, "the header search field must remain the primary site-wide search entry");
assert.match(read("index.html"), /id="search-page-form"/, "the dedicated search results page must retain its own search form");
assert.match(read("index.html"), /id="search-page-query"/, "the search page must retain its query input");
assert.match(read("index.html"), /id="home-categories-action"/, "homepage must expose the category-grid quick action");
assert.doesNotMatch(app, /homeSearchForm\.addEventListener\("submit"/, "there must not be a second homepage search handler");
assert.match(app, /home-categories-action.*loadCategoryIndex/s, "homepage category quick action must open the category index");
assert.ok(read("namumark-aon.css").includes(".wiki-link-external:has(img)::before"), "external image links must suppress the automatic external-link badge");


const removedLegacyFiles = [
  "parser-src/index.ts",
  "parser-src/misc.ts",
  "namumark-parser.js",
  "namumark.js",
  "namumark-beta.js",
  "namumark-beta.css",
  "namumark-adapter.js",
  "worker/src/namumark-parser.js"
];
for (const path of removedLegacyFiles) {
  assert.equal(fs.existsSync(path), false, `legacy renderer file must be removed: ${path}`);
}

assert.doesNotMatch(read("style.css"), /opennamu_/i, "site skin must not contain legacy OpenNAMU renderer selectors");
assert.doesNotMatch(read("UPSTREAM-NOTICE.md"), /builds and runs.*openNAMU/i, "upstream notice must not claim OpenNAMU is the active runtime");

const includeHelperStart = worker.indexOf("function isNamuMarkupContainer(source, index)");
const includeHelperEnd = worker.indexOf("function collectCategoryTargets(source)", includeHelperStart);
assert.ok(includeHelperStart >= 0 && includeHelperEnd > includeHelperStart, "Worker must expose its bounded include-scanning helpers");
const includeHelpers = new Function(
  worker.slice(includeHelperStart, includeHelperEnd) +
  "\nreturn { collectIncludeTargets, replaceNamuIncludesOutsideCode };"
)();
assert.deepEqual(
  includeHelpers.collectIncludeTargets("[include(틀:A)] [include(틀:B)]"),
  ["틀:A", "틀:B"],
  "only direct include directives in a document must be collected"
);
assert.deepEqual(
  includeHelpers.collectIncludeTargets("{{{[include(틀:코드)]}}}"),
  [],
  "include-like text inside a literal code block must not be collected"
);
assert.deepEqual(
  includeHelpers.collectIncludeTargets("{{{#!wiki style=\"color:red\"\n[include(틀:위키블록)]\n}}}"),
  ["틀:위키블록"],
  "include directives inside wiki markup containers must remain active"
);
const literalInclude = "{{{[include(틀:코드)]}}}";
let literalIncludeCalls = 0;
assert.equal(
  includeHelpers.replaceNamuIncludesOutsideCode(literalInclude, () => {
    literalIncludeCalls++;
    return "실행됨";
  }),
  literalInclude,
  "pre-expansion must leave include-like text in literal code unchanged"
);
assert.equal(literalIncludeCalls, 0, "literal code must never trigger include lookups");
let expansionCalls = 0;
assert.equal(
  includeHelpers.replaceNamuIncludesOutsideCode("[include(틀:A)]", () => {
    expansionCalls++;
    return "[include(틀:B)]";
  }),
  "[include(틀:B)]",
  "replacement output must not be recursively expanded"
);
assert.equal(expansionCalls, 1, "a source include must be expanded only once");
assert.match(worker, /Only first-level includes from the document are resolved/, "nested template includes must be explicitly disabled");
assert.doesNotMatch(worker, /pendingIncludes\.push|for \(let depth = 0; depth < 3; depth\+\+\)/, "Worker must not recursively fetch or expand nested includes");
assert.match(worker, /buildNamuServerDatabase\(env, title, source\)/, "browser fallback database must be built from original document source, not pre-expanded templates");
assert.match(worker, /buildNamuServerDatabase\(env, title, sourceText\)/, "Worker SSR database must be built from original document source, not expanded template contents");

console.log("AonWiki single-renderer integration checks passed.");

assert.match(read("index.html"), /class="editor-terms-block"/, "editor must show the compact contribution consent notice below the summary");
assert.match(read("index.html"), /<fieldset id="editor-fields" class="editor-fields">/, "editor fields must be enabled before consent");
assert.match(read("index.html"), /id="editor-save" class="button button-primary" type="submit" disabled/, "save must start disabled until consent is given");
assert.doesNotMatch(read("index.html"), /id="editor-public-ack"[^>]*checked/, "consent must not be pre-checked");
assert.ok(read("index.html").indexOf('id="editor-summary"') < read("index.html").indexOf('class="editor-terms-block"'), "consent must appear below the edit summary");
assert.ok(read("index.html").indexOf("</fieldset>") < read("index.html").indexOf('id="editor-save"'), "save button must remain operable after consent is checked");
assert.match(read("index.html"), /id="editor-tab-write".*id="editor-tab-raw".*id="editor-tab-preview"/s, "editor, raw and preview tabs must be retained");
assert.match(read("index.html"), /class="editor-markup-toolbar"/, "the existing markup toolbar must be retained");
assert.match(read("index.html"), /id="edit-requests"/, "administrators must have an edit request review action");
assert.match(app, /\$\("editor-save"\)\.disabled = !accepted \|\| editorSavePending/, "only the save button should be disabled by missing consent");
assert.doesNotMatch(app, /\$\("editor-fields"\)\.disabled/);
assert.match(app, /if \(!\$\("editor-public-ack"\)\.checked\) \{[^}]*return;/, "form submission must check consent even when triggered by a keyboard shortcut");
assert.match(read("app.js"), /api\("\/api\/edit-request"/, "users without edit permission must be able to submit an edit request");
assert.match(read("app.js"), /function openEditRequests\(\)/, "administrators must be able to review edit requests");
assert.match(read("app.js"), /본인이 사용하는 IP\(/, "anonymous editor disclosure must display the visitor IP");
assert.match(read("app.js"), /주소 전체가 영구히 기록됩니다/, "anonymous editor disclosure must explain permanent full-IP history");
assert.match(read("worker/src/index.js"), /body\.consent !== true/, "Worker must reject page saves without explicit consent");
assert.match(read("worker/src/index.js"), /username: ip \? "IP " \+ ip/, "anonymous revisions must keep the complete visitor IP");
assert.match(read("worker/src/index.js"), /anonymous-discussion-create/, "anonymous discussion creation must be rate limited");
assert.match(read("worker/src/index.js"), /anonymous-discussion-reply/, "anonymous discussion replies must be rate limited");
assert.match(read("app.js"), /\$\("upload"\)\.hidden=false/, "anonymous users must see the image upload action");
assert.match(read("app.js"), /\$\("editor-image"\)\.onclick=\(\)=>\{\$\("file"\)\.click\(\)\}/, "anonymous users must be able to upload images from the editor");
assert.match(read("worker/src/index.js"), /image-upload/, "all image uploads must be rate limited");
assert.match(read("worker/src/index.js"), /const user = authenticatedUser \|\| anonymousEditorIdentity\(request\)/, "anonymous upload ownership must use the visitor IP identity");
assert.match(read("app.js"), /else if\(currentTitle==="대문"\)canEdit=Boolean\(isWikiAdmin\)/, "the main page must remain administrator-only for editing");


assert.match(worker, /SELECT id, filename FROM images/, "image resolver must load image IDs");
assert.match(worker, /SELECT alias, image_id FROM image_aliases/, "image alias resolver must load image IDs");
assert.match(worker, /imageMap/, "client fallback payload must include image mappings");
assert.match(app, /rewriteClientNamuImageUrls/, "browser fallback must rewrite NamuMark image cache URLs");
assert.match(app, /wiki-link-external/, "browser fallback must flatten nested external image links");
assert.match(worker, /NamuMark can emit an invalid nested anchor/, "Worker SSR must flatten nested external image links");
assert.match(app, /normalizeCategoryName/, "document category labels must remove repeated prefixes");
assert.ok(app.includes("M6.11484 19.2188C7.32682 19.7396"), "EntryWiki clock path must be present");
assert.ok(app.includes("M20 20L16.25 16.25H6.875"), "EntryWiki discussion path must be present");
assert.ok(app.includes("M0.000129937 12.6792V18H20"), "EntryWiki archive path must be present");
assert.ok(app.includes("function applyEntryWikiStaticIcons()"), "static EntryWiki icon slots must be hydrated");
assert.match(read("index.html"), /data-entry-icon="clock"/, "recent changes must display the EntryWiki clock icon");
assert.match(read("index.html"), /data-entry-icon="discussion"/, "recent discussion must display the EntryWiki speech icon");
assert.match(read("index.html"), /data-entry-icon="archive"/, "category menus must display the EntryWiki archive icon");
assert.match(read("index.html"), /class="current-tab"><span class="article-tab-icon"/, "document view must have an icon-led current tab");
assert.doesNotMatch(read("style.css"), /html\[data-theme=["'](?:dark|light)["']\][^{}]*\.wiki-content/i, "site skin must not override NamuMark theme colors");

assert.match(read("index.html"), /id="editor-tab-raw"/, "editor must offer plain RAW edit mode");
assert.match(read("index.html"), /id="editor-preview-pane"/, "editor must have a dedicated preview panel");
assert.match(read("index.html"), /id="editor-preview-refresh"/, "editor must provide a preview refresh action");
assert.match(read("index.html"), /id="editor-line-numbers"/, "editor must show line numbers");
assert.match(read("index.html"), /id="editor-public-ack"/, "editor must show a public-edit acknowledgement");
assert.match(app, /function setEditorMode\(mode/, "editor modes must be managed centrally");
assert.match(app, /async function renderEditorPreview\(/, "editor preview must use the shared renderer");
assert.match(app, /function scheduleServerEditorPreview\(/, "editor preview must refresh when source changes");
assert.match(app, /file:\["\[\[파일:/, "editor must support inserting file markup");
assert.match(app, /template:\["\[\[틀:/, "editor must support inserting template markup");
assert.match(app, /if \(data\.clientRender\)/, "editor preview must consume browser WASM fallback payloads");
assert.match(worker, /if \(content\.length > 6000\)/, "long editor previews must bypass Worker parsing");
assert.match(worker, /editor preview switched to browser WASM/, "failed short previews must fall back to browser WASM");
assert.match(app, /editor-draft-indicator/, "editor must report draft autosave state");
assert.match(read("style.css"), /\.editor-code-pane\[hidden\].*display:none!important/, "hidden editor and preview panels must remain hidden");
assert.match(read("style.css"), /#editor-line-numbers/, "editor line-number gutter must be styled");
assert.match(read("style.css"), /body\.editor-active \.site-header/, "editor mode must use the focused full-screen canvas");

assert.match(read("index.html"), /id="editor-backlinks-action"/, "editor title bar must include backlinks action");
assert.match(read("index.html"), /id="editor-move-action"/, "editor title bar must include move/rename action");
assert.match(read("index.html"), /id="editor-delete-action"/, "editor title bar must include delete action");
assert.match(app, /editor-move-action.*titleField\.focus/s, "move action must focus the title field");
assert.match(app, /editor-delete-action.*\$\("delete-page"\)\.click/s, "editor delete action must reuse the guarded delete flow");
assert.match(read("index.html"), /CC0/, "editor must display the CC0 contribution notice");

assert.match(read("index.html"), /id="editor-highlight-code"/, "editor must include the original NamuMark highlight overlay");
assert.doesNotMatch(read("index.html"), /editor-monaco\/monaco\.(?:js|css)|editor-monaco-host/, "editor page must use the original source overlay, not Monaco");
assert.match(app, /function highlightNamuLine\(/, "editor must keep the original NamuMark token highlighter");
assert.ok(app.includes("function handleNamuSquareBracketKeydown("), "editor must auto-pair square brackets while typing");
assert.ok(app.includes('field.setRangeText("["+selected+"]",start,end,"end")'), "opening square brackets must insert a closing bracket and keep the caret inside");
assert.ok(app.includes('token==="[*"||token==="[^"'), "footnote opening markers must receive their own syntax token");
assert.ok(app.includes('mk-footnote-token') && app.includes("escapeHighlightText(token)+'</span>'"), "the complete footnote expression must be rendered as one consistently coloured token");
assert.match(read("style.css"), /#editor-highlight code \.mk-footnote-token[^}]*color:#b42372!important/, "footnote marker, body and closing bracket must share one light-theme colour");
assert.match(read("style.css"), /html\[data-theme="dark"\] #editor-highlight code \.mk-footnote-token[^}]*color:#ff7eb6!important/, "the complete footnote token must use one dark-theme colour");
assert.ok(app.includes("\\[\\*[^\\]\\n]*(?:\\]|$)"), "unfinished [* footnotes must be highlighted before the closing bracket is typed");
assert.ok(read("style.css").includes("text-decoration-line:line-through!important"), "completed strike-through markup must visibly draw a line through its text");
assert.ok(read("style.css").includes("text-decoration-line:underline!important"), "completed underline markup must visibly underline its text");
assert.ok(read("style.css").includes("font-weight:700!important"), "completed bold markup must be visibly bold");
assert.ok(read("style.css").includes("font-style:italic!important"), "completed italic markup must be visibly italic");
assert.ok(read("style.css").includes("transform:translateY(-.22em) scale(.82)"), "superscript markup must be visibly raised without changing its layout width");
assert.ok(read("style.css").includes("transform:translateY(.18em) scale(.82)"), "subscript markup must be visibly lowered without changing its layout width");
assert.match(app, /function updateEditorHighlight\(/, "editor must repaint the original syntax overlay as the source changes");

assert.match(app, /function highlightNamuSyntaxToken\(/, "existing syntax delimiters must receive semantic colors");
assert.match(app, /kind="link"/, "existing link delimiters must have a distinct highlight class");
assert.match(app, /mk-css-property-color/, "existing CSS properties must have semantic highlight classes");
assert.match(app, /mk-css-function/, "CSS function values must be highlighted within existing style syntax");
assert.match(app, /mk-attribute-color/, "existing table color attributes must have semantic highlight classes");
assert.match(read("style.css"), /#editor-highlight \.mk-syntax-macro/, "semantic tokens must have light-theme colors");
assert.match(read("style.css"), /html\[data-theme="dark"\] #editor-highlight \.mk-syntax-macro/, "semantic tokens must have dark-theme colors");
assert.match(read("style.css"), /\.mk-color-value\s*\{[^}]*box-shadow/s, "color literals must show a compact inline color chip");


assert.match(app, /function highlightNamuColorValue\(/, "editor highlighter must render validated CSS color previews");
assert.match(app, /mk-color-value/, "hex and CSS colors must receive a visible inline swatch token");
assert.match(app, /mk-css-property/, "CSS properties inside wiki style declarations must be highlighted");
assert.match(app, /mk-macro-name/, "NamuMark block macro names must have a dedicated token");
assert.match(app, /mk-attribute-name/, "table and style attributes must have dedicated tokens");
assert.match(app, /mk-table-delimiter/, "table cell separators must be highlighted independently");
assert.match(app, /mk-footnote/, "footnote syntax must have a dedicated token");
assert.match(app, /mk-redirect/, "redirect directives must be highlighted");
assert.match(app, /mk-quote-marker/, "quote markers must be highlighted");
assert.match(read("style.css"), /\.mk-color-value\s*\{[^}]*--mk-color-preview/s, "color previews must be painted without changing text width");
assert.match(read("style.css"), /html\[data-theme="dark"\] #editor-highlight \.mk-macro-name/, "expanded tokens must have dark-theme colors");

assert.match(app, /function focusAonWikiEditor\(\)\s*\{\s*\$\("editor-content"\)\?\.focus\(\)/, "toolbar and file inserts must focus the original source textarea");
assert.match(read("style.css"), /\.editor-code-wrap\.highlight-active #editor-content/, "editor must use the synchronized highlight overlay for source editing");

const editorStyles = read("style.css");
assert.match(editorStyles, /\.editor-preview-document\.article/, "editor preview must use the same article shell as a normal document");
assert.match(html, /id="editor-preview" class="namumark-content-host editor-preview"/, "editor preview must not use the separate wiki-content typography class");
assert.match(html, /id="editor-preview-title"/, "editor preview must show the document title");
assert.match(app, /target\.classList\.add\("namumark-wasm-content", "namumark-rendered"\)/, "both preview renderer paths must use the normal rendered-document classes");
assert.match(app, /ensureClientDocumentToc\(target, source, true\)/, "server-rendered previews must receive the same TOC fallback as normal documents");
assert.match(app, /renderDocumentMetadata\(preview, metadata, title, \$\("editor-content"\)\.value\)/, "preview must display categories from the editor's original source");
assert.match(app, /categories: Array\.isArray\(serverMetadata\.categories\) && serverMetadata\.categories\.length/, "long-document browser fallback metadata must preserve parsed categories");
assert.match(app, /backlinks: Array\.isArray\(serverMetadata\.backlinks\) && serverMetadata\.backlinks\.length/, "long-document browser fallback metadata must preserve parsed backlinks");
assert.match(editorStyles, /body\.editor-active \.site-header\s*\{\s*display:block!important/, "editor mode must preserve the site header");
assert.match(editorStyles, /body\.editor-active \.global-rail\s*\{\s*display:flex!important/, "editor mode must preserve the recent-activity rail");
assert.match(editorStyles, /\.editor-preview-document \.editor-preview\s*\{[^}]*padding:0!important/s, "preview content must use the article's own typography without editor-only padding overrides");

(async () => {
  const parserSource = read("Namu_test-main/namumark.js");
  const parserModule = await import("data:text/javascript;base64," + Buffer.from(parserSource, "utf8").toString("base64"));
  parserModule.initSync({ module: fs.readFileSync("Namu_test-main/namumark_bg.wasm") });
  const source = "각주 미리보기 검사 문장입니다.[* 실제 각주 본문입니다.]";
  const html = parserModule.parse_to_html(source);
  assert.match(html, /class="wiki-fn-content"/, "WASM renderer must emit the visible footnote marker");
  assert.match(html, /class="footnote-list"/, "WASM renderer must emit the footnote body list");
  assert.match(html, /id="fn-1"/, "WASM renderer must emit a stable footnote target");
  assert.match(html, /실제 각주 본문입니다\./, "WASM renderer must preserve the footnote body text");
  assert.match(read("Namu_test-main/interactions.js"), /root\.querySelectorAll\("\[id\]"\)/, "footnote targets must be resolved inside their own article root");
  assert.doesNotMatch(read("Namu_test-main/interactions.js"), /root\.ownerDocument\.getElementById\(id\)/, "footnote lookup must not select a duplicate target from the hidden document");
  console.log("AonWiki actual WASM footnote render and preview-root lookup checks passed.");

(async () => {
  const parserSource = read("Namu_test-main/namumark.js");
  const parserModule = await import("data:text/javascript;base64," + Buffer.from(parserSource, "utf8").toString("base64"));
  parserModule.initSync({ module: fs.readFileSync("Namu_test-main/namumark_bg.wasm") });
  const records = new Map([
    ["틀:AonWIki 개발자", {title:"틀:AonWIki 개발자", data:"엔진 include 콜백 테스트 본문"}]
  ]);
  const options = new parserModule.RendererOptions();
  const callbacks = {
    documentExists(name) { return records.has(String(name || "").trim()); },
    getDocumentContent(name) { return records.get(String(name || "").trim())?.data || ""; },
    getPagecount() { return records.size; }
  };
  const rendered = parserModule.parse_with_callbacks_and_options(
    "[include(틀:AonWIki 개발자)]", callbacks, options
  );
  let html = "";
  try { html = rendered.html || ""; }
  finally { rendered.free(); options.free(); }
  console.log("AON_INCLUDE_CALLBACK_PROBE=" + JSON.stringify(html));
  assert.match(html, /엔진 include 콜백 테스트 본문/, "WASM include syntax must embed template content supplied by the renderer callbacks");
  const nestedRecords = new Map([
    ["틀:상위", {title:"틀:상위", data:"상위 템플릿 본문 [include(틀:하위)]"}],
    ["틀:하위", {title:"틀:하위", data:"중첩 템플릿은 실행되면 안 됨"}]
  ]);
  const nestedOptions = new parserModule.RendererOptions();
  const nestedCallbacks = {
    documentExists(name) { return nestedRecords.has(String(name || "").trim()); },
    getDocumentContent(name) { return nestedRecords.get(String(name || "").trim())?.data || ""; },
    getPagecount() { return nestedRecords.size; }
  };
  const nestedRendered = parserModule.parse_with_callbacks_and_options(
    "[include(틀:상위)]", nestedCallbacks, nestedOptions
  );
  let nestedHtml = "";
  try { nestedHtml = nestedRendered.html || ""; }
  finally { nestedRendered.free(); nestedOptions.free(); }
  assert.doesNotMatch(nestedHtml, /중첩 템플릿은 실행되면 안 됨/, "WASM renderer must not resolve an include nested inside an included template");

})().catch(error => {
  console.error("AON_INCLUDE_CALLBACK_TEST_FAILED", error);
  process.exitCode = 1;
});

})().catch(error => {
  console.error("AON_FOOTNOTE_RENDER_TEST_FAILED", error);
  process.exitCode = 1;
});


const metadataMerger = worker.slice(worker.indexOf("function mergeNamuRenderMetadata"), worker.indexOf("function parseTableColorRgb"));
assert.match(metadataMerger, /value\.categories\s*=\s*extractNamuCategoryNames\(source\)/, "server categories must come only from the owning page source");
assert.doesNotMatch(metadataMerger, /parserCategories/, "included parser categories must not leak into the owning page metadata");
const clientRenderer = app.slice(app.indexOf("async function renderClientParsedDocument"), app.indexOf("function ensureClientDocumentToc"));
assert.match(clientRenderer, /extractClientNamuCategoryNames\(sourceForCategories\)/, "browser fallback categories must come from the original page source");
assert.doesNotMatch(clientRenderer, /result\?\.categories/, "browser parser metadata must not add categories from included documents");
assert.match(app, /renderClientParsedDocument\(data\.clientRender, staging, docTitle, source\)/, "editor preview must pass its unexpanded source for category metadata");
assert.match(app, /renderClientParsedDocument\(data\.clientRender,staging,data\.page\.title\|\|title,data\.page\.content\|\|""\)/, "document rendering must pass its unexpanded source for category metadata");

assert.match(app, /categoryValues=categorySource == null \? \(metadata\?\.categories\|\|\[\]\) : extractClientNamuCategoryNames\(categorySource\)/, "document category bar must prefer its original source over parser metadata");
assert.match(app, /renderDocumentMetadata\(article, renderMetadata, data\.page\.title\|\|title, data\.page\.content\|\|""\)/, "normal SSR/API pages must filter categories using their original source");
assert.match(app, /renderDocumentMetadata\(preview, metadata, title, \$\("editor-content"\)\.value\)/, "editor previews must filter included categories using the editor source");
assert.match(app, /renderDocumentMetadata\(\$\("article"\),initialSsrState\?\.metadata,currentTitle,initialSsrState\?\.content\|\|""\)/, "initial SSR pages must filter categories using the original page source");

assert.match(read("index.html"), /id="wiki-categories" class="wiki-categories-host"/, "document category host must sit below the article tools");
assert.match(app, /const host=document\.getElementById\("wiki-categories"\)/, "document categories must render into the dedicated host");
assert.match(app, /host\.replaceChildren\(\)/, "document categories must be cleared before rerendering");
assert.doesNotMatch(app, /shell\.prepend\(footer\)/, "document categories must not be prepended above the title");
assert.match(read("style.css"), /\.wiki-categories-host\{margin:8px 0 12px\}/, "document category host spacing must remain stable");
