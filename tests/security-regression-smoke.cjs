const assert = require("node:assert/strict");
const fs = require("node:fs");

const worker = fs.readFileSync("worker/src/index.js", "utf8");
const app = fs.readFileSync("app.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");

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
assert.ok(worker.includes("const MAX_PBKDF2_ITERATIONS_PER_CALL = 100000"),
  "no Cloudflare Web Crypto PBKDF2 call may exceed 100,000 iterations");
assert.ok(worker.includes("if (rounds <= MAX_PBKDF2_ITERATIONS_PER_CALL)"),
  "legacy 100,000-round password hashes must retain their original derivation");
assert.ok(worker.includes('AonWiki-PBKDF2-SHA256-chain-v1:'),
  "stronger password hashes must use a domain-separated sequential PBKDF2 chain");
assert.ok(worker.includes("Math.min(MAX_PBKDF2_ITERATIONS_PER_CALL, remaining)"),
  "each PBKDF2 stage must be capped at 100,000 rounds");
assert.ok(worker.includes("while (remaining > 0)"),
  "all configured PBKDF2 work must be completed across chained stages");
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

assert.ok(worker.includes('const SESSION_IDLE_TIMEOUT_MS = 5 * 60 * 1000'),
  "account sessions must expire after five minutes of inactivity");
assert.ok(worker.includes('const SESSION_ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1000'),
  "account sessions must have a twelve-hour absolute lifetime");
assert.ok(worker.includes('"__Host-aon_session"'),
  "account sessions must use a host-only cookie name");
assert.ok(worker.includes('HttpOnly; SameSite='),
  "account session cookies must be inaccessible to JavaScript");
assert.ok(worker.includes('"Set-Cookie": makeSessionCookie(session.token, request)'),
  "login and password change must set an HttpOnly session cookie");
assert.ok(worker.includes('"Set-Cookie": clearSessionCookie()'),
  "logout must clear the session cookie");
assert.ok(worker.includes('const passivePagePoll = url.pathname === "/api/pages" && url.searchParams.has("created_after")'),
  "the one-minute background new-page poll must not extend idle sessions");
assert.ok(worker.includes("!passivePagePoll &&"),
  "background polling must be excluded from idle-session refresh");
assert.ok(worker.includes("absolute_expires_at"),
  "session absolute expiration must be enforced in D1");
assert.ok(worker.includes('request.headers.get("X-AonWiki-Admin-Token")'),
  "the separate admin master token must not share the user session channel");
assert.ok(app.includes('credentials:"include"'),
  "the frontend must send allowed session cookies with API requests");
assert.ok(app.includes('ADMIN_TOKEN_SETTING="aonwiki-admin-token"'),
  "the admin key must have separate browser storage from account sessions");
assert.ok(!app.includes('sessionStorage.setItem(TOKEN_SETTING'),
  "the frontend must never store an account session credential in JavaScript storage");
assert.ok(html.includes('app.bundle.js?v=20261121-experience-readability-v4'),
  "the updated cookie-auth client must have a new cache key");
