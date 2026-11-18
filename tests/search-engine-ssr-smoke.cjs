const assert = require("node:assert/strict");
const fs = require("node:fs");

const worker = fs.readFileSync("worker/src/index.js", "utf8");

assert.doesNotMatch(worker, /function isVerifiedGoogleCrawler\(request\)/,
  "document output must not vary based on a Googlebot user-agent or Cloudflare bot classification");

const deferStart = worker.indexOf("function shouldDeferHeavyWikiSSR(title, source)");
const deferEnd = worker.indexOf("\nasync function renderFullWikiDocument", deferStart);
assert.ok(deferStart >= 0 && deferEnd > deferStart, "the heavy-document SSR guard must be present");
const shouldDeferHeavyWikiSSR = new Function(
  worker.slice(deferStart, deferEnd) + "\nreturn shouldDeferHeavyWikiSSR;"
)();

assert.equal(shouldDeferHeavyWikiSSR("짧은 문서", "본문"), false,
  "small documents should be fully server-rendered");
assert.equal(shouldDeferHeavyWikiSSR("AonWiki:문법", "x".repeat(16184)), true,
  "the 16K-character syntax guide must use the CPU-safe text fallback");
assert.equal(shouldDeferHeavyWikiSSR("AonWiki:편집지침", "x".repeat(12265)), true,
  "long editing rules must use the same fallback for visitors and crawlers");
assert.equal(shouldDeferHeavyWikiSSR("아온", "x".repeat(2731)), true,
  "the include-heavy profile page must retain the CPU-safe fallback");

const escapeStart = worker.indexOf("function escapeHtml(value)");
const escapeEnd = worker.indexOf("\nfunction safeJsonForHtml", escapeStart);
assert.ok(escapeStart >= 0 && escapeEnd > escapeStart, "HTML escaping helper must be present");
const escapeHtml = new Function(worker.slice(escapeStart, escapeEnd) + "\nreturn escapeHtml;")();

const fallbackStart = worker.indexOf("function buildWikiTextFallbackHtml(sourcePreviewText)");
const fallbackEnd = worker.indexOf("\nfunction buildWikiPageStructuredData", fallbackStart);
assert.ok(fallbackStart >= 0 && fallbackEnd > fallbackStart, "searchable text fallback helper must be present");
const buildWikiTextFallbackHtml = new Function(
  "escapeHtml",
  worker.slice(fallbackStart, fallbackEnd) + "\nreturn buildWikiTextFallbackHtml;"
)(escapeHtml);

assert.equal(
  buildWikiTextFallbackHtml("AonWiki 본문 <script> & 내용"),
  '<p class="namumark-ssr-text-fallback">AonWiki 본문 &lt;script&gt; &amp; 내용</p>',
  "deferred documents must expose safe, searchable text in the initial HTML"
);
assert.equal(buildWikiTextFallbackHtml("   "), "",
  "empty source text must not create an empty fallback paragraph");

const renderStart = worker.indexOf("async function renderFullWikiDocument(request, env, title)");
const renderEnd = worker.indexOf("\nasync function ", renderStart + 1);
assert.ok(renderStart >= 0 && renderEnd > renderStart, "document renderer boundaries must exist");
const renderFunction = worker.slice(renderStart, renderEnd);
assert.match(renderFunction, /shouldDeferHeavyWikiSSR\(actualTitle, sourceText\)/,
  "the same CPU-safe decision must apply to every request");
assert.match(renderFunction, /const textFallbackHtml = found && clientRenderPending\\s*\\?\\s*buildWikiTextFallbackHtml\\(sourcePreviewText\\)/,
  "the fallback must be built from clean document text rather than raw NamuMark");
assert.match(renderFunction, /rendered\.html \|\| textFallbackHtml/,
  "the initial article must contain rendered HTML or searchable fallback text");

console.log("Search indexing and SSR fallback checks passed.");
