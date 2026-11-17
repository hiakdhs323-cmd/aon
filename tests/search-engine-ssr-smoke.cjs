const assert = require("node:assert/strict");
const fs = require("node:fs");

const worker = fs.readFileSync("worker/src/index.js", "utf8");
assert.match(worker, /function isVerifiedGoogleCrawler\(request\)/,
  "Google crawler detection must be defined in the Worker");
assert.match(worker, /let clientRenderPending = found && !googleCrawler && \(actualTitle === "아온" \|\| sourceText\.length > 6000\)/,
  "verified Google crawlers must bypass the long-page client-render fallback");

const start = worker.indexOf("function isVerifiedGoogleCrawler(request)");
const end = worker.indexOf("\nasync function renderFullWikiDocument", start);
assert.ok(start >= 0 && end > start, "Google crawler helper boundaries must be present");
const isVerifiedGoogleCrawler = new Function(
  worker.slice(start, end) + "\nreturn isVerifiedGoogleCrawler;"
)();

const request = (userAgent, cf = {}) => ({
  headers: { get: name => name.toLowerCase() === "user-agent" ? userAgent : null },
  cf
});

assert.equal(
  isVerifiedGoogleCrawler(request("Googlebot/2.1", { verifiedBotCategory: "Search Engine Crawler" })),
  true,
  "Cloudflare-verified Googlebot must receive full server-rendered documents"
);
assert.equal(
  isVerifiedGoogleCrawler(request("Google-InspectionTool/1.0", { verifiedBotCategory: "Security" })),
  true,
  "Cloudflare-verified Search Console inspection must receive full server-rendered documents"
);
assert.equal(
  isVerifiedGoogleCrawler(request("Googlebot/2.1")),
  false,
  "a spoofed Googlebot user-agent without Cloudflare verification must not bypass the render threshold"
);
assert.equal(
  isVerifiedGoogleCrawler(request("Mozilla/5.0", { verifiedBotCategory: "Search Engine Crawler" })),
  false,
  "ordinary browser traffic must retain the existing render behavior"
);

console.log("Google crawler SSR checks passed.");
