const assert = require("node:assert/strict");
const fs = require("node:fs");

const worker = fs.readFileSync("worker/src/index.js", "utf8");

assert.ok(worker.includes('const CACHEABLE_STATIC_ASSETS = new Set('),
  "cache policy must be defined centrally for static assets");
assert.ok(worker.includes('LONG_LIVED_STATIC_CACHE_CONTROL = "public, max-age=31536000, immutable"'),
  "fingerprinted static assets must receive long-lived immutable caching");
assert.ok(worker.includes('HTML_CACHE_CONTROL = "public, max-age=0, must-revalidate"'),
  "HTML responses must remain revalidated instead of becoming stale");
assert.ok(worker.includes("const staticCacheHeaders = new Headers(response.headers);"),
  "static asset caching must preserve the original response headers");
assert.ok(worker.includes("staticCacheHeaders.set("),
  "static asset caching must explicitly set Cache-Control");
assert.ok(worker.includes("new Response(response.body, { status: response.status, statusText: response.statusText, headers: staticCacheHeaders })"),
  "static asset caching must return a response with the cache policy");
assert.ok(worker.includes("request.method === \"GET\" || request.method === \"HEAD\""),
  "cache policy must not apply to unsafe request methods");

console.log("AonWiki cache header smoke test passed.");
