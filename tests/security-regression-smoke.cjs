const assert = require("node:assert/strict");
const fs = require("node:fs");

const worker = fs.readFileSync("worker/src/index.js", "utf8");

assert.ok(worker.includes('if ((title === "대문" || protectionTitle === "대문")'),
  "renames must protect both the old and new title if either is the main page");
assert.ok(worker.includes("|style\\s*=|"),
  "style attributes must not skip server HTML sanitization");
assert.ok(worker.includes("iframe|svg|math|base|applet"),
  "SVG, MathML and base elements must be forced through sanitization");
assert.ok(worker.includes('if (!authenticatedUser) return response({ error: "비로그인 토론은 수정할 수 없습니다.'),
  "anonymous discussion edits must not be authorized by a shared IP");
assert.ok(worker.includes('if (!authenticatedUser) return response({ error: "비로그인 답글은 수정할 수 없습니다.'),
  "anonymous reply edits must require a session");
assert.ok(worker.includes('if (!authenticatedUser) return response({ error: "비로그인 답글은 삭제할 수 없습니다.'),
  "anonymous reply deletion must require a session");
assert.ok(worker.includes('if (!authenticatedUser) return response({ error: "비로그인 토론은 삭제할 수 없습니다.'),
  "anonymous discussion deletion must require a session");
assert.ok(worker.includes("PASSWORD_HASH_ITERATIONS = 600000"),
  "new password hashes must use 600,000 PBKDF2-SHA256 iterations");
assert.ok(worker.includes("password_iterations INTEGER NOT NULL DEFAULT 100000"),
  "legacy account hashes must retain their original iteration count");
assert.ok(worker.includes("storedIterations < PASSWORD_HASH_ITERATIONS"),
  "successful logins must upgrade legacy password hashes");
assert.ok(worker.includes("hasValidRasterImageSignature"),
  "uploaded raster files must be checked by signature");
assert.ok(worker.includes("const ownerLimit = user.isAnonymous ? 5 * 1024 * 1024 : 50 * 1024 * 1024"),
  "image storage must have per-owner quotas");
assert.ok(worker.includes('authRateLimited(request, env, "image-upload", uploadLimit, 10 * 60 * 1000)'),
  "authenticated and anonymous image uploads must be rate limited");
assert.ok(worker.includes('authRateLimited(request, env, "document-render", 180, 60 * 1000)'),
  "uncached API page renders must be rate limited");
assert.ok(worker.includes('authRateLimited(request, env, "document-ssr", 180, 60 * 1000)'),
  "full-document SSR requests must be rate limited");

console.log("AonWiki security regression checks passed.");
