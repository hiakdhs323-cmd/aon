const assert = require("node:assert/strict");
const fs = require("node:fs");

const worker = fs.readFileSync("worker/src/index.js", "utf8");
const start = worker.indexOf("function publicSiteOrigin(request, env)");
const end = worker.indexOf("function decodePreviewEntities(value)", start);
assert.ok(start >= 0 && end > start, "sitemap helper boundaries must exist");

const renderSitemapXml = new Function(
  worker.slice(start, end) + "\nreturn renderSitemapXml;"
)();

const pages = [
  { title: "대문", updated_at: "2026-11-16T11:22:33.000Z" },
  { title: "AonWiki:문법", updated_at: "2026-11-16 08:34:24" },
  { title: "AonWiki:편집지침", updated_at: "2026-11-16 11:22:33" },
  { title: "정상 문서", updated_at: "2026-11-16T08:42:50.521Z" },
  { title: "시간대 문서", updated_at: "2026-11-16T08:42:50+09:00" },
  { title: "잘못된 시간대", updated_at: "2026-11-16T08:42:50+99:99" }
];
const env = {
  DB: {
    prepare(sql) {
      assert.match(sql, /SELECT title, updated_at FROM pages/);
      return { all: async () => ({ results: pages }) };
    }
  }
};

(async () => {
  const xml = await renderSitemapXml(
    { url: "https://aon.hiakdhs323.workers.dev/sitemap.xml" },
    env
  );

  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.ok(xml.includes("<loc>https://aon.hiakdhs323.workers.dev/</loc>"));
  assert.match(xml, /\/w\/AonWiki%3A%EB%AC%B8%EB%B2%95/);
  assert.match(xml, /<lastmod>2026-11-16T08:42:50\.521Z<\/lastmod>/);
  assert.match(xml, /<lastmod>2026-11-15T23:42:50\.000Z<\/lastmod>/);

  assert.doesNotMatch(xml, /<lastmod>2026-11-16 08:34:24<\/lastmod>/);
  assert.doesNotMatch(xml, /<lastmod>2026-11-16 11:22:33<\/lastmod>/);
  assert.doesNotMatch(xml, /<lastmod>2026-11-16T08:42:50\\+99:99<\\/lastmod>/);
  assert.equal((xml.match(/<url>/g) || []).length, 6,
    "the sitemap must include the site root and every non-homepage page");
  assert.equal((xml.match(/<lastmod>/g) || []).length, 2,
    "only valid W3C dateTime values may be emitted as lastmod");

  console.log("Sitemap XML and lastmod checks passed.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
