import initAonNamuMark, { RendererOptions, parse_with_callbacks_and_options } from "../../Namu_test-main/namumark.js";
import AON_NAMU_WASM_MODULE from "../../Namu_test-main/namumark_bg.wasm";

let aonNamuWasmPromise = null;
async function ensureAonNamuWasm() {
  if (!aonNamuWasmPromise) {
    aonNamuWasmPromise = initAonNamuMark({ module_or_path: AON_NAMU_WASM_MODULE })
      .catch(error => { aonNamuWasmPromise = null; throw error; });
  }
  return aonNamuWasmPromise;
}
// Keep Worker builds in sync with the regenerated SSR parser bundle.
function response(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers }
  });
}
function getSecurityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), usb=(), xr-spatial-tracking=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Origin-Agent-Cluster": "?1",
    "X-Permitted-Cross-Domain-Policies": "none",
    "X-DNS-Prefetch-Control": "off",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  };
}
function getCors(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGIN || "https://hiakdhs323-cmd.github.io").split(",").map(v => v.trim()).filter(Boolean);
  const trustedOrigin = origin && allowed.includes(origin) ? origin : (allowed[0] || "");
  return {
    ...getSecurityHeaders(),
    ...(trustedOrigin ? { "Access-Control-Allow-Origin": trustedOrigin } : {}),
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Admin-Bootstrap-Secret,X-AonWiki-Request",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
function isStateChangingMethod(method) {
  return !["GET", "HEAD", "OPTIONS"].includes(String(method || "").toUpperCase());
}
function isTrustedStateChangingRequest(request, env) {
  if (!isStateChangingMethod(request.method)) return true;
  if (request.headers.get("X-AonWiki-Request") !== "1") return false;
  const origin = request.headers.get("Origin");
  if (origin) {
    const allowed = (env.ALLOWED_ORIGIN || "").split(",").map(v => v.trim()).filter(Boolean);
    const sameOrigin = (() => {
      try { return origin === new URL(request.url).origin; } catch { return false; }
    })();
    if (!sameOrigin && !allowed.includes(origin)) return false;
  }
  return true;
}
async function readJsonBody(request, maxBytes = 512 * 1024) {
  const contentType = String(request.headers.get("Content-Type") || "").toLowerCase().split(";")[0].trim();
  if (contentType !== "application/json" && !contentType.endsWith("+json")) {
    const error = new Error("JSON 요청은 application/json 형식이어야 합니다.");
    error.status = 415;
    throw error;
  }
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > maxBytes) {
    const error = new Error("JSON 요청 본문이 너무 큽니다.");
    error.status = 413;
    throw error;
  }
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      const error = new Error("올바른 JSON 객체가 필요합니다.");
      error.status = 400;
      throw error;
    }
    return parsed;
  } catch (error) {
    if (error?.status) throw error;
    const invalid = new Error("올바른 JSON 요청이 아닙니다.");
    invalid.status = 400;
    throw invalid;
  }
}
function cleanTitle(value) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 120);
}

function namuFileHash(data) {
  let hash = 2166136261;
  for (let i = 0; i < data.length; i++) {
    hash ^= data.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const parts = [];
  for (let i = 0; i < 7; i++) {
    const value = Math.imul(hash ^ (0x9e3779b9 * (i + 1)), 0x85ebca6b);
    parts.push((value >>> 0).toString(16).padStart(8, "0"));
  }
  return parts.join("").slice(0, 56);
}
let authRateLimitSchemaPromise = null;
let adminTokenSchemaPromise = null;
let wikiAdminSchemaPromise = null;

async function ensureAuthRateLimitSchema(env) {
  if (!authRateLimitSchemaPromise) {
    authRateLimitSchemaPromise = env.DB.prepare("CREATE TABLE IF NOT EXISTS auth_rate_limits (ip TEXT NOT NULL, action TEXT NOT NULL, attempts INTEGER NOT NULL, window_started_at TEXT NOT NULL, PRIMARY KEY(ip, action))").run()
      .catch(error => { authRateLimitSchemaPromise = null; throw error; });
  }
  await authRateLimitSchemaPromise;
}
async function authRateLimited(request, env, action, limit, windowMs) {
  await ensureAuthRateLimitSchema(env);
  const ip = String(request.headers.get("CF-Connecting-IP") || "unknown").slice(0, 64);
  const now = new Date().toISOString();
  const row = await env.DB.prepare("SELECT attempts, window_started_at FROM auth_rate_limits WHERE ip = ? AND action = ?").bind(ip, action).first();
  const age = row ? Date.now() - Date.parse(row.window_started_at) : Infinity;
  if (row && age >= 0 && age < windowMs && Number(row.attempts) >= limit) return true;
  if (!row || age < 0 || age >= windowMs) {
    await env.DB.prepare("INSERT INTO auth_rate_limits (ip, action, attempts, window_started_at) VALUES (?, ?, 1, ?) ON CONFLICT(ip, action) DO UPDATE SET attempts = 1, window_started_at = excluded.window_started_at").bind(ip, action, now).run();
  } else {
    await env.DB.prepare("UPDATE auth_rate_limits SET attempts = attempts + 1 WHERE ip = ? AND action = ?").bind(ip, action).run();
  }
  return false;
}
async function ensureAdminTokenTable(env) {
  if (!adminTokenSchemaPromise) {
    adminTokenSchemaPromise = (async () => {
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS admin_tokens (id TEXT PRIMARY KEY NOT NULL, token_hash TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS admin_auth_attempts (ip TEXT PRIMARY KEY NOT NULL, attempts INTEGER NOT NULL, window_started_at TEXT NOT NULL)").run();
    })().catch(error => { adminTokenSchemaPromise = null; throw error; });
  }
  await adminTokenSchemaPromise;
}
async function ensureWikiAdminSchema(env) {
  if (!wikiAdminSchemaPromise) {
    wikiAdminSchemaPromise = env.DB.prepare("CREATE TABLE IF NOT EXISTS wiki_admins (user_id TEXT PRIMARY KEY NOT NULL, granted_at TEXT NOT NULL, granted_by TEXT NOT NULL)").run()
      .catch(error => { wikiAdminSchemaPromise = null; throw error; });
  }
  await wikiAdminSchemaPromise;
}
function constantTimeEqual(left, right) {
  const a = String(left || ""), b = String(right || "");
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return difference === 0;
}
async function isAdminRequest(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return false;
  await ensureAdminTokenTable(env);
  const ip = String(request.headers.get("CF-Connecting-IP") || "unknown").slice(0, 64);
  const now = new Date().toISOString();
  const rate = await env.DB.prepare("SELECT attempts, window_started_at FROM admin_auth_attempts WHERE ip = ?").bind(ip).first();
  const windowAge = rate ? Date.now() - Date.parse(rate.window_started_at) : Infinity;
  if (rate && windowAge >= 0 && windowAge < 15 * 60 * 1000 && Number(rate.attempts) >= 10) return false;

  const presented = authorization.slice(7);
  const saved = await env.DB.prepare("SELECT token_hash FROM admin_tokens WHERE id = 'primary'").first();
  let valid = false;
  if (saved) {
    valid = constantTimeEqual(await sha256(presented), saved.token_hash);
  } else if (env.ADMIN_TOKEN) {
    valid = constantTimeEqual(presented, env.ADMIN_TOKEN);
  }
  if (valid) {
    if (!saved) {
      await env.DB.prepare("INSERT INTO admin_tokens (id, token_hash, updated_at) VALUES ('primary', ?, ?) ON CONFLICT(id) DO NOTHING")
        .bind(await sha256(presented), now).run();
      const confirmed = await env.DB.prepare("SELECT token_hash FROM admin_tokens WHERE id = 'primary'").first();
      valid = Boolean(confirmed && constantTimeEqual(await sha256(presented), confirmed.token_hash));
    }
    if (valid) {
      await env.DB.prepare("DELETE FROM admin_auth_attempts WHERE ip = ?").bind(ip).run();
      return true;
    }
  }
  if (!rate || windowAge < 0 || windowAge >= 15 * 60 * 1000) {
    await env.DB.prepare("INSERT INTO admin_auth_attempts (ip, attempts, window_started_at) VALUES (?, 1, ?) ON CONFLICT(ip) DO UPDATE SET attempts = 1, window_started_at = excluded.window_started_at")
      .bind(ip, now).run();
  } else {
    await env.DB.prepare("UPDATE admin_auth_attempts SET attempts = attempts + 1 WHERE ip = ?").bind(ip).run();
  }
  return false;
}
async function currentUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const tokenHash = await sha256(auth.slice(7));
  const now = new Date().toISOString();
  const user = await env.DB.prepare("SELECT users.id, users.username FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?").bind(tokenHash, now).first();
  if (user) {
    await ensureWikiAdminSchema(env);
    const admin = await env.DB.prepare("SELECT user_id FROM wiki_admins WHERE user_id = ?").bind(user.id).first();
    return { username: user.username, role: admin ? "admin" : "user", isAdmin: Boolean(admin) };
  }
  if (await isAdminRequest(request, env)) return { username: "위키 관리자", role: "admin", isAdmin: true };
  return null;
}
function anonymousEditorIdentity(request) {
  const raw = String(request.headers.get("CF-Connecting-IP") || "").trim().toLowerCase();
  let label = "IP 알 수 없음";
  const ipv4 = raw.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4 && ipv4.slice(1).every(part => Number(part) >= 0 && Number(part) <= 255)) {
    label = "IP " + ipv4[1] + "." + ipv4[2] + "." + ipv4[3] + ".*";
  } else if (raw.includes(":")) {
    const groups = raw.split("%")[0].split(":").filter(Boolean);
    label = groups.length >= 4 ? "IP " + groups.slice(0, 4).join(":") + ":*" : "IP IPv6:*";
  }
  return { username: label, role: "anonymous", isAdmin: false, isAnonymous: true };
}
let pageProtectionSchemaPromise = null;
let officialDocumentSchemaPromise = null;
let pageAliasSchemaPromise = null;
let pageLinkColorsSchemaPromise = null;
let imageSchemaPromise = null;
async function ensurePageProtectionSchema(env) {
  if (!pageProtectionSchemaPromise) {
    pageProtectionSchemaPromise = env.DB.prepare("CREATE TABLE IF NOT EXISTS page_protections (title TEXT PRIMARY KEY NOT NULL, level TEXT NOT NULL CHECK(level IN ('registered','admin')), reason TEXT NOT NULL DEFAULT '', protected_by TEXT NOT NULL, updated_at TEXT NOT NULL)").run()
      .catch(error => { pageProtectionSchemaPromise = null; throw error; });
  }
  await pageProtectionSchemaPromise;
}
async function ensureOfficialDocumentSchema(env) {
  if (!officialDocumentSchemaPromise) {
    officialDocumentSchemaPromise = env.DB.prepare("CREATE TABLE IF NOT EXISTS official_documents (title TEXT PRIMARY KEY NOT NULL, marked_by TEXT NOT NULL, updated_at TEXT NOT NULL)").run()
      .catch(error => { officialDocumentSchemaPromise = null; throw error; });
  }
  await officialDocumentSchemaPromise;
}
async function checkPageEditPermission(env, user, title, protectionTitle = title) {
  if (!user) return { status: 401, error: "문서를 편집하려면 로그인하세요." };
  if (title === "대문" && !user.isAdmin) return { status: 403, error: "대문은 위키 관리자만 편집하거나 복원할 수 있습니다." };
  await ensurePageProtectionSchema(env);
  const protection = await env.DB.prepare("SELECT level FROM page_protections WHERE title = ?").bind(protectionTitle).first();
  if (protection?.level === "admin" && !user.isAdmin) {
    return { status: 403, error: "이 문서는 관리자만 편집하거나 복원할 수 있도록 보호되어 있습니다." };
  }
  if (protection?.level === "registered" && !user.isAdmin && user.role !== "user") {
    return { status: 403, error: "이 문서는 로그인한 회원만 편집하거나 복원할 수 있도록 보호되어 있습니다." };
  }
  return null;
}
async function ensurePageAliasSchema(env) {
  if (!pageAliasSchemaPromise) {
    pageAliasSchemaPromise = (async () => {
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS page_aliases (alias TEXT PRIMARY KEY COLLATE NOCASE, title TEXT NOT NULL, created_at TEXT NOT NULL)").run();
      await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_page_aliases_title ON page_aliases(title)").run();
    })().catch(error => { pageAliasSchemaPromise = null; throw error; });
  }
  await pageAliasSchemaPromise;
}
async function ensurePageLinkColorsSchema(env) {
  if (!pageLinkColorsSchemaPromise) {
    pageLinkColorsSchemaPromise = env.DB.prepare("CREATE TABLE IF NOT EXISTS page_link_colors (title TEXT PRIMARY KEY NOT NULL, config_json TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL DEFAULT '')").run()
      .catch(error => { pageLinkColorsSchemaPromise = null; throw error; });
  }
  await pageLinkColorsSchemaPromise;
}
async function ensureImageSchema(env) {
  if (!imageSchemaPromise) {
    imageSchemaPromise = (async () => {
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY NOT NULL, content_type TEXT NOT NULL, data_base64 TEXT NOT NULL, filename TEXT NOT NULL, created_at TEXT NOT NULL, owner TEXT NOT NULL DEFAULT '')").run();
      const columns = await env.DB.prepare("PRAGMA table_info(images)").all();
      if (!(columns.results || []).some(column => column.name === "owner")) {
        await env.DB.prepare("ALTER TABLE images ADD COLUMN owner TEXT NOT NULL DEFAULT ''").run();
      }
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS image_aliases (alias TEXT PRIMARY KEY COLLATE NOCASE, image_id TEXT NOT NULL, created_at TEXT NOT NULL)").run();
    })().catch(error => { imageSchemaPromise = null; throw error; });
  }
  await imageSchemaPromise;
}

let discussionSchemaPromise = null;
async function ensureDiscussionSchema(env) {
  if (!discussionSchemaPromise) {
    discussionSchemaPromise = (async () => {
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS discussions (id INTEGER PRIMARY KEY AUTOINCREMENT, page_title TEXT NOT NULL DEFAULT '', title TEXT NOT NULL, body TEXT NOT NULL, author TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_post_at TEXT NOT NULL, reply_count INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')), deleted_at TEXT NOT NULL DEFAULT '', deleted_by TEXT NOT NULL DEFAULT '')").run();
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS discussion_posts (id INTEGER PRIMARY KEY AUTOINCREMENT, discussion_id INTEGER NOT NULL, body TEXT NOT NULL, author TEXT NOT NULL, created_at TEXT NOT NULL, edited_at TEXT NOT NULL DEFAULT '', is_deleted INTEGER NOT NULL DEFAULT 0, FOREIGN KEY(discussion_id) REFERENCES discussions(id))").run();
      await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_discussions_last_post ON discussions(deleted_at, last_post_at DESC)").run();
      await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_discussions_page_title ON discussions(page_title, deleted_at, last_post_at DESC)").run();
      await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_discussion_posts_topic ON discussion_posts(discussion_id, id)").run();
    })().catch(error => { discussionSchemaPromise = null; throw error; });
  }
  await discussionSchemaPromise;
}

function cleanImageName(value, contentType) {
  const extension = ({ "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp", "image/svg+xml": "svg" })[contentType] || "img";
  let name = String(value || "").normalize("NFC").replace(/[\\/:*?"<>|]/g, "_").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  name = name.replace(/\.[^.]*$/, "").replace(/[. ]+$/g, "").slice(0, 100);
  if (!name) name = "image";
  return name + "." + extension;
}
function validateSvgUpload(text) {
  const svg = String(text || "").trim();
  if (!svg || svg.length > 1024 * 1024) throw new Error("SVG 파일은 1MB 이하만 지원합니다.");
  if (!/^<svg(?:\s|>)/i.test(svg.replace(/^<\?xml[^>]*>\s*/i, ""))) throw new Error("올바른 SVG 파일이 아닙니다.");
  if (/<!DOCTYPE|<!ENTITY|<\s*(?:script|foreignObject|iframe|object|embed|audio|video|use)\b|\bon[a-z]+\s*=|javascript\s*:|data\s*:\s*text\/html|url\s*\(\s*['"]?\s*(?:https?:|\/\/|javascript:)|\b(?:href|xlink:href)\s*=\s*['"]\s*(?:https?:|\/\/|javascript:|data:)/i.test(svg)) {
    throw new Error("보안상 스크립트, 외부 리소스 또는 실행 가능한 요소가 포함된 SVG는 업로드할 수 없습니다.");
  }
  if (!/<\/svg\s*>\s*$/i.test(svg)) throw new Error("SVG 문서가 올바르게 닫혀 있지 않습니다.");
  return svg;
}
function makeAdminToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
// Must stay byte-for-byte compatible with the hash emitted by NamuMark's [[파일:...]] renderer.
function imageFileHash(value) {
  let hash = 2166136261;
  const input = String(value || "");
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const parts = [];
  for (let i = 0; i < 7; i++) {
    const mixed = Math.imul(hash ^ (2654435769 * (i + 1)), 2246822507);
    parts.push((mixed >>> 0).toString(16).padStart(8, "0"));
  }
  return parts.join("").slice(0, 56);
}
function imageNameMatches(filename, hash, extension) {
  const value = String(filename || "");
  const dot = value.lastIndexOf(".");
  const base = dot > 0 ? value.slice(0, dot) : value;
  const ext = dot > 0 ? value.slice(dot + 1).toLowerCase() : "jpg";
  return imageFileHash(base).toLowerCase() === String(hash || "").toLowerCase()
    && ext === String(extension || "").toLowerCase();
}


const SERVER_WIKI_TAGS = new Set("A ABBR B BDI BDO BLOCKQUOTE BR CAPTION CENTER CODE COL COLGROUP DD DEL DETAILS DIV DL DT EM FIGCAPTION FIGURE FONT FOOTNOTE_TITLE H1 H2 H3 H4 H5 H6 HR I IFRAME IMG INS KBD LI MARK OL P PRE Q RUBY RT RP S SAMP SMALL SPAN STRIKE STRONG STYLE SUB SUMMARY SUP TABLE TBODY TD TFOOT TH THEAD TR TT U UL VAR VIDEO AUDIO SOURCE".split(" "));
const SERVER_WIKI_ATTRS = new Set("alt allow allowfullscreen class colspan data-namumark-action fn_target frameborder height href id lang loading open poster referrerpolicy rel rowspan src start style target title type width align valign controls loop muted".split(" "));
function sanitizeServerWikiStyle(raw) {
  const allowed = new Set(["color","background","background-color","font-size","font-weight","font-style","text-align","text-decoration","text-transform","line-height","letter-spacing","word-spacing","width","max-width","min-width","height","max-height","min-height","margin","margin-left","margin-right","margin-top","margin-bottom","padding","border","border-top","border-right","border-bottom","border-left","border-color","border-top-color","border-right-color","border-bottom-color","border-left-color","border-width","border-top-width","border-right-width","border-bottom-width","border-left-width","border-style","border-top-style","border-right-style","border-bottom-style","border-left-style","border-radius","border-collapse","float","clear","display","vertical-align","white-space","list-style-type","image-rendering","object-fit","overflow","overflow-wrap","box-shadow","opacity"]);
  const themeVariable = /^--aonwiki-table-(?:(?:bg|fg|border)-(?:light|dark)|auto-fg-(?:light|dark))$/;
  const safeColor = /^(?:#[0-9a-f]{3,8}|[a-z]{1,24}|(?:rgba?|hsla?)\([\d.%+\-/ ,]+\))$/i;
  const output=[];
  String(raw||"").split(";").forEach(entry=>{
    const at=entry.indexOf(":");if(at<1)return;
    const rawKey=entry.slice(0,at).trim().toLowerCase();
    const key=rawKey.replace(/^\\2d\s+\\2d\s+/i,"--");
    const value=entry.slice(at+1).trim();
    const isThemeVariable=themeVariable.test(key);
    if((!allowed.has(key)&&!isThemeVariable)||!value||/url\s*\(|expression|javascript|@import|[<>{}]/i.test(value))return;
    if(isThemeVariable&&!safeColor.test(value))return;
    output.push(key+":"+value);
  });
  return output.join(";");
}
function sanitizeServerWikiStylesheet(raw) {
  const allowedSelectorPart=/^(?:\*|[a-z][a-z0-9-]*|[.#][a-z_][a-z0-9_-]*)(?::(?:hover|focus|active|first-child|last-child|only-child|nth-child\(\d+(?:n[+-]\d+)?\)|nth-of-type\(\d+(?:n[+-]\d+)?\)))?$/i;
  const rules=String(raw||"").replace(/\/\*[\s\S]*?\*\//g,"").match(/[^{}]+\{[^{}]*\}/g)||[];
  const safe=[];
  for(const rule of rules){
    const brace=rule.indexOf("{");
    const declarations=sanitizeServerWikiStyle(rule.slice(brace+1,rule.lastIndexOf("}")));
    if(!declarations)continue;
    const selectors=rule.slice(0,brace).trim().split(",").map(value=>value.trim());
    if(!selectors.length||selectors.length>20)continue;
    const valid=selectors.filter(selector=>{
      const parts=selector.split(/\s*>\s*|\s+/).filter(Boolean);
      return parts.length>0&&parts.length<=8&&parts.every(part=>allowedSelectorPart.test(part));
    });
    if(valid.length)safe.push(valid.map(selector=>".wiki-content "+selector).join(",")+"{"+declarations+"}");
  }
  return safe.join("\n");
}
const ADMIN_LINK_COLOR_KEYS = new Set(["light", "dark", "visited-light", "visited-dark", "hover-light", "hover-dark"]);
function normalizeAdminLinkColor(value) {
  const color = String(value || "").trim();
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) return color.toLowerCase();
  if (/^[a-z]{1,20}$/i.test(color) && !/^(?:inherit|initial|unset|revert|revert-layer|currentcolor)$/i.test(color)) return color.toLowerCase();
  if (/^rgba?\(\s*\d{1,3}(?:\.\d+)?%?(?:\s*,\s*|\s+)\d{1,3}(?:\.\d+)?%?(?:\s*,\s*|\s+)\d{1,3}(?:\.\d+)?%?(?:\s*[,/]\s*(?:0|1|0?\.\d+|\d{1,3}%))?\s*\)$/i.test(color)) return color;
  if (/^hsla?\(\s*-?\d+(?:\.\d+)?(?:deg|rad|turn)?(?:\s*,\s*|\s+)\d{1,3}(?:\.\d+)?%(?:\s*,\s*|\s+)\d{1,3}(?:\.\d+)?%(?:\s*[,/]\s*(?:0|1|0?\.\d+|\d{1,3}%))?\s*\)$/i.test(color)) return color;
  return "";
}
function extractAdminLinkColors(source) {
  const colors = {}, errors = [];
  let found = false;
  const input = String(source || "");
  const content = input.replace(/^\{\{\{#!linkcolor[ \t]*\r?\n([\s\S]*?)^\}\}\}[ \t]*(?:\r?\n|$)/gim, (_block, body) => {
    found = true;
    for (const [index, rawLine] of String(body || "").split(/\r?\n/).entries()) {
      const line = rawLine.trim();
      if (!line) continue;
      const separator = line.indexOf(":");
      if (separator < 1) { errors.push("링크 색상 설정 " + (index + 1) + "번째 줄은 key: color 형식이어야 합니다."); continue; }
      const key = line.slice(0, separator).trim().toLowerCase();
      if (!ADMIN_LINK_COLOR_KEYS.has(key)) { errors.push("지원하지 않는 링크 색상 항목입니다: " + key); continue; }
      const normalized = normalizeAdminLinkColor(line.slice(separator + 1).trim());
      if (!normalized) { errors.push("올바르지 않은 색상 값입니다: " + key); continue; }
      colors[key] = normalized;
    }
    return "";
  });
  if (/\{\{\{#!linkcolor\b/i.test(input) && !found) errors.push("링크 색상 설정 블록을 }}} 로 닫아야 합니다.");
  return { content, colors, found, errors };
}
function buildAdminLinkColorMarkup(html, colors) {
  const selectors = {
    light: 'html[data-theme="light"] .aonwiki-page-content a:not(.not-exist):not(.wiki-heading-number)',
    dark: 'html[data-theme="dark"] .aonwiki-page-content a:not(.not-exist):not(.wiki-heading-number)',
    "visited-light": 'html[data-theme="light"] .aonwiki-page-content a:not(.not-exist):not(.wiki-heading-number):visited',
    "visited-dark": 'html[data-theme="dark"] .aonwiki-page-content a:not(.not-exist):not(.wiki-heading-number):visited',
    "hover-light": 'html[data-theme="light"] .aonwiki-page-content a:not(.not-exist):not(.wiki-heading-number):hover',
    "hover-dark": 'html[data-theme="dark"] .aonwiki-page-content a:not(.not-exist):not(.wiki-heading-number):hover'
  };
  const rules = [];
  for (const [key, selector] of Object.entries(selectors)) {
    const color = normalizeAdminLinkColor(colors?.[key]);
    if (color) rules.push(selector + "{color:" + color + " !important}");
  }
  if (!rules.length) return String(html || "");
  // Heading section numbers are structural navigation, not page-authored body links.
  // Keep them in the wiki link palette even when a document defines custom link colors.
  rules.push('html[data-theme="light"] .aonwiki-page-content a.wiki-heading-number, html[data-theme="dark"] .aonwiki-page-content a.wiki-heading-number, html[data-theme="light"] .aonwiki-page-content a.wiki-heading-number:visited, html[data-theme="dark"] .aonwiki-page-content a.wiki-heading-number:visited, html[data-theme="light"] .aonwiki-page-content a.wiki-heading-number:hover, html[data-theme="dark"] .aonwiki-page-content a.wiki-heading-number:hover {color:var(--wiki-link) !important}');
  // Explicit NamuMark text colors take precedence over page-wide link colors,
  // including configured visited and hover states.
  rules.push('.aonwiki-page-content span[style*="color"] a, .aonwiki-page-content span[style*="color"] a:visited, .aonwiki-page-content span[style*="color"] a:hover{color:inherit !important}');

  return "<style>" + rules.join("\n") + "</style><div class=\"aonwiki-page-content\">" + String(html || "") + "</div>";
}
async function getPageLinkColors(env, title) {
  await ensurePageLinkColorsSchema(env);
  const row = await env.DB.prepare("SELECT config_json FROM page_link_colors WHERE title = ?").bind(title).first();
  if (!row) return {};
  try {
    const saved = JSON.parse(row.config_json || "{}"), colors = {};
    for (const key of ADMIN_LINK_COLOR_KEYS) { const color = normalizeAdminLinkColor(saved?.[key]); if (color) colors[key] = color; }
    return colors;
  } catch { return {}; }
}
async function savePageLinkColors(env, title, extracted, editor) {
  await ensurePageLinkColorsSchema(env);
  if (!extracted?.found || !Object.keys(extracted.colors || {}).length) {
    await env.DB.prepare("DELETE FROM page_link_colors WHERE title = ?").bind(title).run();
    return;
  }
  await env.DB.prepare("INSERT INTO page_link_colors (title, config_json, updated_at, updated_by) VALUES (?, ?, ?, ?) ON CONFLICT(title) DO UPDATE SET config_json = excluded.config_json, updated_at = excluded.updated_at, updated_by = excluded.updated_by")
    .bind(title, JSON.stringify(extracted.colors), new Date().toISOString(), String(editor || "")).run();
}
function collectIncludeTargets(source) {
  const targets=[];
  for(const match of String(source||"").matchAll(/\[include\(((?:(?!\[include\(|\)\]).)+)\)\]/gi)){
    const first=String(match[1]||"").split(",")[0].trim();
    if(first&&!first.includes("="))targets.push(first);
  }
  return targets;
}
function collectCategoryTargets(source) {
  const targets=[];
  for(const match of String(source||"").matchAll(/\[\[(?:분류|category):([^\]|]+)(?:\|[^\]]*)?\]\]/gi)){
    const name=String(match[1]||"").trim();
    if(name)targets.push(name);
  }
  return targets;
}
function collectWikiLinkTargets(source) {
  const targets = new Set();
  const text = String(source || "");
  // Nested links are legal in NamuMark, e.g. [[Page|{{{#!wiki ... [[파일:x.png]] ...}}}]].
  // The generic [[...]] matcher stops at the inner ]] and therefore misses the
  // file target entirely. Collect file/category targets independently first.
  for (const match of text.matchAll(/\[\[(?:파일|file):([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/gi)) {
    const name = String(match[1] || "").trim();
    if (name) targets.add("file:" + name);
  }
  for (const match of text.matchAll(/\[\[(?:분류|category):([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/gi)) {
    const name = String(match[1] || "").trim();
    if (name) targets.add("category:" + name);
  }
  for (const match of text.matchAll(/\[\[([^\]]+)\]\]/g)) {
    let target = String(match[1] || "").split("|")[0].trim();
    if (!target || target.startsWith("#") || /^https?:\/\//i.test(target)) continue;
    const hash = target.indexOf("#");
    if (hash >= 0) target = target.slice(0, hash).trim();
    if (!target) continue;
    if (/^(?:분류|category):/i.test(target)) {
      targets.add("category:" + target.replace(/^(?:분류|category):/i, ""));
    } else if (/^(?:파일|file):/i.test(target)) {
      targets.add("file:" + target.replace(/^(?:파일|file):/i, ""));
    } else {
      targets.add(target);
    }
  }
  return [...targets];
}

// Only load records actually referenced by this document and its transclusions.
// The parser uses database.data.length for the page-count magic word, and lookup
// for existence checks, so a sparse array preserves the count without loading
// every page title into memory on each Worker isolate.
async function buildNamuServerDatabase(env, title, content) {
  const source = String(content || "");
  const records = new Map([[title, { title, data: source }]]);
  const visitedIncludes = new Set([title]);
  let pendingIncludes = collectIncludeTargets(source);
  let includedCount = 0;
  const maxIncludes = 50;

  // Includes are intentionally bounded. A malformed include graph must never
  // turn one page render into an unbounded D1/CPU workload.
  for (let depth = 0; depth < 4 && pendingIncludes.length && includedCount < maxIncludes; depth++) {
    const batch = [...new Set(pendingIncludes)]
      .filter(name => name && !visitedIncludes.has(name))
      .slice(0, Math.min(40, maxIncludes - includedCount));
    pendingIncludes = [];
    if (!batch.length) break;
    batch.forEach(name => visitedIncludes.add(name));
    const placeholders = batch.map(() => "?").join(",");
    const result = await env.DB.prepare(
      "SELECT title, content FROM pages WHERE title IN (" + placeholders + ")"
    ).bind(...batch).all();

    for (const page of result.results || []) {
      const item = { title: page.title, data: String(page.content || "") };
      records.set(page.title, item);
      includedCount++;
      pendingIncludes.push(...collectIncludeTargets(item.data));
      if (includedCount >= maxIncludes) break;
    }
  }

  const allMarkup = [...records.values()].map(item => item.data || "").join("\n");
  const linkTargets = new Set(collectWikiLinkTargets(allMarkup));
  // collectWikiLinkTargets already extracts category aliases; reuse that set
  // instead of scanning the same markup with a second category-only regex.
  const categoryAliases = new Set(
    [...linkTargets].filter(name => name.startsWith("category:"))
  );
  for (const alias of categoryAliases) linkTargets.delete(alias);

  // Keep existence lookups bounded. The old implementation created every D1
  // query first and then ran all of them at once, which amplified CPU/memory
  // usage on link-heavy pages.
  const documentTargets = [...linkTargets]
    .filter(name => !name.startsWith("file:") && !records.has(name))
    .slice(0, 900);

  const documentRows = [];
  for (let index = 0; index < documentTargets.length; index += 90) {
    const batch = documentTargets.slice(index, index + 90);
    const placeholders = batch.map(() => "?").join(",");
    const result = await env.DB.prepare(
      "SELECT title FROM pages WHERE title IN (" + placeholders + ")"
    ).bind(...batch).all();
    documentRows.push(...(result.results || []));
  }

  // Resolve only the image names actually referenced by the document. Loading
  // the complete images/image_aliases tables for every page was unnecessarily
  // expensive and could push a Worker over its resource limit.
  const fileTargets = [...linkTargets]
    .filter(name => name.startsWith("file:"))
    .map(name => {
      const raw = name.slice(5);
      try { return decodeURIComponent(raw); } catch { return raw; }
    })
    .filter(Boolean)
    .slice(0, 500);

  const imageRows = [];
  const imageAliasRows = [];
  if (fileTargets.length) {
    await ensureImageSchema(env);
    for (let index = 0; index < fileTargets.length; index += 90) {
      const batch = fileTargets.slice(index, index + 90);
      const placeholders = batch.map(() => "?").join(",");
      const [images, aliases] = await Promise.all([
        env.DB.prepare("SELECT id, filename FROM images WHERE filename COLLATE NOCASE IN (" + placeholders + ")")
          .bind(...batch).all(),
        env.DB.prepare("SELECT alias, image_id FROM image_aliases WHERE alias COLLATE NOCASE IN (" + placeholders + ")")
          .bind(...batch).all()
      ]);
      imageRows.push(...(images.results || []));
      imageAliasRows.push(...(aliases.results || []));
    }
  }

  // Page count is needed by a small number of magic words. Cache it briefly
  // instead of running COUNT(*) on every render.
  const pageCount = /\[pagecount\]/i.test(allMarkup)
    ? await getCachedNamuPageCount(env)
    : { total: 0 };

  for (const row of documentRows) {
    const key = row.title;
    if (key) records.set(key, { title: key, data: "" });
  }
  for (const row of imageRows) {
    const key = "file:" + row.filename;
    if (row.filename) records.set(key, { title: key, data: "" });
  }
  for (const row of imageAliasRows) {
    const key = "file:" + row.alias;
    if (row.alias) records.set(key, { title: key, data: "" });
  }
  for (const categoryTitle of categoryAliases) {
    records.set(categoryTitle, { title: categoryTitle, data: "" });
  }

  const imageMap = new Map();
  for (const row of imageRows) {
    const value = String(row.filename || "");
    const dot = value.lastIndexOf(".");
    const base = dot > 0 ? value.slice(0, dot) : value;
    const ext = dot > 0 ? value.slice(dot + 1).toLowerCase() : "jpg";
    if (row.filename && row.id) imageMap.set(imageFileHash(base).toLowerCase() + "." + ext, row.id);
  }
  for (const row of imageAliasRows) {
    const value = String(row.alias || "");
    const dot = value.lastIndexOf(".");
    const base = dot > 0 ? value.slice(0, dot) : value;
    const ext = dot > 0 ? value.slice(dot + 1).toLowerCase() : "jpg";
    const key = imageFileHash(base).toLowerCase() + "." + ext;
    if (row.alias && row.image_id && !imageMap.has(key)) imageMap.set(key, row.image_id);
  }

  return {
    data: new Array(Math.max(0, Number(pageCount?.total) || 0)),
    lookup: new Map(records),
    imageMap
  };
}

let namuPageCountCache = { value: null, expiresAt: 0 };
let namuPageCountPending = null;
async function getCachedNamuPageCount(env) {
  if (namuPageCountCache.value && namuPageCountCache.expiresAt > Date.now()) {
    return namuPageCountCache.value;
  }
  if (namuPageCountPending) return namuPageCountPending;
  namuPageCountPending = env.DB.prepare("SELECT COUNT(*) AS total FROM pages").first()
    .then(row => {
      const value = { total: Number(row?.total) || 0 };
      namuPageCountCache = { value, expiresAt: Date.now() + 60 * 1000 };
      return value;
    })
    .finally(() => { namuPageCountPending = null; });
  return namuPageCountPending;
}
function rewriteNamuImageUrls(markup, imageMap){
  let source=String(markup||"");
  if(!imageMap?.size) return source;

  // Namu_test-main normally emits /image/<hash>.<ext>.cache_v..., but some
  // versions resolve a local [[파일:...]] as a normal internal/missing link.
  // Handle both forms from the same server-side image map.
  source=source.replace(/(["'])\/image\/([a-f0-9]{56})\.([a-z0-9]+)\.cache_v[0-9]+(?:[?#][^\"']*)?(["'])/gi,
    (full, quote, hash, ext, endQuote) => {
      const id=imageMap.get(hash.toLowerCase()+"."+ext.toLowerCase());
      return id ? quote+"/media/"+id+endQuote : full;
    });

  const decodeHtml = value => String(value || "")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
  const escAttr = value => String(value || "")
    .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;");

  source=source.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi,
    (full, attrs, inner) => {
      const titleMatch = String(attrs || "").match(/\btitle=["']([^"']+)["']/i);
      const hrefMatch = String(attrs || "").match(/\bhref=["']([^"']+)["']/i);
      const text = decodeHtml(String(inner || "").replace(/<[^>]+>/g, "")).trim();
      let filename = titleMatch?.[1] || "";
      if (/^(?:파일|file):/i.test(filename)) filename = filename.replace(/^(?:파일|file):/i, "");
      else if (/^(?:파일|file):/i.test(text)) filename = text.replace(/^(?:파일|file):/i, "");
      else if (hrefMatch && /(?:^|[\\/])(?:파일|file):/i.test(hrefMatch[1])) {
        filename = decodeHtml(hrefMatch[1]).replace(/^.*?(?:파일|file):/i, "");
      } else return full;

      filename = decodeHtml(filename).trim();
      try { filename = decodeURIComponent(filename); } catch {}
      const dot = filename.lastIndexOf(".");
      const base = dot > 0 ? filename.slice(0, dot) : filename;
      const ext = dot > 0 ? filename.slice(dot + 1).toLowerCase() : "jpg";
      const id = imageMap.get(imageFileHash(base).toLowerCase()+"."+ext);
      if (!id) return full;

      return '<span class="wiki-image-align-normal"><span class="wiki-image-wrapper"><a href="/media/'+encodeURIComponent(id)+'" rel="nofollow"><img class="wiki-image" src="/media/'+encodeURIComponent(id)+'" alt="'+escAttr(filename)+'" loading="lazy" decoding="async"></a></span></span>';
    });
  return source;
}
async function sanitizeServerWikiHtml(markup) {
  const source = String(markup || "");
  // NamuMark already escapes source text before generating its trusted HTML.
  // Skip the expensive HTMLRewriter pass when there is no construct that
  // requires sanitization; this is important on the 10 ms Free-plan CPU cap.
  if (!/<(?:script|style|object|embed|form|input|button|link|meta|iframe)\b|\bon[a-z]+\s*=|(?:href|src|poster)\s*=\s*["']\s*(?:javascript|data|vbscript):|srcdoc\s*=|formaction\s*=\s*/i.test(source)) {
    return source;
  }
  const input=new Response(source,{headers:{"Content-Type":"text/html; charset=utf-8"}});
  const rewritten=new HTMLRewriter().on("*",{
    element(element){
      const tag=String(element.tagName||"").toUpperCase();
      if(["SCRIPT","STYLE","OBJECT","EMBED","FORM","INPUT","BUTTON","LINK","META"].includes(tag)){
        element.remove();return;
      }
      if(!SERVER_WIKI_TAGS.has(tag)){
        element.removeAndKeepContent();return;
      }
      for(const [rawName,rawValue] of [...element.attributes]){
        const name=String(rawName).toLowerCase(),value=String(rawValue||"");
        if(name==="onclick"){
          if(tag==="A"&&/^javascript:namumark_heading_folding\('[a-f0-9_]+', this\);?$/i.test(value))element.setAttribute("data-namumark-action","heading-fold");
          element.removeAttribute(rawName);continue;
        }
        if(name.startsWith("on")||!SERVER_WIKI_ATTRS.has(name)){
          element.removeAttribute(rawName);continue;
        }
        if(name==="style"){
          const safe=sanitizeServerWikiStyle(value);
          if(safe)element.setAttribute("style",safe);else element.removeAttribute("style");
          continue;
        }
        if(["href","src","poster"].includes(name)&&/^\s*(?:javascript|data|vbscript):/i.test(value)){
          element.removeAttribute(rawName);continue;
        }
        if(name==="href"&&/^\s*\/\//.test(value))element.removeAttribute(rawName);
      }
      if(tag==="A"){
        const href=element.getAttribute("href")||"";
        if(/^https?:\/\//i.test(href)){
          element.setAttribute("target","_blank");
          element.setAttribute("rel","noopener noreferrer");
        }
      }
      if(tag==="A"){
        const classes=(element.getAttribute("class")||"").split(/\s+/);
        if(classes.includes("not-exist")){
          const current=element.getAttribute("style")||"";
          const cleaned=current.split(";").filter(part=>!/^\s*(?:color|text-decoration)(?:\s|:)/i.test(part)).join(";");
          element.setAttribute("style",(cleaned?cleaned.replace(/;?$/,";"):"")+"color:#d1242f;text-decoration:underline;");
        }
      }
      if(tag==="IFRAME"){
        const src=element.getAttribute("src")||"";
        const allowedHosts=new Set(["www.youtube.com","youtube.com","www.instagram.com","www.facebook.com","www.tiktok.com","twitframe.com","tv.kakao.com","tv.naver.com","embed.nicovideo.jp","player.vimeo.com"]);
        try{
          const parsed=new URL(src);
          if(parsed.protocol!=="https:"||!allowedHosts.has(parsed.hostname)){element.remove();return}
          element.setAttribute("src",parsed.href);
          element.setAttribute("loading","lazy");
          element.setAttribute("referrerpolicy","strict-origin-when-cross-origin");
          element.setAttribute("allowfullscreen","");
        }catch{element.remove();return}
      }
    }
  }).transform(input);
  return await rewritten.text();
}
const namuRenderCache = new Map();
const namuRenderPending = new Map();
// A small D1 cache makes parsed HTML reusable even after a Worker isolate is recycled.
let namuRenderCacheSchemaPromise = null;
async function ensureNamuRenderCacheSchema(env) {
  if (!namuRenderCacheSchemaPromise) {
    namuRenderCacheSchemaPromise = env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS namu_render_cache (title TEXT PRIMARY KEY NOT NULL, source_hash TEXT NOT NULL, html TEXT NOT NULL, metadata_json TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL)"
    ).run().catch(error => { namuRenderCacheSchemaPromise = null; throw error; });
  }
  await namuRenderCacheSchemaPromise;
}
async function clearPersistentNamuRenderCache(env, title = "") {
  try {
    await ensureNamuRenderCacheSchema(env);
    const target = cleanTitle(title);
    if (target) {
      await env.DB.prepare("DELETE FROM namu_render_cache WHERE title = ?").bind(target).run();
    } else {
      await env.DB.prepare("DELETE FROM namu_render_cache").run();
    }
  } catch (error) {
    console.warn("AonWiki persistent render cache clear failed:", error);
  }
}
// Cache complete document API payloads, not only parsed HTML, to avoid repeat D1 reads.
const namuPageResponseCache = new Map();
const namuPageResponsePending = new Map();
function clearNamuPageResponseCache(){namuPageResponseCache.clear();namuPageResponsePending.clear();}
function invalidateNamuServerIndexes() {
  namuRenderCache.clear();
  namuRenderPending.clear();
  clearNamuPageResponseCache();
}
function parseTableColorRgb(value) {
  const input = String(value || "").trim().toLowerCase();
  const named = {black:"#000000",white:"#ffffff",red:"#ff0000",green:"#008000",blue:"#0000ff",yellow:"#ffff00",orange:"#ffa500",purple:"#800080",gray:"#808080",grey:"#808080",navy:"#000080",teal:"#008080"};
  const color = named[input] || input;
  let match = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (match) {
    const hex = match[1].length === 3 ? match[1].split("").map(c => c + c).join("") : match[1];
    return [parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)];
  }
  match = color.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  if (match) return [Number(match[1]),Number(match[2]),Number(match[3])];
  return null;
}
function tableLuminance(rgb) {
  const linear = value => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
}
function tableContrast(a,b) {
  const x=tableLuminance(a),y=tableLuminance(b);
  return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
}
function chooseTableTextColor(backgroundValue, foregroundValue, theme) {
  const canvas = theme === "dark" ? [26,29,32] : [255,255,255];
  const background = parseTableColorRgb(backgroundValue) || canvas;
  const foreground = parseTableColorRgb(foregroundValue);
  if (foreground && tableContrast(foreground,background) >= 4.5) return foregroundValue;
  const black=[0,0,0],white=[255,255,255];
  return tableContrast(black,background) >= tableContrast(white,background) ? "#000000" : "#ffffff";
}
function getInlineStyleProperties(element) {
  const properties = {};
  const style = element.getAttribute("style") || "";
  for (const declaration of style.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 1) continue;
    const name = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();
    if (name && value) properties[name] = value;
  }
  return properties;
}
async function applyTableTextContrast(markup) {
  const tableStack = [];
  const rowStack = [];
  const getThemeValue = (levels, key, theme) => {
    for (const properties of levels) {
      const paired = properties["--aonwiki-table-" + key + "-" + theme];
      if (paired) return paired;
      if (key === "bg") {
        const fixed = properties["background-color"] || properties.background || "";
        if (fixed && !/^transparent$/i.test(fixed)) return fixed;
      } else if (key === "fg" && properties.color && !/^var\(/i.test(properties.color)) {
        return properties.color;
      }
    }
    return "";
  };
  const rewriter = new HTMLRewriter()
    .on("table", { element(el) { tableStack.push(getInlineStyleProperties(el)); }, endTag() { tableStack.pop(); } })
    .on("tr", { element(el) { rowStack.push(getInlineStyleProperties(el)); }, endTag() { rowStack.pop(); } })
    .on("td, th", {
      element(el) {
        const levels = [getInlineStyleProperties(el), rowStack[rowStack.length-1] || {}, tableStack[tableStack.length-1] || {}];
        const authoredLightBg = getThemeValue(levels,"bg","light");
        const authoredDarkBg = getThemeValue(levels,"bg","dark");
        const lightBg = authoredLightBg || authoredDarkBg || "#ffffff";
        const darkBg = authoredDarkBg || authoredLightBg || "#1a1d20";
        const lightFg = getThemeValue(levels,"fg","light");
        const darkFg = getThemeValue(levels,"fg","dark");
        const lightText = chooseTableTextColor(lightBg,lightFg,"light");
        const darkText = chooseTableTextColor(darkBg,darkFg,"dark");
        const current = el.getAttribute("style") || "";
        // Preserve the existing CSS/theme background. Only choose a readable
        // foreground; a authored row/table fill must not be copied onto cells.
        el.setAttribute("style",
          (current.trim() ? current.trim().replace(/;?$/,";") : "") +
          "--aonwiki-table-auto-fg-light:" + lightText + ";" +
          "--aonwiki-table-auto-fg-dark:" + darkText + ";" +
          "color:var(--aonwiki-table-auto-fg-light,var(--wiki-text));"
        );
        if (lightFg || darkFg) el.setAttribute("data-aonwiki-authored-fg", "1");
        else el.removeAttribute("data-aonwiki-authored-fg");
      }
    });
  return await rewriter.transform(new Response(String(markup || ""), {
    headers: {"Content-Type":"text/html; charset=utf-8"}
  })).text();
}

async function expandAonIncludes(env, source) {
  let text = String(source || "");
  const seen = new Set(["아온"]);
  for (let depth = 0; depth < 3; depth++) {
    const matches = [...text.matchAll(/\[include\(([^)]+)\)\]/gi)];
    const names = [...new Set(matches.map(match => String(match[1] || "").trim()).filter(name => name && !name.includes("=") && !seen.has(name)))];
    if (!names.length) break;
    const placeholders = names.map(() => "?").join(",");
    const result = await env.DB.prepare("SELECT title, content FROM pages WHERE title IN (" + placeholders + ")").bind(...names).all();
    const rows = new Map((result.results || []).map(row => [String(row.title), String(row.content || "")]));
    for (const name of names) seen.add(name);
    let changed = false;
    text = text.replace(/\[include\(([^)]+)\)\]/gi, (match, rawName) => {
      const name = String(rawName || "").trim();
      if (!name || name.includes("=") || !rows.has(name)) return match;
      changed = true;
      return "\n" + rows.get(name) + "\n";
    });
    if (!changed) break;
  }
  return text;
}

async function buildAonClientRenderPayload(env, title, source, linkColors = {}) {
  // Keep the constrained Worker responsible only for source expansion and
  // database-backed link/image existence. The browser performs the expensive
  // NamuMark parsing without the Worker's 10 ms CPU ceiling.
  const expandedSource = await expandAonIncludes(env, source);
  const extracted = extractAdminLinkColors(expandedSource);
  const renderSource = extracted.content;
  const database = await buildNamuServerDatabase(env, title, renderSource);
  const records = [...database.lookup.values()].map(item => ({
    title: String(item.title || ""),
    data: String(item.data || "")
  }));
  const imageMap = {};
  for (const [key, id] of database.imageMap || []) {
    if (id) imageMap[String(key)] = String(id);
  }
  return {
    source: renderSource,
    records,
    pageCount: Number(database.data?.length) || 0,
    imageMap,
    linkColors: linkColors || {}
  };
}

async function renderNamuMarkupOnWorker(env, title, source, linkColors = {}) {
  // Build the cache key from the unexpanded page source. This lets warm cache
  // hits return before any transclusion D1 reads or parser preparation.
  const sourceText = String(source || "");
  const colors = {};
  for (const key of ADMIN_LINK_COLOR_KEYS) {
    const color = normalizeAdminLinkColor(linkColors?.[key]);
    if (color) colors[key] = color;
  }
  const sourceDigest = namuFileHash(sourceText + "\n" + JSON.stringify(colors));
  const cacheKey = "namutest-main-v4-images:" + String(title) + ":" + sourceDigest;
  const cached = namuRenderCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (namuRenderPending.has(cacheKey)) return namuRenderPending.get(cacheKey);

  const pending = (async () => {
    try {
      await ensureNamuRenderCacheSchema(env);
      const stored = await env.DB.prepare("SELECT source_hash, html, metadata_json FROM namu_render_cache WHERE title = ?").bind(title).first();
      // Rendered HTML is tied to a specific parser build. Never reuse a
      // persistent entry created by a different renderer version.
      if (stored && stored.source_hash === cacheKey) {
        let metadata = {};
        try { metadata = JSON.parse(stored.metadata_json || "{}"); } catch {}
        const value = { html: String(stored.html || ""), metadata, imageMap: metadata.imageMap || {} };
        namuRenderCache.set(cacheKey, { value, expiresAt: Date.now() + 5 * 60 * 1000 });
        return value;
      }
    } catch (error) {
      console.warn("AonWiki persistent render cache read failed:", error);
    }

    // Only resolve includes after both memory and persistent cache misses.
    // The old order re-read Aon's two templates even when rendered HTML was
    // already cached.
    const renderSource = title === "아온"
      ? await expandAonIncludes(env, sourceText)
      : sourceText;
    const extracted = extractAdminLinkColors(renderSource);
    const renderText = extracted.content;
    const database = await buildNamuServerDatabase(env, title, renderText);

    // Use the exact Namu_test-main WASM renderer for SSR as well as the
    // browser fallback. D1 resolution is prepared before parsing so the WASM
    // callbacks remain synchronous, which keeps the parser deterministic.
    await ensureAonNamuWasm();
    const options = new RendererOptions();
    options.document_url_prefix = "/w/";
    options.document_query_prefix = "/w/";
    options.dark_class = "dark";
    const callbacks = {
      documentExists(name) {
        const key = String(name || "").trim();
        return database.lookup.has(key)
          || database.lookup.has("file:" + key)
          || database.lookup.has("category:" + key);
      },
      getDocumentContent(name) {
        const key = String(name || "").trim();
        return database.lookup.get(key)?.data || "";
      },
      getPagecount() {
        return Number(database.data.length) || 0;
      }
    };
    const parsed = parse_with_callbacks_and_options(renderText, callbacks, options);
    let parsedHtml = "";
    let parsedMetadata = {};
    try {
      parsedHtml = parsed.html || "";
      parsedMetadata = {
        categories: parsed.categories || [],
        backlinks: parsed.backlinks || [],
        redirect_target: parsed.redirect_target,
        redirect_anchor: parsed.redirect_anchor
      };
    } finally {
      parsed.free();
      options.free();
    }
    const cleanHtml = rewriteNamuImageUrls(await sanitizeServerWikiHtml(parsedHtml), database.imageMap);
    // Table contrast requires a second HTMLRewriter pass. Documents without
    // tables do not need it.
    const contrastedHtml = /<table\b/i.test(cleanHtml)
      ? await applyTableTextContrast(cleanHtml)
      : cleanHtml;
    const value = { html: buildAdminLinkColorMarkup(contrastedHtml, colors), metadata: { ...parsedMetadata, imageMap: Object.fromEntries(database.imageMap || []) }, imageMap: Object.fromEntries(database.imageMap || []) };
    namuRenderCache.set(cacheKey, { value, expiresAt: Date.now() + 5 * 60 * 1000 });
    if (namuRenderCache.size > 100) {
      const oldest = namuRenderCache.keys().next().value;
      if (oldest) namuRenderCache.delete(oldest);
    }
    if (value.html.length <= 250000) {
      try {
        await ensureNamuRenderCacheSchema(env);
        await env.DB.prepare("INSERT INTO namu_render_cache (title, source_hash, html, metadata_json, updated_at) VALUES (?, ?, ?, ?, datetime('now')) ON CONFLICT(title) DO UPDATE SET source_hash = excluded.source_hash, html = excluded.html, metadata_json = excluded.metadata_json, updated_at = excluded.updated_at").bind(title, cacheKey, value.html, JSON.stringify(value.metadata || {})).run();
      } catch (error) {
        console.warn("AonWiki persistent render cache write failed:", error);
      }
    } else {
      try {
        await ensureNamuRenderCacheSchema(env);
        await env.DB.prepare("DELETE FROM namu_render_cache WHERE title = ?").bind(title).run();
      } catch {}
    }
    return value;
  })().finally(() => namuRenderPending.delete(cacheKey));

  namuRenderPending.set(cacheKey, pending);
  return pending;
}
async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function safeJsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
function rewriteFrontendAssets(html, frontendOrigin) {
  const baseUrl = new URL(frontendOrigin.replace(/\/+$/, "") + "/");
  const basePath = baseUrl.pathname.endsWith("/") ? baseUrl.pathname : baseUrl.pathname + "/";
  const staticAssets = new Set([
    "style.css",
    "app.js",
    "theme.js",
    "namumark-wasm.js",
    "namumark-aon.css",
    "namumark-interactions-aon.css",
    "Namu_test-main/namumark.js",
    "Namu_test-main/namumark_bg.wasm",
    "Namu_test-main/interactions.js",
    "aonwiki-mark.svg"
  ]);
  return String(html).replace(/\b(href|src)\s*=\s*(["'])(.*?)\2/gi, (attribute, name, quote, rawUrl) => {
    let parsed;
    try { parsed = new URL(String(rawUrl).trim(), baseUrl); }
    catch { return attribute; }
    if (parsed.origin !== baseUrl.origin || !parsed.pathname.startsWith(basePath)) return attribute;
    let assetPath;
    try { assetPath = decodeURIComponent(parsed.pathname.slice(basePath.length)); }
    catch { return attribute; }
    if (!staticAssets.has(assetPath)) return attribute;
    parsed.searchParams.set("aonfix", "20261111-namutest-main-v1");
    return name + "=" + quote + "/aon/" + assetPath + parsed.search + parsed.hash + quote;
  });
}
const FRONTEND_TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);
async function fetchFrontendWithRetry(url, init = {}, attempts = 3) {
  let lastResponse = null;
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const upstream = await fetch(url, init);
      if (!FRONTEND_TRANSIENT_STATUSES.has(upstream.status)) return upstream;
      lastResponse = upstream;
    } catch (error) {
      lastError = error;
    }
    if (attempt + 1 < attempts) {
      await new Promise(resolve => setTimeout(resolve, 120 * (attempt + 1)));
    }
  }
  if (lastResponse) return lastResponse;
  throw lastError || new Error("프런트엔드 서버에 연결할 수 없습니다.");
}

let frontendShellCache = { value: null, expiresAt: 0, staleUntil: 0 };
let frontendShellPending = null;
const frontendAssetCache = new Map();
const frontendAssetPending = new Map();

function makeFrontendAssetResponse(entry, cacheState) {
  const headers = new Headers(getSecurityHeaders());
  headers.set("Content-Type", entry.contentType || "application/octet-stream");
  headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=86400");
  headers.set("X-AonWiki-Asset-Proxy", "1");
  headers.set("X-AonWiki-Asset-Cache", cacheState);
  return new Response(entry.body.slice(), { status: 200, headers });
}

async function loadFrontendAsset(assetUrl, acceptHeader) {
  const now = Date.now();
  const cached = frontendAssetCache.get(assetUrl);
  if (cached && cached.expiresAt > now) return { entry: cached, cacheState: "HIT" };
  if (frontendAssetPending.has(assetUrl)) return frontendAssetPending.get(assetUrl);

  const pending = (async () => {
    let upstream;
    try {
      upstream = await fetchFrontendWithRetry(assetUrl, {
        headers: { "Accept": acceptHeader || "*/*" },
        cf: { cacheTtl: 3600, cacheEverything: true }
      });
    } catch (error) {
      if (cached && cached.staleUntil > Date.now()) {
        console.warn("AonWiki static asset using stale cache after upstream network failure:", assetUrl);
        return { entry: cached, cacheState: "STALE" };
      }
      throw error;
    }

    if (!upstream.ok) {
      if (FRONTEND_TRANSIENT_STATUSES.has(upstream.status) && cached && cached.staleUntil > Date.now()) {
        console.warn("AonWiki static asset using stale cache after upstream HTTP failure:", upstream.status, assetUrl);
        return { entry: cached, cacheState: "STALE" };
      }
      return { status: upstream.status };
    }

    const body = new Uint8Array(await upstream.arrayBuffer());
    const entry = {
      body,
      contentType: upstream.headers.get("Content-Type") || "application/octet-stream",
      expiresAt: Date.now() + 5 * 60 * 1000,
      staleUntil: Date.now() + 24 * 60 * 60 * 1000
    };
    if (body.byteLength <= 2 * 1024 * 1024) {
      frontendAssetCache.set(assetUrl, entry);
      while (frontendAssetCache.size > 8) {
        const oldest = frontendAssetCache.keys().next().value;
        if (oldest) frontendAssetCache.delete(oldest);
        else break;
      }
    }
    return { entry, cacheState: "MISS" };
  })().finally(() => frontendAssetPending.delete(assetUrl));

  frontendAssetPending.set(assetUrl, pending);
  return pending;
}

async function loadFrontendShell(env) {
  if (frontendShellCache.value && frontendShellCache.expiresAt > Date.now()) return frontendShellCache.value;
  if (frontendShellPending) return frontendShellPending;
  const staleShell = frontendShellCache.value && frontendShellCache.staleUntil > Date.now()
    ? frontendShellCache.value
    : null;

  frontendShellPending = (async () => {
    try {
      const origin = String(env.FRONTEND_ORIGIN || "https://hiakdhs323-cmd.github.io/aon").replace(/\/$/, "");
      const shellResponse = await fetchFrontendWithRetry(
        origin + "/?aonwiki-shell=20261107-upstream-resilience-v1",
        { headers: { "Accept": "text/html" }, cf: { cacheTtl: 300, cacheEverything: true } }
      );
      if (!shellResponse.ok) {
        const error = new Error("프런트엔드 HTML을 불러오지 못했습니다: " + shellResponse.status);
        error.status = shellResponse.status;
        throw error;
      }
      const shell = await shellResponse.text();
      if (!shell.includes('id="article"')) throw new Error("프런트엔드 문서 템플릿에 article 영역이 없습니다.");
      const value = { shell: rewriteFrontendAssets(shell, origin), origin };
      frontendShellCache = {
        value,
        expiresAt: Date.now() + 5 * 60 * 1000,
        staleUntil: Date.now() + 24 * 60 * 60 * 1000
      };
      return value;
    } catch (error) {
      const transient = !Number(error?.status) || FRONTEND_TRANSIENT_STATUSES.has(Number(error.status));
      if (staleShell && transient) {
        console.warn("AonWiki serving the last known-good frontend shell:", error?.message || error);
        frontendShellCache.expiresAt = Date.now() + 15 * 1000;
        return staleShell;
      }
      throw error;
    }
  })().finally(() => { frontendShellPending = null; });
  return frontendShellPending;
}
async function findWikiPage(env, title) {
  let page = await env.DB.prepare("SELECT title, content, created_at, updated_at FROM pages WHERE title = ?").bind(title).first();
  if (!page) {
    await ensurePageAliasSchema(env);
    const alias = await env.DB.prepare("SELECT title FROM page_aliases WHERE alias = ? COLLATE NOCASE").bind(title).first();
    if (alias) page = await env.DB.prepare("SELECT title, content, created_at, updated_at FROM pages WHERE title = ?").bind(alias.title).first();
  }
  return page;
}
async function renderFullWikiDocument(request, env, title) {
  const { shell, origin } = await loadFrontendShell(env);
  const page = await findWikiPage(env, title);
  const found = Boolean(page);
  const actualTitle = found ? page.title : title;
  const linkColors = found ? await getPageLinkColors(env, actualTitle) : {};
  const clientRenderPending = found && actualTitle === "아온";
  const rendered = found && !clientRenderPending
    ? await renderNamuMarkupOnWorker(env, actualTitle, page.content || "", linkColors)
    : { html: "" };
  let protection = null;
  if (found) {
    await ensurePageProtectionSchema(env);
    protection = await env.DB.prepare("SELECT level, reason, protected_by, updated_at FROM page_protections WHERE title = ?").bind(actualTitle).first();
  }
  await ensureOfficialDocumentSchema(env);
  const official = found
    ? await env.DB.prepare("SELECT marked_by, updated_at FROM official_documents WHERE title = ?").bind(actualTitle).first()
    : null;
  const titleText = found ? actualTitle : actualTitle + " (문서 없음)";
  const description = found ? String(page.content || "").replace(/\s+/g, " ").slice(0, 180) : "아직 작성되지 않은 문서입니다.";
  const ssrUser = await currentUser(request, env);
  const ssrEditDenied = found && ssrUser ? await checkPageEditPermission(env, ssrUser, actualTitle) : null;
  const state = {
    title: actualTitle,
    content: found ? String(page.content || "") : "",
    protection: { level: protection?.level || "none", reason: protection?.reason || "" },
    official: Boolean(official),
    canEdit: found ? (ssrUser ? !ssrEditDenied : false) : false,
    exists: found,
    clientRenderPending
  };
  const protectionLabel = protection?.level === "admin" ? "관리자 편집 보호" : protection?.level === "registered" ? "회원 편집 보호" : "";
  const protectionMessage = protectionLabel
    ? (protection?.reason || (protection.level === "admin" ? "이 문서는 관리자만 편집할 수 있도록 보호되어 있습니다." : "이 문서는 로그인한 회원만 편집할 수 있습니다."))
    : "";
  let html = shell
    .replace("<title>AonWiki</title>", "<title>" + escapeHtml(titleText) + " - AonWiki</title>")
    .replace(/<meta name="theme-color"[^>]*>/i, '<meta name="theme-color" content="#00a69c">' + "\n" + '<meta name="description" content="' + escapeHtml(description) + '">' + "\n" + '<meta property="og:title" content="' + escapeHtml(titleText) + ' - AonWiki">' + "\n" + '<meta property="og:description" content="' + escapeHtml(description) + '">' + "\n" + '<link rel="canonical" href="' + escapeHtml(new URL(request.url).origin + "/w/" + encodeURIComponent(actualTitle)) + '">')
    .replace("<body>", '<body data-ssr-page="true">')
    .replace('<section id="home-view" class="home-view">', '<section id="home-view" class="home-view" hidden>')
    .replace('<section id="document-view" class="document-view" hidden>', '<section id="document-view" class="document-view">')
    .replace('<h1 id="title"></h1>', '<h1 id="title">' + escapeHtml(titleText) + '</h1>')
    .replace('<span id="crumb"></span>', '<span id="crumb">' + escapeHtml(actualTitle) + '</span>')
    .replace('<span id="template-status" class="template-status" hidden>공식 틀 문서</span>', state.official && /^(?:틀|template):/i.test(actualTitle) ? '<span id="template-status" class="template-status">공식 틀 문서</span>' : '<span id="template-status" class="template-status" hidden>공식 틀 문서</span>')
    .replace('<span id="official-status" class="official-status" hidden>공식 문서</span>', state.official ? '<span id="official-status" class="official-status">공식 문서</span>' : '<span id="official-status" class="official-status" hidden>공식 문서</span>')
    .replace('<span id="protection-status" class="protection-status" hidden></span>', protectionLabel ? '<span id="protection-status" class="protection-status">' + escapeHtml(protectionLabel) + '</span>' : '<span id="protection-status" class="protection-status" hidden></span>')
    .replace('<div id="protection-notice" class="protection-notice" role="status" aria-live="polite" hidden></div>', protectionMessage ? '<div id="protection-notice" class="protection-notice" role="status" aria-live="polite">' + escapeHtml(protectionMessage) + '</div>' : '<div id="protection-notice" class="protection-notice" role="status" aria-live="polite" hidden></div>')
    .replace('<div id="message" class="notice" role="status"></div>', '<div id="message" class="notice" role="status">' + (found ? "" : "이 문서는 아직 존재하지 않습니다. 로그인 후 새 문서를 작성할 수 있습니다.") + '</div>')
    .replace('<article id="article" class="wiki-content"></article>', '<article id="article" class="wiki-content"' + (clientRenderPending ? ' data-client-render-pending="true"' : '') + '>' + rendered.html + '</article>')
    .replace('id="edit" class="nav-item" type="button" hidden', protection?.level === "admin" ? 'id="edit" class="nav-item" type="button" hidden' : 'id="edit" class="nav-item" type="button"')
    .replace('id="history" class="nav-item" type="button" hidden', 'id="history" class="nav-item" type="button"' + (found ? "" : ' hidden'))
    .replace('id="upload" class="nav-item" type="button" hidden', 'id="upload" class="nav-item" type="button"' + (found ? "" : ' hidden'))
    .replace('id="backlinks-tab" type="button" hidden', 'id="backlinks-tab" type="button"' + (found ? "" : ' hidden'));
  if (!found) { html = html.replace('id="heading-edit" class="title-button" type="button"', 'id="heading-edit" class="title-button" type="button" hidden'); html = html.replace('<button id="edit" class="nav-item" type="button">문서 편집</button>', '<button id="edit" class="nav-item" type="button">문서 만들기</button>'); }
  const appScriptPattern = /<script defer src=["'](?:\/aon)?\/app\.js[^"']*["']><\/script>/i;
  const appScriptMatch = html.match(appScriptPattern);
  if (!appScriptMatch) throw new Error("프런트엔드 app.js 스크립트 위치를 찾을 수 없습니다.");
  const ssrStateScript = '<script id="aonwiki-ssr-state" type="application/json">' + safeJsonForHtml(state) + '</script>';
  html = html.replace(appScriptPattern, ssrStateScript + "\n" + appScriptMatch[0]);
  return new Response(html, {
    status: found ? 200 : 404,
    headers: { ...getSecurityHeaders(), "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-AonWiki-Render": "full-document" }
  });
}

async function passwordHash(password, salt) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 100000, hash: "SHA-256" }, material, 256);
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, "0")).join("");
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = getCors(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (isStateChangingMethod(request.method) && url.pathname.startsWith("/api/") && !isTrustedStateChangingRequest(request, env)) return response({ error: "보안상 허용되지 않은 요청입니다." }, 403, cors);
    const declaredLength = Number(request.headers.get("Content-Length") || 0);
    if (declaredLength > 2 * 1024 * 1024) return response({ error: "요청 본문은 2MB 이하만 허용됩니다." }, 413, cors);
    if (isStateChangingMethod(request.method) && !request.headers.get("Content-Length")) {
      const probe = await request.clone().arrayBuffer();
      if (probe.byteLength > 2 * 1024 * 1024) return response({ error: "요청 본문은 2MB 이하만 허용됩니다." }, 413, cors);
    }
    try {
      const staticFiles = new Set(["style.css", "app.js", "theme.js", "namumark-wasm.js", "namumark-aon.css", "namumark-interactions-aon.css", "Namu_test-main/namumark.js", "Namu_test-main/namumark_bg.wasm", "Namu_test-main/interactions.js", "aonwiki-mark.svg"]);
      const assetPath = url.pathname.startsWith("/aon/") ? url.pathname.slice("/aon/".length) : url.pathname.slice(1);
      const assetName = staticFiles.has(assetPath) ? assetPath : "";
      if (request.method === "GET" && staticFiles.has(assetName)) {
        const origin = String(env.FRONTEND_ORIGIN || "https://hiakdhs323-cmd.github.io/aon").replace(/\/$/, "");
        const assetCacheVersion = assetName === "style.css" ? "20261111-browser-theme-v1" : "20261111-assets-v2";
        const assetQuery = url.search ? url.search + "&" : "?";
        const assetUrl = origin + "/" + assetName + assetQuery + "aonwiki_asset=" + assetCacheVersion;
        try {
          const result = await loadFrontendAsset(assetUrl, request.headers.get("Accept") || "*/*");
          if (result.entry) return makeFrontendAssetResponse(result.entry, result.cacheState);
          const status = Number(result.status) || 502;
          const message = status >= 500
            ? "정적 리소스 서버가 일시적으로 응답하지 않습니다."
            : "정적 리소스를 찾을 수 없습니다.";
          const headers = new Headers(getSecurityHeaders());
          headers.set("Content-Type", "text/plain; charset=utf-8");
          headers.set("Cache-Control", "no-store");
          headers.set("Retry-After", "2");
          headers.set("X-AonWiki-Asset-Proxy", "1");
          return new Response(message, { status, headers });
        } catch (error) {
          console.error("AonWiki static asset proxy failed:", assetName, error?.message || error);
          const headers = new Headers(getSecurityHeaders());
          headers.set("Content-Type", "text/plain; charset=utf-8");
          headers.set("Cache-Control", "no-store");
          headers.set("Retry-After", "2");
          headers.set("X-AonWiki-Asset-Proxy", "1");
          return new Response("정적 리소스 서버에 일시적으로 연결할 수 없습니다.", { status: 503, headers });
        }
      }
      if (request.method === "GET" && url.pathname.startsWith("/w/")) {
        let title = "";
        try { title = decodeURIComponent(url.pathname.slice(3)); }
        catch { return new Response("잘못된 문서 주소입니다.", { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } }); }
        title = cleanTitle(title);
        if (!title) return new Response("잘못된 문서 주소입니다.", { status: 400 });
        return await renderFullWikiDocument(request, env, title);
      }
      if (request.method === "GET" && url.pathname.toLowerCase() === "/search") {
        const { shell } = await loadFrontendShell(env);
        return new Response(shell, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "X-AonWiki-Render": "search-shell"
          }
        });
      }
      if (request.method === "GET" && url.pathname === "/") {
        const { shell } = await loadFrontendShell(env);
        return new Response(shell, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "X-AonWiki-Render": "home-shell"
          }
        });
      }
      if (url.pathname === "/api/logout" && request.method === "POST") {
        const authorization = request.headers.get("Authorization") || "";
        if (authorization.startsWith("Bearer ")) {
          await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(authorization.slice(7))).run();
        }
        return response({ ok: true }, 200, cors);
      }
      if (url.pathname === "/api/me" && request.method === "GET") {
        const user = await currentUser(request, env);
        return response({ authenticated: Boolean(user), username: user?.username || null, role: user?.role || "anonymous", isAdmin: Boolean(user?.isAdmin) }, 200, cors);
      }
      if (url.pathname === "/api/admin/bootstrap-account" && request.method === "POST") {
        if (!env.ADMIN_BOOTSTRAP_SECRET || env.ADMIN_BOOTSTRAP_SECRET.length < 32) return response({ error: "관리자 초기 설정이 서버에서 활성화되지 않았습니다." }, 503, cors);
        if (await authRateLimited(request, env, "admin-bootstrap", 5, 60 * 60 * 1000)) return response({ error: "요청이 너무 많습니다. 나중에 다시 시도하세요." }, 429, cors);
        const supplied = request.headers.get("X-Admin-Bootstrap-Secret") || "";
        if (!constantTimeEqual(supplied, env.ADMIN_BOOTSTRAP_SECRET)) return response({ error: "인증에 실패했습니다." }, 403, cors);
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS wiki_admins (user_id TEXT PRIMARY KEY NOT NULL, granted_at TEXT NOT NULL, granted_by TEXT NOT NULL)").run();
        const alreadyGranted = await env.DB.prepare("SELECT user_id FROM wiki_admins LIMIT 1").first();
        if (alreadyGranted) return response({ error: "최초 관리자 등록은 이미 완료되었습니다." }, 409, cors);
        const body = await readJsonBody(request);
        const username = String(body.username || "").trim();
        if (username.toLocaleLowerCase() !== "아온") return response({ error: "최초 관리자 등록 대상은 아온 계정으로 제한됩니다." }, 403, cors);
        const target = await env.DB.prepare("SELECT id, username FROM users WHERE username = ? COLLATE NOCASE").bind("아온").first();
        if (!target) return response({ error: "해당 계정이 없습니다. 먼저 계정을 만든 뒤 다시 시도하세요." }, 404, cors);
        const now = new Date().toISOString();
        const result = await env.DB.prepare("INSERT INTO wiki_admins (user_id, granted_at, granted_by) SELECT ?, ?, 'one-time-bootstrap' WHERE NOT EXISTS (SELECT 1 FROM wiki_admins)").bind(target.id, now).run();
        if (!result.success || Number(result.meta?.changes || 0) !== 1) return response({ error: "최초 관리자 등록에 실패했습니다. 이미 등록되었을 수 있습니다." }, 409, cors);
        return response({ ok: true, username: target.username, role: "admin", message: "최초 관리자 권한이 등록되었습니다. 초기 설정 비밀값은 즉시 폐기하세요." }, 200, cors);
      }
      if (url.pathname === "/api/admin/token/rotate" && request.method === "POST") {
        const adminUser = await currentUser(request, env);
        if (!adminUser || !adminUser.isAdmin) return response({ error: "관리자 권한이 필요합니다." }, 403, cors);
        const token = makeAdminToken();
        await ensureAdminTokenTable(env);
        await env.DB.prepare("INSERT INTO admin_tokens (id, token_hash, updated_at) VALUES ('primary', ?, ?) ON CONFLICT(id) DO UPDATE SET token_hash = excluded.token_hash, updated_at = excluded.updated_at")
          .bind(await sha256(token), new Date().toISOString()).run();
        return response({ ok: true, token, message: "새 관리자 토큰이 발급되었습니다. 이 값은 다시 표시되지 않습니다." }, 200, cors);
      }
      if (url.pathname === "/api/home" && request.method === "GET") {
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS wiki_settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL, editor TEXT NOT NULL DEFAULT '')").run();
        const result = await env.DB.prepare("SELECT key, value FROM wiki_settings WHERE key IN ('home_title','home_tagline','home_notice','home_content','home_search_hint','home_list_title','home_bottom_title','home_bottom_text')").all();
        const settings = Object.fromEntries((result.results || []).map(row => [row.key, row.value]));
        return response({ settings: {
          title: settings.home_title || "AonWiki",
          tagline: settings.home_tagline || "함께 만드는 지식 백과사전",
          notice: settings.home_notice || "",
          content: settings.home_content || "",
          searchHint: settings.home_search_hint || "검색창에서 문서를 찾거나 아래 목록에서 원하는 문서를 선택하세요.",
          listTitle: settings.home_list_title || "최근 수정된 문서",
          bottomTitle: settings.home_bottom_title || "문서가 없나요?",
          bottomText: settings.home_bottom_text || "로그인한 뒤 새 문서를 만들어 지식을 공유할 수 있습니다."
        } }, 200, cors);
      }
      if (url.pathname === "/api/home" && request.method === "PUT") {
        const user = await currentUser(request, env);
        if (!user?.isAdmin) return response({ error: "대문을 수정하려면 위키 관리자 권한이 필요합니다." }, 403, cors);
        const body = await readJsonBody(request);
        const settings = {
          home_title: String(body.title || "AonWiki").trim().slice(0, 80),
          home_tagline: String(body.tagline || "").trim().slice(0, 200),
          home_notice: String(body.notice || "").trim().slice(0, 2000),
          home_content: String(body.content || "").slice(0, 200000),
          home_search_hint: String(body.searchHint || "").trim().slice(0, 300),
          home_list_title: String(body.listTitle || "").trim().slice(0, 80),
          home_bottom_title: String(body.bottomTitle || "").trim().slice(0, 80),
          home_bottom_text: String(body.bottomText || "").trim().slice(0, 500)
        };
        const now = new Date().toISOString();
        for (const [key, value] of Object.entries(settings)) {
          await env.DB.prepare("INSERT INTO wiki_settings (key, value, updated_at, editor) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, editor = excluded.editor")
            .bind(key, value, now, user.username).run();
        }
        return response({ ok: true, updated_at: now }, 200, cors);
      }
      if (url.pathname === "/api/page/protection" && request.method === "PUT") {
        const user = await currentUser(request, env);
        if (!user?.isAdmin) return response({ error: "편집 보호를 설정하려면 위키 관리자 권한이 필요합니다." }, 403, cors);
        const body = await readJsonBody(request);
        const title = cleanTitle(body.title);
        const level = String(body.level || "none");
        const reason = String(body.reason || "").trim().slice(0, 300);
        if (!title || title === "대문") return response({ error: "보호할 수 없는 문서입니다." }, 400, cors);
        if (!["none", "registered", "admin"].includes(level)) return response({ error: "올바른 보호 수준을 선택하세요." }, 400, cors);
        const page = await env.DB.prepare("SELECT title FROM pages WHERE title = ?").bind(title).first();
        if (!page) return response({ error: "문서를 찾을 수 없습니다." }, 404, cors);
        await ensurePageProtectionSchema(env);
        if (level === "none") {
          await env.DB.prepare("DELETE FROM page_protections WHERE title = ?").bind(title).run();
          return response({ ok: true, title, protection: { level: "none", reason: "", protectedBy: user.username } }, 200, cors);
        }
        const now = new Date().toISOString();
        await env.DB.prepare("INSERT INTO page_protections (title, level, reason, protected_by, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(title) DO UPDATE SET level = excluded.level, reason = excluded.reason, protected_by = excluded.protected_by, updated_at = excluded.updated_at")
          .bind(title, level, reason, user.username, now).run();
        return response({ ok: true, title, protection: { level, reason, protectedBy: user.username, updatedAt: now } }, 200, cors);
      }
      if (url.pathname === "/api/page/official" && request.method === "PUT") {
        const user = await currentUser(request, env);
        if (!user?.isAdmin) return response({ error: "공식 문서를 지정하거나 해제하려면 위키 관리자 권한이 필요합니다." }, 403, cors);
        const body = await readJsonBody(request);
        const title = cleanTitle(body.title);
        const official = Boolean(body.official);
        if (!title || title === "대문") return response({ error: "공식 문서로 지정할 수 없는 문서입니다." }, 400, cors);
        const page = await env.DB.prepare("SELECT title FROM pages WHERE title = ?").bind(title).first();
        if (!page) return response({ error: "문서를 찾을 수 없습니다." }, 404, cors);
        await ensureOfficialDocumentSchema(env);
        const now = new Date().toISOString();
        if (!official) {
          await env.DB.prepare("DELETE FROM official_documents WHERE title = ?").bind(title).run();
          return response({ ok: true, title, official: false, officialMarkedBy: user.username, officialUpdatedAt: now }, 200, cors);
        }
        await env.DB.prepare("INSERT INTO official_documents (title, marked_by, updated_at) VALUES (?, ?, ?) ON CONFLICT(title) DO UPDATE SET marked_by = excluded.marked_by, updated_at = excluded.updated_at")
          .bind(title, user.username, now).run();
        return response({ ok: true, title, official: true, officialMarkedBy: user.username, officialUpdatedAt: now }, 200, cors);
      }
      if (url.pathname === "/api/page" && request.method === "DELETE") {
        const user = await currentUser(request, env);
        if (!user?.isAdmin) return response({ error: "문서를 삭제하려면 위키 관리자 권한이 필요합니다." }, 403, cors);
        const title = cleanTitle(url.searchParams.get("title"));
        if (!title || title === "대문") return response({ error: "삭제할 수 없는 문서입니다." }, 400, cors);
        await env.DB.prepare("DELETE FROM pages WHERE title = ?").bind(title).run();
        await ensurePageLinkColorsSchema(env);
        await env.DB.prepare("DELETE FROM page_link_colors WHERE title = ?").bind(title).run();
        invalidateNamuServerIndexes();
        await clearPersistentNamuRenderCache(env, title);
        await env.DB.prepare("DELETE FROM revisions WHERE title = ?").bind(title).run();
        return response({ ok: true, title }, 200, cors);
      }
      if (url.pathname === "/api/health" && request.method === "GET") {
        return response({ ok: true, service: "AonWiki API" }, 200, cors);
      }
      if (url.pathname === "/api/account/password" && request.method === "POST") {
        if (await authRateLimited(request, env, "password-change", 5, 15 * 60 * 1000)) return response({ error: "비밀번호 변경 요청이 너무 많습니다. 15분 뒤 다시 시도하세요." }, 429, cors);
        const authorization = request.headers.get("Authorization") || "";
        if (!authorization.startsWith("Bearer ")) return response({ error: "로그인이 필요합니다." }, 401, cors);
        const sessionTokenHash = await sha256(authorization.slice(7));
        const now = new Date().toISOString();
        const user = await env.DB.prepare(
          "SELECT users.id, users.username, users.salt, users.password_hash FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?"
        ).bind(sessionTokenHash, now).first();
        if (!user) return response({ error: "일반 계정으로 로그인한 뒤 비밀번호를 변경하세요." }, 401, cors);

        const body = await readJsonBody(request);
        const currentPassword = String(body.currentPassword || "");
        const newPassword = String(body.newPassword || "");
        if (newPassword.length < 8 || newPassword.length > 200) {
          return response({ error: "새 비밀번호는 8~200자로 설정하세요." }, 400, cors);
        }
        const currentHash = await passwordHash(currentPassword, user.salt);
        if (!constantTimeEqual(currentHash, user.password_hash)) {
          return response({ error: "현재 비밀번호가 올바르지 않습니다." }, 403, cors);
        }
        if (constantTimeEqual(await passwordHash(newPassword, user.salt), user.password_hash)) {
          return response({ error: "현재와 다른 비밀번호를 입력하세요." }, 400, cors);
        }

        const newSalt = crypto.randomUUID();
        const newHash = await passwordHash(newPassword, newSalt);
        await env.DB.prepare("UPDATE users SET salt = ?, password_hash = ? WHERE id = ?")
          .bind(newSalt, newHash, user.id).run();
        await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id).run();

        const token = [...crypto.getRandomValues(new Uint8Array(32))]
          .map(byte => byte.toString(16).padStart(2, "0")).join("");
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
          .bind(await sha256(token), user.id, expires).run();
        return response({
          ok: true, token, username: user.username, expires_at: expires,
          message: "비밀번호가 변경되었습니다. 다른 기기의 로그인은 모두 해제되었습니다."
        }, 200, cors);
      }
      if (url.pathname === "/api/register" && request.method === "POST") {
        if (await authRateLimited(request, env, "register", 5, 60 * 60 * 1000)) return response({ error: "가입 요청이 너무 많습니다. 한 시간 뒤 다시 시도하세요." }, 429, cors);
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL)").run();
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL)").run();
        const body = await readJsonBody(request);
        const username = String(body.username || "").trim();
        const password = String(body.password || "");
        if (!/^[A-Za-z0-9가-힣_-]{2,20}$/.test(username)) return response({error:"아이디는 한글/영문/숫자/_/- 2~20자로 입력하세요."},400,cors);
        if (password.length < 8 || password.length > 200) return response({error:"비밀번호는 8~200자로 설정하세요."},400,cors);
        const exists = await env.DB.prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE").bind(username).first();
        if (exists) return response({error:"이미 사용 중인 아이디입니다."},409,cors);
        const id = crypto.randomUUID(), salt = crypto.randomUUID(), now = new Date().toISOString();
        const hash = await passwordHash(password, salt);
        await env.DB.prepare("INSERT INTO users (id,username,salt,password_hash,created_at) VALUES (?,?,?,?,?)").bind(id,username,salt,hash,now).run();
        return response({ok:true,message:"가입 완료! 로그인해 주세요."},201,cors);
      }
      if (url.pathname === "/api/login" && request.method === "POST") {
        if (await authRateLimited(request, env, "login", 20, 15 * 60 * 1000)) return response({ error: "로그인 시도가 너무 많습니다. 15분 뒤 다시 시도하세요." }, 429, cors);
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL)").run();
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL)").run();
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS login_account_attempts (username TEXT PRIMARY KEY NOT NULL, attempts INTEGER NOT NULL, window_started_at TEXT NOT NULL)").run();
        const body = await readJsonBody(request);
        const username = String(body.username || "").trim().slice(0, 40);
        const password = String(body.password || "");
        const key = username.toLocaleLowerCase("ko-KR");
        const user = await env.DB.prepare("SELECT id,username,salt,password_hash FROM users WHERE username = ? COLLATE NOCASE").bind(username).first();
        let accountRate = null;
        let accountAge = Infinity;
        if (user) {
          accountRate = await env.DB.prepare("SELECT attempts, window_started_at FROM login_account_attempts WHERE username = ?").bind(key).first();
          accountAge = accountRate ? Date.now() - Date.parse(accountRate.window_started_at) : Infinity;
          if (accountRate && accountAge >= 0 && accountAge < 15 * 60 * 1000 && Number(accountRate.attempts) >= 10) return response({ error: "로그인 시도가 너무 많습니다. 15분 뒤 다시 시도하세요." }, 429, cors);
        }
        const passwordValid = Boolean(user && await passwordHash(password,user.salt) === user.password_hash);
        if (!passwordValid) {
          if (user) {
            const now = new Date().toISOString();
            if (!accountRate || accountAge < 0 || accountAge >= 15 * 60 * 1000) {
              await env.DB.prepare("INSERT INTO login_account_attempts (username, attempts, window_started_at) VALUES (?, 1, ?) ON CONFLICT(username) DO UPDATE SET attempts = 1, window_started_at = excluded.window_started_at").bind(key, now).run();
            } else {
              await env.DB.prepare("UPDATE login_account_attempts SET attempts = attempts + 1 WHERE username = ?").bind(key).run();
            }
          }
          return response({error:"아이디 또는 비밀번호가 올바르지 않습니다."},401,cors);
        }
        await env.DB.prepare("DELETE FROM login_account_attempts WHERE username = ?").bind(key).run();
        const token = [...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,"0")).join("");
        const expires = new Date(Date.now()+7*24*60*60*1000).toISOString();
        await env.DB.prepare("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)").bind(await sha256(token),user.id,expires).run();
        return response({ok:true,token,username:user.username,expires_at:expires},200,cors);
      }
      
      if (url.pathname === "/api/discussions" && request.method === "GET") {
        await ensureDiscussionSchema(env);
        const pageTitle = cleanTitle(url.searchParams.get("title"));
        const query = String(url.searchParams.get("q") || "").normalize("NFC").trim().slice(0, 80);
        const requestedStatus = String(url.searchParams.get("status") || "all");
        const status = requestedStatus === "open" || requestedStatus === "closed" ? requestedStatus : "all";
        const limit = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "20", 10) || 20));
        const offset = Math.min(100000, Math.max(0, Number.parseInt(url.searchParams.get("offset") || "0", 10) || 0));
        const conditions = ["deleted_at = ''"];
        const values = [];
        if (pageTitle) { conditions.push("page_title = ?"); values.push(pageTitle); }
        if (status !== "all") { conditions.push("status = ?"); values.push(status); }
        if (query) {
          const terms = [...new Set(query.split(/\\s+/).filter(Boolean))].slice(0, 6);
          for (const term of terms) {
            const pattern = "%" + term.replace(/[\\\\%_]/g, "") + "%";
            conditions.push("(title LIKE ? OR body LIKE ?)");
            values.push(pattern, pattern);
          }
        }
        const where = conditions.join(" AND ");
        const [items, count] = await Promise.all([
          env.DB.prepare("SELECT id, page_title, title, author, created_at, updated_at, last_post_at, reply_count, status FROM discussions WHERE " + where + " ORDER BY last_post_at DESC, id DESC LIMIT ? OFFSET ?").bind(...values, limit, offset).all(),
          env.DB.prepare("SELECT COUNT(*) AS total FROM discussions WHERE " + where).bind(...values).first()
        ]);
        return response({ discussions: items.results || [], total: Number(count?.total || 0), limit, offset, pageTitle, query, status }, 200, cors);
      }
if (url.pathname === "/api/discussion" && request.method === "GET") {
        await ensureDiscussionSchema(env);
        const id = Number(url.searchParams.get("id"));
        if (!Number.isSafeInteger(id) || id < 1) return response({ error: "올바른 토론 번호가 아닙니다." }, 400, cors);
        const discussion = await env.DB.prepare("SELECT id, page_title, title, body, author, created_at, updated_at, last_post_at, reply_count, status FROM discussions WHERE id = ? AND deleted_at = ''").bind(id).first();
        if (!discussion) return response({ error: "토론을 찾을 수 없습니다." }, 404, cors);
        const posts = await env.DB.prepare("SELECT id, discussion_id, body, author, created_at, edited_at, is_deleted FROM discussion_posts WHERE discussion_id = ? ORDER BY id ASC LIMIT 500").bind(id).all();
        return response({ discussion, posts: posts.results || [] }, 200, cors);
      }
      if (url.pathname === "/api/discussions" && request.method === "POST") {
        const user = await currentUser(request, env);
        if (!user) return response({ error: "토론을 시작하려면 로그인하세요." }, 401, cors);
        if (await authRateLimited(request, env, "discussion-create", 5, 10 * 60 * 1000)) return response({ error: "토론 생성 요청이 너무 많습니다. 잠시 후 다시 시도하세요." }, 429, cors);
        await ensureDiscussionSchema(env);
        const body = await readJsonBody(request);
        const title = String(body.title || "").trim().replace(/[\x00-\x1f\x7f]/g, "").slice(0, 120);
        const content = String(body.body || "").trim().slice(0, 10000);
        const pageTitle = cleanTitle(body.pageTitle || "");
        if (title.length < 2) return response({ error: "토론 제목은 2자 이상 입력하세요." }, 400, cors);
        if (!content) return response({ error: "토론 내용을 입력하세요." }, 400, cors);
        if (pageTitle) {
          const page = await env.DB.prepare("SELECT title FROM pages WHERE title = ?").bind(pageTitle).first();
          if (!page) return response({ error: "연결할 문서를 찾을 수 없습니다." }, 404, cors);
        }
        const now = new Date().toISOString();
        const result = await env.DB.prepare("INSERT INTO discussions (page_title, title, body, author, created_at, updated_at, last_post_at, reply_count, status) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'open')").bind(pageTitle, title, content, user.username, now, now, now).run();
        return response({ ok: true, id: Number(result.meta?.last_row_id || 0), created_at: now }, 201, cors);
      }
      if (url.pathname === "/api/discussion/reply" && request.method === "POST") {
        const user = await currentUser(request, env);
        if (!user) return response({ error: "답글을 작성하려면 로그인하세요." }, 401, cors);
        if (await authRateLimited(request, env, "discussion-reply", 15, 5 * 60 * 1000)) return response({ error: "답글 작성 요청이 너무 많습니다. 잠시 후 다시 시도하세요." }, 429, cors);
        await ensureDiscussionSchema(env);
        const body = await readJsonBody(request);
        const id = Number(body.id);
        const content = String(body.body || "").trim().slice(0, 6000);
        if (!Number.isSafeInteger(id) || id < 1) return response({ error: "올바른 토론 번호가 아닙니다." }, 400, cors);
        if (!content) return response({ error: "답글 내용을 입력하세요." }, 400, cors);
        const discussion = await env.DB.prepare("SELECT id, status FROM discussions WHERE id = ? AND deleted_at = ''").bind(id).first();
        if (!discussion) return response({ error: "토론을 찾을 수 없습니다." }, 404, cors);
        if (discussion.status !== "open") return response({ error: "종료된 토론에는 답글을 작성할 수 없습니다." }, 409, cors);
        const now = new Date().toISOString();
        const result = await env.DB.prepare("INSERT INTO discussion_posts (discussion_id, body, author, created_at) VALUES (?, ?, ?, ?)").bind(id, content, user.username, now).run();
        await env.DB.prepare("UPDATE discussions SET reply_count = reply_count + 1, updated_at = ?, last_post_at = ? WHERE id = ?").bind(now, now, id).run();
        return response({ ok: true, id: Number(result.meta?.last_row_id || 0), created_at: now }, 201, cors);
      }
      if (url.pathname === "/api/discussion" && request.method === "PATCH") {
        const user = await currentUser(request, env);
        if (!user) return response({ error: "토론 상태를 변경하려면 로그인하세요." }, 401, cors);
        await ensureDiscussionSchema(env);
        const body = await readJsonBody(request);
        const id = Number(body.id);
        const action = String(body.action || "");
        if (!Number.isSafeInteger(id) || id < 1 || !["close", "reopen", "edit"].includes(action)) return response({ error: "올바른 토론 변경 요청이 아닙니다." }, 400, cors);
        const discussion = await env.DB.prepare("SELECT id, author, status FROM discussions WHERE id = ? AND deleted_at = ''").bind(id).first();
        if (!discussion) return response({ error: "토론을 찾을 수 없습니다." }, 404, cors);
        if (!user.isAdmin && discussion.author !== user.username) return response({ error: "토론 작성자 또는 위키 관리자만 변경할 수 있습니다." }, 403, cors);
        const now = new Date().toISOString();
        if (action === "edit") {
          const title = String(body.title || "").trim().replace(/[\x00-\x1f\x7f]/g, "").slice(0, 120);
          const content = String(body.body || "").trim().slice(0, 10000);
          if (title.length < 2) return response({ error: "토론 제목은 2자 이상 입력하세요." }, 400, cors);
          if (!content) return response({ error: "토론 내용을 입력하세요." }, 400, cors);
          if (!user.isAdmin && discussion.status !== "open") return response({ error: "종료된 토론은 관리자만 수정할 수 있습니다." }, 403, cors);
          await env.DB.prepare("UPDATE discussions SET title = ?, body = ?, updated_at = ? WHERE id = ?").bind(title, content, now, id).run();
          return response({ ok: true, id, title, updated_at: now }, 200, cors);
        }
        const status = action === "close" ? "closed" : "open";
        await env.DB.prepare("UPDATE discussions SET status = ?, updated_at = ? WHERE id = ?").bind(status, now, id).run();
        return response({ ok: true, id, status }, 200, cors);
      }
      if (url.pathname === "/api/discussion/post" && request.method === "PATCH") {
        const user = await currentUser(request, env);
        if (!user) return response({ error: "답글을 수정하려면 로그인하세요." }, 401, cors);
        await ensureDiscussionSchema(env);
        const body = await readJsonBody(request);
        const id = Number(body.id);
        const content = String(body.body || "").trim().slice(0, 6000);
        if (!Number.isSafeInteger(id) || id < 1 || !content) return response({ error: "올바른 답글 수정 요청이 아닙니다." }, 400, cors);
        const post = await env.DB.prepare("SELECT id, discussion_id, author, created_at, is_deleted FROM discussion_posts WHERE id = ?").bind(id).first();
        if (!post || Number(post.is_deleted)) return response({ error: "수정할 답글을 찾을 수 없습니다." }, 404, cors);
        if (!user.isAdmin && post.author !== user.username) return response({ error: "본인이 작성한 답글만 수정할 수 있습니다." }, 403, cors);
        const age = Date.now() - Date.parse(post.created_at);
        if (!user.isAdmin && (age < 0 || age > 30 * 60 * 1000)) return response({ error: "일반 회원은 작성 후 30분 이내의 답글만 수정할 수 있습니다." }, 403, cors);
        const now = new Date().toISOString();
        await env.DB.prepare("UPDATE discussion_posts SET body = ?, edited_at = ? WHERE id = ?").bind(content, now, id).run();
        await env.DB.prepare("UPDATE discussions SET updated_at = ? WHERE id = ?").bind(now, post.discussion_id).run();
        return response({ ok: true, id, edited_at: now }, 200, cors);
      }
      if (url.pathname === "/api/discussion/post" && request.method === "DELETE") {
        const user = await currentUser(request, env);
        if (!user) return response({ error: "답글을 삭제하려면 로그인하세요." }, 401, cors);
        await ensureDiscussionSchema(env);
        const id = Number(url.searchParams.get("id"));
        if (!Number.isSafeInteger(id) || id < 1) return response({ error: "올바른 답글 번호가 아닙니다." }, 400, cors);
        const post = await env.DB.prepare("SELECT id, discussion_id, author, is_deleted FROM discussion_posts WHERE id = ?").bind(id).first();
        if (!post || Number(post.is_deleted)) return response({ error: "삭제할 답글을 찾을 수 없습니다." }, 404, cors);
        if (!user.isAdmin && post.author !== user.username) return response({ error: "본인이 작성한 답글만 삭제할 수 있습니다." }, 403, cors);
        const now = new Date().toISOString();
        await env.DB.prepare("UPDATE discussion_posts SET body = '', is_deleted = 1, edited_at = ? WHERE id = ?").bind(now, id).run();
        await env.DB.prepare("UPDATE discussions SET reply_count = MAX(0, reply_count - 1), updated_at = ?, last_post_at = COALESCE((SELECT MAX(created_at) FROM discussion_posts WHERE discussion_id = ? AND is_deleted = 0), created_at) WHERE id = ?").bind(now, post.discussion_id, post.discussion_id).run();
        return response({ ok: true, id }, 200, cors);
      }
      if (url.pathname === "/api/discussions" && request.method === "DELETE") {
        const user = await currentUser(request, env);
        if (!user) return response({ error: "토론을 삭제하려면 로그인하세요." }, 401, cors);
        await ensureDiscussionSchema(env);
        const id = Number(url.searchParams.get("id"));
        if (!Number.isSafeInteger(id) || id < 1) return response({ error: "올바른 토론 번호가 아닙니다." }, 400, cors);
        const discussion = await env.DB.prepare("SELECT id, author, reply_count FROM discussions WHERE id = ? AND deleted_at = ''").bind(id).first();
        if (!discussion) return response({ error: "토론을 찾을 수 없습니다." }, 404, cors);
        if (!user.isAdmin && discussion.author !== user.username) return response({ error: "토론 작성자 또는 위키 관리자만 삭제할 수 있습니다." }, 403, cors);
        if (!user.isAdmin && Number(discussion.reply_count) > 0) return response({ error: "답글이 있는 토론은 관리자만 삭제할 수 있습니다. 토론을 종료해 주세요." }, 403, cors);
        const now = new Date().toISOString();
        await env.DB.prepare("UPDATE discussions SET deleted_at = ?, deleted_by = ?, status = 'closed', updated_at = ? WHERE id = ?").bind(now, user.username, now, id).run();
        return response({ ok: true, id }, 200, cors);
      }

      if (url.pathname === "/api/special-pages" && request.method === "GET") {
        const type = String(url.searchParams.get("type") || "").trim();
        const supported = new Set(["missing", "orphan", "orphan-categories", "uncategorized", "old", "short", "long", "blocked"]);
        if (!supported.has(type)) return response({ error: "지원하지 않는 특수 문서입니다." }, 400, cors);
        if (type === "blocked") return response({ type, available: false, items: [], total: 0, message: "현재 AonWiki에는 회원 차단 이력을 기록하는 기능이 연결되어 있지 않습니다." }, 200, cors);
        const result = await env.DB.prepare("SELECT title, content, updated_at FROM pages ORDER BY title COLLATE NOCASE LIMIT 10000").all();
        const pages = (result.results || []).map(page => ({
          title: String(page.title || ""),
          content: String(page.content || ""),
          updated_at: String(page.updated_at || "")
        }));
        const pageByKey = new Map(pages.map(page => [page.title.toLocaleLowerCase(), page]));
        const inbound = new Map();
        const missing = new Map();
        const categoryReferences = new Set();
        const categoryPattern = /\[\[(?:분류|category):([^\]|#]+)(?:\|[^\]]*)?\]\]/gi;
        for (const page of pages) {
          for (const match of page.content.matchAll(/\[\[([^\]]+)\]\]/g)) {
            const target = String(match[1] || "").split("|")[0].split("#")[0].trim();
            if (!target) continue;
            const key = target.toLocaleLowerCase();
            inbound.set(key, (inbound.get(key) || 0) + 1);
            if (/^(?:분류|category):/i.test(target)) {
              const category = target.replace(/^(?:분류|category):/i, "").trim().toLocaleLowerCase();
              if (category) categoryReferences.add(category);
            } else if (!pageByKey.has(key) && !/^(?:파일|file):/i.test(target) && target !== page.title) {
              const item = missing.get(key) || { title: target, count: 0, source: page.title };
              item.count++;
              missing.set(key, item);
            }
          }
          for (const match of page.content.matchAll(categoryPattern)) {
            const category = String(match[1] || "").trim().toLocaleLowerCase();
            if (category) categoryReferences.add(category);
          }
        }
        const regular = pages.filter(page => page.title !== "대문" && !/^(?:분류|category):/i.test(page.title));
        let items = [];
        let description = "";
        if (type === "missing") {
          description = "다른 문서에서 링크하고 있지만 아직 작성되지 않은 문서입니다.";
          items = [...missing.values()].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, "ko"));
        } else if (type === "orphan") {
          description = "다른 문서에서 내부 링크로 참조되지 않는 문서입니다.";
          items = regular.filter(page => !inbound.has(page.title.toLocaleLowerCase())).map(page => ({ title: page.title, updated_at: page.updated_at }));
        } else if (type === "orphan-categories") {
          description = "어떤 문서에서도 분류 링크로 참조하지 않는 분류입니다.";
          items = pages.filter(page => /^(?:분류|category):/i.test(page.title)).filter(page => {
            const name = page.title.replace(/^(?:분류|category):/i, "").toLocaleLowerCase();
            return !categoryReferences.has(name);
          }).map(page => ({ title: page.title, updated_at: page.updated_at }));
        } else if (type === "uncategorized") {
          description = "분류 링크가 하나도 등록되지 않은 문서입니다.";
          items = regular.filter(page => !/\[\[(?:분류|category):/i.test(page.content)).map(page => ({ title: page.title, updated_at: page.updated_at }));
        } else if (type === "old") {
          description = "최근 수정 시각이 오래된 문서부터 표시합니다.";
          items = [...regular].sort((a, b) => (Date.parse(a.updated_at) || 0) - (Date.parse(b.updated_at) || 0)).map(page => ({ title: page.title, updated_at: page.updated_at }));
        } else if (type === "short") {
          description = "본문 원문이 200자 이하인 문서입니다. 나무마크 기호와 공백도 글자 수에 포함됩니다.";
          items = regular.filter(page => page.content.trim().length <= 200).map(page => ({ title: page.title, characters: page.content.length, updated_at: page.updated_at })).sort((a, b) => a.characters - b.characters);
        } else if (type === "long") {
          description = "본문 원문이 10,000자 이상인 문서입니다. 나무마크 기호와 공백도 글자 수에 포함됩니다.";
          items = regular.filter(page => page.content.length >= 10000).map(page => ({ title: page.title, characters: page.content.length, updated_at: page.updated_at })).sort((a, b) => b.characters - a.characters);
        }
        const total = items.length;
        return response({ type, available: true, description, total, items: items.slice(0, 500) }, 200, cors);
      }
      if (url.pathname === "/api/page-index" && request.method === "GET") {
        const result = await env.DB.prepare("SELECT title FROM pages ORDER BY title COLLATE NOCASE LIMIT 10000").all();
        return response({ pages: result.results || [] }, 200, cors);
      }
      if (url.pathname === "/api/pages" && request.method === "GET") {
        const q = String(url.searchParams.get("q") || "").normalize("NFC").trim().slice(0, 100);
        const requestedScope = url.searchParams.get("scope");
        const scope = requestedScope === "title" || requestedScope === "files" ? requestedScope : "all";
        const createdAfter = String(url.searchParams.get("created_after") || "").slice(0, 40);
        const limit = Math.min(50, Math.max(5, Number.parseInt(url.searchParams.get("limit") || "25", 10) || 25));
        const pageOffset = Math.min(100000, Math.max(0, Number.parseInt(url.searchParams.get("page_offset") || "0", 10) || 0));
        const fileOffset = Math.min(100000, Math.max(0, Number.parseInt(url.searchParams.get("file_offset") || "0", 10) || 0));
        let result;
        if (q) {
          const terms = [...new Set(q.split(/\s+/).map(value => value.trim()).filter(Boolean))].slice(0, 6);
          const escapeLike = value => String(value).replace(/[!%_]/g, character => "!" + character);
          const patterns = terms.map(term => "%" + escapeLike(term) + "%");
          const phrasePattern = "%" + escapeLike(q) + "%";
          const prefixPattern = escapeLike(terms[0] || q) + "%";
          const shouldSearchPages = scope !== "files";
          const shouldSearchFiles = scope !== "title";
          const pageCondition = terms.map(() => scope === "title"
            ? "title LIKE ? ESCAPE '!'"
            : "(title LIKE ? ESCAPE '!' OR content LIKE ? ESCAPE '!')"
          ).join(" AND ");
          const pageParameters = terms.flatMap((term, index) => {
            const pattern = patterns[index];
            return scope === "title" ? [pattern] : [pattern, pattern];
          });
          const fileCondition = terms.map(() =>
            "(filename LIKE ? ESCAPE '!' OR EXISTS (SELECT 1 FROM image_aliases WHERE image_aliases.image_id = images.id AND image_aliases.alias LIKE ? ESCAPE '!'))"
          ).join(" AND ");
          const fileParameters = terms.flatMap((term, index) => [patterns[index], patterns[index]]);
          const makeSnippet = source => {
            let plain = String(source || "")
              .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
              .replace(/\[\[([^\]]+)\]\]/g, "$1")
              .replace(/\[https?:\/\/\S+\s+([^\]]+)\]/gi, "$1")
              .replace(/<[^>]*>/g, " ")
              .replace(/'{2,5}/g, "")
              .replace(/^\s*=+.*?=+\s*$/gm, " ")
              .replace(/[|{}\[\]#]/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            if (!plain) return "";
            const lower = plain.toLocaleLowerCase("ko-KR");
            const positions = terms.map(term => lower.indexOf(term.toLocaleLowerCase("ko-KR"))).filter(index => index >= 0);
            const matchAt = positions.length ? Math.min(...positions) : 0;
            const start = Math.max(0, matchAt - 78);
            const end = Math.min(plain.length, start + 230);
            return (start > 0 ? "…" : "") + plain.slice(start, end) + (end < plain.length ? "…" : "");
          };
          let pageTotal = 0;
          let pages = [];
          if (shouldSearchPages) {
            const [count, rows] = await Promise.all([
              env.DB.prepare("SELECT COUNT(*) AS total FROM pages WHERE " + pageCondition).bind(...pageParameters).first(),
              env.DB.prepare(
                "SELECT title, content, created_at, updated_at FROM pages WHERE " + pageCondition +
                " ORDER BY CASE WHEN lower(title) = lower(?) THEN 0 WHEN lower(title) LIKE lower(?) ESCAPE '!' THEN 1 WHEN lower(title) LIKE lower(?) ESCAPE '!' THEN 2 ELSE 3 END, updated_at DESC, title COLLATE NOCASE ASC LIMIT ? OFFSET ?"
              ).bind(...pageParameters, q, prefixPattern, phrasePattern, limit, pageOffset).all()
            ]);
            pageTotal = Number(count?.total || 0);
            pages = (rows.results || []).map(page => {
              const title = String(page.title || "");
              const titleLower = title.toLocaleLowerCase("ko-KR");
              const titleMatch = terms.every(term => titleLower.includes(term.toLocaleLowerCase("ko-KR")));
              return {
                title,
                created_at: page.created_at,
                updated_at: page.updated_at,
                match_type: titleMatch ? "title" : "content",
                snippet: titleMatch ? "" : makeSnippet(page.content)
              };
            });
          }
          let fileTotal = 0;
          let files = [];
          if (shouldSearchFiles) {
            await ensureImageSchema(env);
            const [count, rows] = await Promise.all([
              env.DB.prepare("SELECT COUNT(*) AS total FROM images WHERE " + fileCondition).bind(...fileParameters).first(),
              env.DB.prepare(
                "SELECT id, filename, content_type, created_at, (SELECT GROUP_CONCAT(alias, ' · ') FROM image_aliases WHERE image_aliases.image_id = images.id) AS aliases FROM images WHERE " + fileCondition +
                " ORDER BY CASE WHEN lower(filename) = lower(?) THEN 0 WHEN lower(filename) LIKE lower(?) ESCAPE '!' THEN 1 WHEN lower(filename) LIKE lower(?) ESCAPE '!' THEN 2 ELSE 3 END, created_at DESC, filename COLLATE NOCASE ASC LIMIT ? OFFSET ?"
              ).bind(...fileParameters, q, prefixPattern, phrasePattern, limit, fileOffset).all()
            ]);
            fileTotal = Number(count?.total || 0);
            files = rows.results || [];
          }
          const total = pageTotal + fileTotal;
          const pagesHasMore = pageTotal > pageOffset + pages.length;
          const filesHasMore = fileTotal > fileOffset + files.length;
          return response({
            pages, files, total, page_total: pageTotal, file_total: fileTotal, scope,
            limit, page_offset: pageOffset, file_offset: fileOffset,
            pages_has_more: pagesHasMore, files_has_more: filesHasMore,
            has_more: pagesHasMore || filesHasMore
          }, 200, cors);
        } else if (createdAfter && !Number.isNaN(Date.parse(createdAfter))) {
          result = await env.DB.prepare("SELECT title, created_at, updated_at FROM pages WHERE created_at > ? ORDER BY created_at DESC LIMIT 100").bind(createdAfter).all();
        } else {
          result = await env.DB.prepare("SELECT title, created_at, updated_at FROM pages ORDER BY updated_at DESC LIMIT 100").all();
        }
        return response({ pages: result.results || [] }, 200, cors);
      }
      if (url.pathname === "/api/recent" && request.method === "GET") {
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT NOT NULL, editor TEXT NOT NULL, created_at TEXT NOT NULL)").run();
        const columns = await env.DB.prepare("PRAGMA table_info(revisions)").all();
        if (!(columns.results || []).some(column => column.name === "summary")) {
          await env.DB.prepare("ALTER TABLE revisions ADD COLUMN summary TEXT NOT NULL DEFAULT ''").run();
        }
        const result = await env.DB.prepare("SELECT id, title, editor, created_at, summary FROM revisions ORDER BY id DESC LIMIT 200").all();
        return response({ changes: result.results || [] }, 200, cors);
      }
      if (url.pathname === "/api/backlinks" && request.method === "GET") {
        const title = cleanTitle(url.searchParams.get("title"));
        if (!title) return response({ error: "문서 제목을 입력하세요." }, 400, cors);
        const candidate = await env.DB.prepare("SELECT title, content, updated_at FROM pages WHERE content LIKE ? ORDER BY updated_at DESC LIMIT 1000")
          .bind("%[[" + title + "%").all();
        const backlinks = [];
        for (const page of (candidate.results || [])) {
          if (page.title === title) continue;
          let count = 0;
          const links = String(page.content || "").matchAll(/\[\[([^\]]+)\]\]/g);
          for (const link of links) {
            const target = String(link[1] || "").split("|")[0].split("#")[0].trim();
            if (target.toLocaleLowerCase() === title.toLocaleLowerCase()) count++;
          }
          if (count) backlinks.push({ title: page.title, updated_at: page.updated_at, count });
        }
        return response({ title, backlinks }, 200, cors);
      }
      if (url.pathname === "/api/categories" && request.method === "GET") {
        const result = await env.DB.prepare("SELECT title, content FROM pages ORDER BY title COLLATE NOCASE LIMIT 10000").all();
        const categories = new Map();
        for (const page of (result.results || [])) {
          const content = String(page.content || "");
          const isCategoryPage = /^(?:분류|category):/i.test(String(page.title || ""));
          const matches = content.matchAll(/\[\[(?:분류|category):([^\]|#]+)(?:\|[^\]]*)?\]\]/gi);
          for (const match of matches) {
            const name = String(match[1] || "").trim();
            if (!name) continue;
            const key = name.toLocaleLowerCase();
            const item = categories.get(key) || { name, count: 0, subcategoryCount: 0 };
            if (isCategoryPage) item.subcategoryCount++;
            else if (page.title !== "대문") item.count++;
            categories.set(key, item);
          }
        }
        const values = [...categories.values()].sort((a, b) => a.name.localeCompare(b.name, "ko"));
        return response({ categories: values, total: values.length }, 200, cors);
      }
      if (url.pathname === "/api/category" && request.method === "GET") {
        const name = String(url.searchParams.get("name") || "").trim().replace(/^(?:분류|category):/i, "").slice(0, 120);
        if (!name) return response({ error: "분류 이름을 입력하세요." }, 400, cors);
        const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "100", 10) || 100));
        const offset = Math.min(1000000, Math.max(0, Number.parseInt(url.searchParams.get("offset") || "0", 10) || 0));
        const markers = [
          "[[분류:" + name + "]]",
          "[[분류:" + name + "|",
          "[[category:" + name + "]]",
          "[[category:" + name + "|"
        ];
        const membershipSql = "instr(lower(content), lower(?)) > 0 OR instr(lower(content), lower(?)) > 0 OR instr(lower(content), lower(?)) > 0 OR instr(lower(content), lower(?)) > 0";
        const [categoryPage, subcategories, countRow, pages] = await Promise.all([
          env.DB.prepare("SELECT title, content, updated_at FROM pages WHERE title = ? COLLATE NOCASE OR title = ? COLLATE NOCASE LIMIT 1")
            .bind("분류:" + name, "category:" + name).first(),
          env.DB.prepare("SELECT title, updated_at FROM pages WHERE (" + membershipSql + ") AND (lower(title) LIKE '분류:%' OR lower(title) LIKE 'category:%') ORDER BY title COLLATE NOCASE ASC LIMIT 1000")
            .bind(...markers).all(),
          env.DB.prepare("SELECT COUNT(*) AS total FROM pages WHERE (" + membershipSql + ") AND title <> '대문' AND lower(title) NOT LIKE '분류:%' AND lower(title) NOT LIKE 'category:%'")
            .bind(...markers).first(),
          env.DB.prepare("SELECT title, updated_at FROM pages WHERE (" + membershipSql + ") AND title <> '대문' AND lower(title) NOT LIKE '분류:%' AND lower(title) NOT LIKE 'category:%' ORDER BY title COLLATE NOCASE ASC LIMIT ? OFFSET ?")
            .bind(...markers, limit, offset).all()
        ]);
        const source = String(categoryPage?.content || "");
        const parentCategories = [...source.matchAll(/\[\[(?:분류|category):([^\]|#]+)(?:\|[^\]]*)?\]\]/gi)]
          .map(match => String(match[1] || "").trim()).filter(Boolean);
        const description = source.replace(/^\s*\[\[(?:분류|category):[^\]]+\]\]\s*$/gim, "").trim();
        const childItems = (subcategories.results || []).map(page => ({
          title: page.title,
          name: String(page.title || "").replace(/^(?:분류|category):/i, ""),
          updated_at: page.updated_at
        }));
        return response({
          name,
          description,
          categoryUpdatedAt: categoryPage?.updated_at || "",
          parentCategories: [...new Set(parentCategories)],
          subcategories: childItems,
          pages: pages.results || [],
          total: Number(countRow?.total || 0),
          limit,
          offset
        }, 200, cors);
      }
      if (url.pathname === "/api/category" && request.method === "GET") {
        const name = String(url.searchParams.get("name") || "").trim().slice(0, 160);
        if (!name) return response({ error: "분류 이름을 입력하세요." }, 400, cors);
        const patterns = [
          "%[[분류:" + name + "]]%",
          "%[[분류:" + name + "|%",
          "%[[category:" + name + "]]%",
          "%[[category:" + name + "|%"
        ];
        const result = await env.DB.prepare("SELECT title, updated_at FROM pages WHERE content LIKE ? OR content LIKE ? OR content LIKE ? OR content LIKE ? ORDER BY updated_at DESC LIMIT 500").bind(...patterns).all();
        return response({ name, pages: result.results || [] }, 200, cors);
      }
      if (url.pathname === "/api/render" && request.method === "GET") {
        const title = cleanTitle(url.searchParams.get("title"));
        if (!title) return response({ error: "문서 제목을 입력하세요." }, 400, cors);
        const cached = namuPageResponseCache.get(title);
        if (cached && cached.expiresAt > Date.now()) {
          return response(cached.value, 200, { ...cors, "X-AonWiki-Render": "namumark-worker", "X-AonWiki-Cache": "HIT" });
        }
        if (namuPageResponsePending.has(title)) {
          const value = await namuPageResponsePending.get(title);
          return response(value, 200, { ...cors, "X-AonWiki-Render": "namumark-worker", "X-AonWiki-Cache": "COALESCED" });
        }
        const pending = (async () => {
          await ensurePageProtectionSchema(env);
          const selectPage = async pageTitle => env.DB.prepare(
            "SELECT p.title, p.content, p.created_at, p.updated_at, pp.level AS protectionLevel, pp.reason AS protectionReason, pp.protected_by AS protectedBy, pp.updated_at AS protectionUpdatedAt FROM pages p LEFT JOIN page_protections pp ON pp.title = p.title WHERE p.title = ?"
          ).bind(pageTitle).first();
          let page = await selectPage(title);
          if (!page) {
            await ensurePageAliasSchema(env);
            const alias = await env.DB.prepare("SELECT title FROM page_aliases WHERE alias = ? COLLATE NOCASE").bind(title).first();
            if (alias) page = await selectPage(alias.title);
          }
          if (!page) return { page: null, html: "", engine: "namumark-worker" };
          const linkColors = await getPageLinkColors(env, page.title);
          const sourceText = String(page.content || "");
          const largeDocument = sourceText.length > 6000;
          let clientRender = null;
          if (largeDocument) {
            // Large documents are parsed in the browser to avoid Worker CPU
            // limits. Still provide the same expanded include/document/image
            // database used by preview, otherwise normal document rendering
            // loses includes, file resolution, and document existence checks.
            const payload = await buildAonClientRenderPayload(env, page.title, sourceText, linkColors);
            clientRender = {
              chunked: true,
              totalChars: sourceText.length,
              chunkSize: 8000,
              linkColors: payload.linkColors || linkColors || {},
              records: payload.records || [],
              pageCount: payload.pageCount || 0,
              imageMap: payload.imageMap || {},
              source: payload.source || ""
            };
          } else if (page.title === "아온") {
            clientRender = await buildAonClientRenderPayload(env, page.title, sourceText, linkColors);
          }
          const rendered = clientRender
            ? { html: "" }
            : await renderNamuMarkupOnWorker(env, page.title, sourceText, linkColors);
          return {
            page: {
              title: page.title,
              content: largeDocument ? "" : sourceText,
              contentLength: sourceText.length,
              created_at: page.created_at,
              updated_at: page.updated_at,
              protectionLevel: page.protectionLevel || "none",
              protectionReason: page.protectionReason || "",
              protectedBy: page.protectedBy || "",
              protectionUpdatedAt: page.protectionUpdatedAt || ""
            },
            html: rendered.html,
            imageMap: rendered.imageMap || {},
            clientRender,
            engine: clientRender ? "namumark-client" : "namumark-worker"
          };
        })().then(value => {
          namuPageResponseCache.set(title, { value, expiresAt: Date.now() + 30 * 1000 });
          if (namuPageResponseCache.size > 100) namuPageResponseCache.delete(namuPageResponseCache.keys().next().value);
          return value;
        }).finally(() => namuPageResponsePending.delete(title));
        namuPageResponsePending.set(title, pending);
        const value = await pending;
        return response(value, 200, { ...cors, "X-AonWiki-Render": "namumark-worker", "X-AonWiki-Cache": "MISS" });
      }
      if (url.pathname === "/api/render-chunk" && request.method === "GET") {
        const title = cleanTitle(url.searchParams.get("title"));
        if (!title) return response({ error: "문서 제목을 입력하세요." }, 400, cors);
        const requestedOffset = Math.max(0, Number(url.searchParams.get("offset") || 0) || 0);
        const requestedLimit = Math.max(4096, Math.min(12000, Number(url.searchParams.get("limit") || 8000) || 8000));
        const selectPage = async pageTitle => env.DB.prepare(
          "SELECT title, content FROM pages WHERE title = ?"
        ).bind(pageTitle).first();
        let page = await selectPage(title);
        if (!page) {
          await ensurePageAliasSchema(env);
          const alias = await env.DB.prepare("SELECT title FROM page_aliases WHERE alias = ? COLLATE NOCASE").bind(title).first();
          if (alias) page = await selectPage(alias.title);
        }
        if (!page) return response({ error: "문서를 찾을 수 없습니다." }, 404, cors);
        const source = String(page.content || "");
        const offset = Math.min(requestedOffset, source.length);
        const end = Math.min(source.length, offset + requestedLimit);
        return response({
          title: page.title,
          offset,
          end,
          total: source.length,
          chunk: source.slice(offset, end)
        }, 200, {
          ...cors,
          "Cache-Control": "private, max-age=30",
          "X-AonWiki-Render": "namumark-chunk"
        });
      }

      if (url.pathname === "/api/render" && request.method === "POST") {
        if (await authRateLimited(request, env, "namumark-preview", 240, 60 * 1000)) {
          return response({ error: "미리보기 요청이 너무 많습니다. 잠시 후 다시 시도하세요." }, 429, cors);
        }
        const body = await readJsonBody(request);
        const title = cleanTitle(body.title || "미리보기") || "미리보기";
        const content = String(body.content || "");
        if (content.length > 200000) return response({ error: "미리보기 문서는 200,000자 이하만 지원합니다." }, 413, cors);
        const previewUser = await currentUser(request, env);
        let linkColors = {};
        if (previewUser?.isAdmin) {
          const extractedColors = extractAdminLinkColors(content);
          if (extractedColors.errors.length) return response({ error: extractedColors.errors[0] }, 400, cors);
          linkColors = extractedColors.colors;
        } else {
          const existingPage = await findWikiPage(env, title);
          if (existingPage) linkColors = await getPageLinkColors(env, existingPage.title);
        }
        const rendered = await renderNamuMarkupOnWorker(env, title, content, linkColors);
        return response({ html: rendered.html, engine: "namumark-worker", title }, 200, {
          ...cors,
          "X-AonWiki-Render": "namumark-worker"
        });
      }
      if (url.pathname === "/api/page" && request.method === "GET") {
        const title = cleanTitle(url.searchParams.get("title"));
        if (!title) return response({ error: "문서 제목을 입력하세요." }, 400, cors);
        let page = await env.DB.prepare("SELECT title, content, created_at, updated_at FROM pages WHERE title = ?").bind(title).first();
        if (!page) {
          await ensurePageAliasSchema(env);
          const alias = await env.DB.prepare("SELECT title FROM page_aliases WHERE alias = ? COLLATE NOCASE").bind(title).first();
          if (alias) page = await env.DB.prepare("SELECT title, content, created_at, updated_at FROM pages WHERE title = ?").bind(alias.title).first();
        }
        await ensurePageProtectionSchema(env);
        await ensureOfficialDocumentSchema(env);
        const protection = page ? await env.DB.prepare("SELECT level, reason, protected_by, updated_at FROM page_protections WHERE title = ?").bind(page.title).first() : null;
        const official = page ? await env.DB.prepare("SELECT marked_by, updated_at FROM official_documents WHERE title = ?").bind(page.title).first() : null;
        const user = await currentUser(request, env);
        const editPermission = page && user ? await checkPageEditPermission(env, user, page.title) : null;
        return response({ page: page ? { ...page, protectionLevel: protection?.level || "none", protectionReason: protection?.reason || "", protectedBy: protection?.protected_by || "", protectionUpdatedAt: protection?.updated_at || "", canEdit: user ? !editPermission : null, editDeniedReason: editPermission?.error || "", official: Boolean(official), officialMarkedBy: official?.marked_by || "", officialUpdatedAt: official?.updated_at || "" } : null }, 200, cors);
      }
      if (url.pathname === "/api/history" && request.method === "GET") {
        const title = cleanTitle(url.searchParams.get("title"));
        if (!title) return response({ error: "문서 제목을 입력하세요." }, 400, cors);
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT NOT NULL, editor TEXT NOT NULL, created_at TEXT NOT NULL)").run();
        const columns = await env.DB.prepare("PRAGMA table_info(revisions)").all();
        if (!(columns.results || []).some(column => column.name === "summary")) {
          await env.DB.prepare("ALTER TABLE revisions ADD COLUMN summary TEXT NOT NULL DEFAULT ''").run();
        }
        const result = await env.DB.prepare("SELECT id, title, editor, created_at, summary FROM revisions WHERE title = ? ORDER BY id DESC LIMIT 50").bind(title).all();
        return response({ revisions: result.results || [] }, 200, cors);
      }
      if (url.pathname === "/api/revision" && request.method === "GET") {
        const id = Number(url.searchParams.get("id"));
        const title = cleanTitle(url.searchParams.get("title"));
        if (!Number.isSafeInteger(id) || id < 1) return response({ error: "올바른 버전 ID가 아닙니다." }, 400, cors);
        if (!title) return response({ error: "문서 제목을 지정해야 합니다." }, 400, cors);
        const revision = await env.DB.prepare(
          "SELECT id, title, content, editor, created_at, summary FROM revisions WHERE id = ? AND title = ?"
        ).bind(id, title).first();
        if (!revision) return response({ error: "해당 문서에 속한 버전을 찾을 수 없습니다." }, 404, cors);
        return response({ revision }, 200, cors);
      }
      if (url.pathname === "/api/revision/restore" && request.method === "POST") {
        const user = await currentUser(request, env);
        if (!user) return response({ error: "버전을 복원하려면 로그인하세요." }, 401, cors);
        if (await authRateLimited(request, env, "revision-restore", 20, 60 * 1000)) return response({ error: "복원 요청이 너무 많습니다. 잠시 후 다시 시도하세요." }, 429, cors);
        const body = await readJsonBody(request), id = Number(body.id), title = cleanTitle(body.title);
        if (!title || !Number.isSafeInteger(id) || id < 1) return response({ error: "문서 제목 또는 버전 번호가 올바르지 않습니다." }, 400, cors);
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT NOT NULL, editor TEXT NOT NULL, created_at TEXT NOT NULL)").run();
        const columns = await env.DB.prepare("PRAGMA table_info(revisions)").all();
        if (!(columns.results || []).some(column => column.name === "summary")) await env.DB.prepare("ALTER TABLE revisions ADD COLUMN summary TEXT NOT NULL DEFAULT ''").run();
        const revision = await env.DB.prepare("SELECT id, title, content FROM revisions WHERE id = ? AND title = ?").bind(id, title).first();
        if (!revision) return response({ error: "해당 문서에 속한 버전을 찾을 수 없습니다." }, 404, cors);
        const editPermission = await checkPageEditPermission(env, user, title);
        if (editPermission) return response({ error: editPermission.error }, editPermission.status, cors);
        const page = await env.DB.prepare("SELECT title, content FROM pages WHERE title = ?").bind(title).first();
        if (!page) return response({ error: "현재 문서를 찾을 수 없습니다." }, 404, cors);
        const now = new Date().toISOString(), content = String(revision.content || "");
        const currentContent = String(page.content || "");
        // Preserve the live content explicitly before replacing it with the selected revision.
        if (currentContent !== content) {
          await env.DB.prepare("INSERT INTO revisions (title, content, editor, created_at, summary) VALUES (?, ?, ?, ?, ?)")
            .bind(title, currentContent, user.username, now, "버전 복원 직전 자동 보존").run();
        }
        await env.DB.prepare("UPDATE pages SET content = ?, updated_at = ? WHERE title = ?").bind(content, now, title).run();
        await env.DB.prepare("INSERT INTO revisions (title, content, editor, created_at, summary) VALUES (?, ?, ?, ?, ?)")
          .bind(title, content, user.username, now, "이전 버전 #" + id + " 복원").run();
        invalidateNamuServerIndexes();
        await clearPersistentNamuRenderCache(env, title);
        return response({ ok: true, title, restored_revision: id, updated_at: now }, 200, cors);
      }
      if (url.pathname === "/api/page" && request.method === "PUT") {
        const authenticatedUser = await currentUser(request, env);
        const user = authenticatedUser || anonymousEditorIdentity(request);
        if (user.isAnonymous && await authRateLimited(request, env, "anonymous-page-edit", 20, 10 * 60 * 1000)) {
          return response({ error: "비로그인 편집 요청이 너무 많습니다. 10분 뒤 다시 시도하세요." }, 429, cors);
        }
        const body = await readJsonBody(request);
        const title = cleanTitle(body.title);
        const originalTitle = body.createOnly ? "" : cleanTitle(body.originalTitle || "");
        const content = String(body.content || "");
        if (!title) return response({ error: "문서 제목을 입력하세요." }, 400, cors);
        if (user.isAnonymous && originalTitle && originalTitle !== title) {
          return response({ error: "비로그인 편집에서는 문서 제목을 변경할 수 없습니다." }, 403, cors);
        }
        const protectionTitle = cleanTitle(body.originalTitle || title);
        const editPermission = await checkPageEditPermission(env, user, title, protectionTitle);
        if (editPermission) return response({ error: editPermission.error }, editPermission.status, cors);
        if (content.length > 200000) return response({ error: "문서는 200,000자 이하로 작성해 주세요." }, 413, cors);
        const now = new Date().toISOString();
        const summary = String(body.summary || "").trim().slice(0, 200);
        const extractedLinkColors = extractAdminLinkColors(content);
        if (user.isAdmin && extractedLinkColors.errors.length) return response({ error: extractedLinkColors.errors[0] }, 400, cors);
        const columns = await env.DB.prepare("PRAGMA table_info(revisions)").all();
        if (!(columns.results || []).some(column => column.name === "summary")) {
          await env.DB.prepare("ALTER TABLE revisions ADD COLUMN summary TEXT NOT NULL DEFAULT ''").run();
        }

        let previous = null;
        if (body.createOnly) {
          previous = await env.DB.prepare("SELECT created_at FROM pages WHERE title = ?").bind(title).first();
          if (previous) return response({ error: "같은 제목의 문서가 이미 있습니다." }, 409, cors);
          await env.DB.prepare("INSERT INTO pages (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)")
            .bind(title, content, now, now).run();
        } else if (originalTitle && originalTitle !== title) {
          await ensurePageAliasSchema(env);
          previous = await env.DB.prepare("SELECT created_at FROM pages WHERE title = ?").bind(originalTitle).first();
          if (!previous) return response({ error: "이전 문서를 찾을 수 없습니다. 새로고침 후 다시 시도하세요." }, 404, cors);
          const occupied = await env.DB.prepare("SELECT title FROM pages WHERE title = ? COLLATE NOCASE").bind(title).first();
          if (occupied) return response({ error: "변경할 제목이 이미 사용 중입니다." }, 409, cors);
          const aliasCollision = await env.DB.prepare("SELECT title FROM page_aliases WHERE alias = ? COLLATE NOCASE").bind(title).first();
          if (aliasCollision && aliasCollision.title !== originalTitle) {
            return response({ error: "변경할 제목이 다른 문서의 이전 제목으로 사용 중입니다." }, 409, cors);
          }

          await env.DB.prepare("UPDATE pages SET title = ?, content = ?, updated_at = ? WHERE title = ?")
            .bind(title, content, now, originalTitle).run();
          await env.DB.prepare("UPDATE revisions SET title = ? WHERE title = ?").bind(title, originalTitle).run();
          await env.DB.prepare("UPDATE page_aliases SET title = ? WHERE title = ?").bind(title, originalTitle).run();
          await env.DB.prepare("INSERT INTO page_aliases (alias, title, created_at) VALUES (?, ?, ?) ON CONFLICT(alias) DO UPDATE SET title = excluded.title, created_at = excluded.created_at")
            .bind(originalTitle, title, now).run();
          await ensurePageLinkColorsSchema(env);
          await env.DB.prepare("UPDATE page_link_colors SET title = ? WHERE title = ?").bind(title, originalTitle).run();
        } else {
          previous = await env.DB.prepare("SELECT created_at FROM pages WHERE title = ?").bind(title).first();
          if (!previous) return response({ error: "수정할 문서를 찾을 수 없습니다." }, 404, cors);
          await env.DB.prepare("UPDATE pages SET content = ?, updated_at = ? WHERE title = ?")
            .bind(content, now, title).run();
        }

        invalidateNamuServerIndexes();
        await clearPersistentNamuRenderCache(env, title);
        await env.DB.prepare("INSERT INTO revisions (title, content, editor, created_at, summary) VALUES (?, ?, ?, ?, ?)")
          .bind(title, content, user.username, now, summary).run();
        if (user.isAdmin) await savePageLinkColors(env, title, extractedLinkColors, user.username);
        return response({ ok: true, title, previous_title: originalTitle && originalTitle !== title ? originalTitle : null, updated_at: now }, 200, cors);
      }
      if (url.pathname === "/api/upload" && request.method === "POST") {
        const user = await currentUser(request, env);
        if (!user) return response({ error: "이미지를 업로드하려면 로그인하세요." }, 401, cors);
        const form = await request.formData();
        const file = form.get("file");
        if (!file || typeof file.arrayBuffer !== "function") return response({ error: "이미지 파일을 선택하세요." }, 400, cors);
        const allowedTypes = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];
        if (!allowedTypes.includes(file.type)) return response({ error: "PNG, JPG, GIF, WebP, SVG 파일만 지원합니다." }, 415, cors);
        if (file.size < 1 || file.size > 1 * 1024 * 1024) return response({ error: "이미지 파일은 1MB 이하만 지원합니다." }, 413, cors);
        await ensureImageSchema(env);
        let bytes;
        if (file.type === "image/svg+xml") {
          try {
            const svg = validateSvgUpload(await file.text());
            bytes = new TextEncoder().encode(svg);
          } catch (error) {
            return response({ error: error.message || "SVG 파일을 확인할 수 없습니다." }, 400, cors);
          }
        } else {
          bytes = new Uint8Array(await file.arrayBuffer());
        }
        let binary = "";
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        const encoded = btoa(binary);
        const key = crypto.randomUUID();
        const requestedName = cleanImageName(form.get("filename") || file.name || "image", file.type);
        const dot = requestedName.lastIndexOf(".");
        const base = requestedName.slice(0, dot), extension = requestedName.slice(dot);
        let storedFilename = requestedName;
        let suffix = 2;
        while (
          await env.DB.prepare("SELECT id FROM images WHERE filename = ? COLLATE NOCASE").bind(storedFilename).first() ||
          await env.DB.prepare("SELECT image_id FROM image_aliases WHERE alias = ? COLLATE NOCASE").bind(storedFilename).first()
        ) {
          storedFilename = base + " (" + suffix++ + ")" + extension;
        }
        const now = new Date().toISOString();
        await env.DB.prepare("INSERT INTO images (id, content_type, data_base64, filename, created_at, owner) VALUES (?, ?, ?, ?, ?, ?)")
          .bind(key, file.type, encoded, storedFilename, now, user.username).run();
        return response({ ok: true, key, filename: storedFilename, url: new URL("/media/" + key, url.origin).href }, 201, cors);
      }
      if (url.pathname === "/api/file" && request.method === "GET") {
        await ensureImageSchema(env);
        const name = String(url.searchParams.get("name") || "").trim().slice(0, 160);
        if (!name) return response({ error: "파일 이름을 입력하세요." }, 400, cors);
        let image;
        if (/^[a-f0-9-]{36}$/i.test(name)) {
          image = await env.DB.prepare("SELECT id, filename, content_type, owner FROM images WHERE id = ?").bind(name).first();
        } else {
          image = await env.DB.prepare("SELECT id, filename, content_type, owner FROM images WHERE filename = ? COLLATE NOCASE ORDER BY created_at DESC LIMIT 1").bind(name).first();
          if (!image) {
            image = await env.DB.prepare("SELECT images.id, images.filename, images.content_type, images.owner FROM image_aliases JOIN images ON images.id = image_aliases.image_id WHERE image_aliases.alias = ? COLLATE NOCASE LIMIT 1").bind(name).first();
          }
        }
        if (!image) return response({ error: "파일을 찾을 수 없습니다." }, 404, cors);
        return response({ image: { key: image.id, filename: image.filename, content_type: image.content_type, url: new URL("/media/" + image.id, url.origin).href } }, 200, cors);
      }
      if (url.pathname === "/api/file" && request.method === "PATCH") {
        const user = await currentUser(request, env);
        if (!user) return response({ error: "파일 이름을 변경하려면 로그인하세요." }, 401, cors);
        await ensureImageSchema(env);
        const body = await readJsonBody(request);
        const id = String(body.id || "");
        if (!/^[a-f0-9-]{36}$/i.test(id)) return response({ error: "잘못된 파일 식별자입니다." }, 400, cors);
        const image = await env.DB.prepare("SELECT id, filename, content_type, owner FROM images WHERE id = ?").bind(id).first();
        if (!image) return response({ error: "파일을 찾을 수 없습니다." }, 404, cors);
        if (!user.isAdmin && image.owner !== user.username) return response({ error: "본인이 올린 파일만 이름을 변경할 수 있습니다." }, 403, cors);
        if (!String(body.filename || "").trim()) return response({ error: "새 파일 이름을 입력하세요." }, 400, cors);
        const newFilename = cleanImageName(body.filename, image.content_type);
        const collision = await env.DB.prepare("SELECT id FROM images WHERE filename = ? COLLATE NOCASE AND id <> ?").bind(newFilename, id).first();
        const previousAliasCollision = await env.DB.prepare("SELECT image_id FROM image_aliases WHERE alias = ? COLLATE NOCASE AND image_id <> ?").bind(image.filename, id).first();
        if (previousAliasCollision) return response({ error: "이전 이름이 다른 파일에서 사용 중이어서 안전하게 변경할 수 없습니다." }, 409, cors);
        const aliasCollision = await env.DB.prepare("SELECT image_id FROM image_aliases WHERE alias = ? COLLATE NOCASE AND image_id <> ?").bind(newFilename, id).first();
        if (collision || aliasCollision) return response({ error: "이미 사용 중이거나 이전 이름으로 예약된 파일 이름입니다." }, 409, cors);
        if (newFilename !== image.filename) {
          await env.DB.prepare("INSERT INTO image_aliases (alias, image_id, created_at) VALUES (?, ?, ?) ON CONFLICT(alias) DO NOTHING")
            .bind(image.filename, id, new Date().toISOString()).run();
          await env.DB.prepare("UPDATE images SET filename = ? WHERE id = ?").bind(newFilename, id).run();
          await env.DB.prepare("DELETE FROM image_aliases WHERE alias = ? COLLATE NOCASE AND image_id = ?").bind(newFilename, id).run();
        }
        return response({ ok: true, id, filename: newFilename, previous_filename: image.filename }, 200, cors);
      }
      if (url.pathname === "/api/files" && request.method === "GET") {
        await ensureImageSchema(env);
        const manage = url.searchParams.get("manage") === "1";
        if (manage) {
          const user = await currentUser(request, env);
          if (!user) return response({ error: "파일 관리에는 로그인이 필요합니다." }, 401, cors);
          const result = user.isAdmin
            ? await env.DB.prepare("SELECT id, filename, content_type, created_at, owner FROM images ORDER BY created_at DESC LIMIT 500").all()
            : await env.DB.prepare("SELECT id, filename, content_type, created_at, owner FROM images WHERE owner = ? ORDER BY created_at DESC LIMIT 500").bind(user.username).all();
          return response({ files: result.results || [], isAdmin: Boolean(user.isAdmin) }, 200, cors);
        }
        const result = await env.DB.prepare("SELECT id, filename, content_type, created_at FROM images ORDER BY created_at DESC LIMIT 500").all();
        const aliases = await env.DB.prepare("SELECT alias FROM image_aliases ORDER BY created_at DESC LIMIT 1000").all();
        return response({ files: result.results || [], aliases: aliases.results || [] }, 200, cors);
      }
      if (url.pathname.startsWith("/image/") && request.method === "GET") {
        await ensureImageSchema(env);
        const match = url.pathname.match(/^\/image\/([a-f0-9]{56})\.([a-z0-9]+)\.cache_v[0-9]+$/i);
        if (!match) return new Response("Not found", { status: 404 });
        const candidates = await env.DB.prepare("SELECT id, filename FROM images").all();
        let imageId = (candidates.results || []).find(item => imageNameMatches(item.filename, match[1], match[2]))?.id;
        if (!imageId) {
          const aliases = await env.DB.prepare("SELECT alias, image_id FROM image_aliases").all();
          imageId = (aliases.results || []).find(item => imageNameMatches(item.alias, match[1], match[2]))?.image_id;
        }
        if (!imageId) return new Response("Not found", { status: 404 });
        const image = await env.DB.prepare("SELECT content_type, data_base64 FROM images WHERE id = ?").bind(imageId).first();
        if (!image) return new Response("Not found", { status: 404 });
        const binary = atob(image.data_base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const headers = new Headers(cors);
        headers.set("Content-Type", image.content_type);
        headers.set("Cache-Control", "public, max-age=86400");
        const etag = '"'+match[1]+"."+match[2]+'"';
        headers.set("ETag", etag);
        if (request.headers.get("If-None-Match") === etag) return new Response(null, { status: 304, headers });
        headers.set("X-Content-Type-Options", "nosniff");
        if (image.content_type === "image/svg+xml") headers.set("Content-Security-Policy", "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox");
        return new Response(bytes, { headers });
      }
      if (url.pathname.startsWith("/media/") && request.method === "GET") {
        const key = url.pathname.slice("/media/".length);
        if (!/^[a-f0-9-]{36}$/i.test(key)) return new Response("Not found", { status: 404 });
        const image = await env.DB.prepare("SELECT content_type, data_base64 FROM images WHERE id = ?").bind(key).first();
        if (!image) return new Response("Not found", { status: 404 });
        const binary = atob(image.data_base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const headers = new Headers(cors);
        headers.set("Content-Type", image.content_type);
        headers.set("Content-Length", String(bytes.byteLength));
        headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
        headers.set("ETag", '"' + key + '"');
        headers.set("X-Content-Type-Options", "nosniff");
        if (request.headers.get("If-None-Match") === '"' + key + '"') return new Response(null, { status: 304, headers });
        if (image.content_type === "image/svg+xml") headers.set("Content-Security-Policy", "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox");
        return new Response(bytes, { headers });
      }
      return response({ error: "요청한 경로를 찾을 수 없습니다." }, 404, cors);
    } catch (error) {
      const status = Number(error?.status);
      console.error("AonWiki request failed", {
        method: request.method,
        path: url.pathname,
        status: status || 500,
        message: String(error?.message || error || "unknown")
      });
      if (status >= 400 && status < 500) return response({ error: String(error?.message || "잘못된 요청입니다.") }, status, cors);
      if (status >= 500) return response({ error: "프런트엔드 리소스를 일시적으로 불러오지 못했습니다. 잠시 후 다시 시도하세요." }, 503, cors);
      return response({ error: "서버 내부 오류" }, 500, cors);
    }
  }
};
