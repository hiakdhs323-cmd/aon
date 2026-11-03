import { NamuMarkBundle } from "./namumark-parser.js";
function response(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers }
  });
}
function getCors(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGIN || "https://hiakdhs323-cmd.github.io").split(",").map(v => v.trim());
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Admin-Bootstrap-Secret",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
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
async function authRateLimited(request, env, action, limit, windowMs) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS auth_rate_limits (ip TEXT NOT NULL, action TEXT NOT NULL, attempts INTEGER NOT NULL, window_started_at TEXT NOT NULL, PRIMARY KEY(ip, action))").run();
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
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS admin_tokens (id TEXT PRIMARY KEY NOT NULL, token_hash TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS admin_auth_attempts (ip TEXT PRIMARY KEY NOT NULL, attempts INTEGER NOT NULL, window_started_at TEXT NOT NULL)").run();
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
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS wiki_admins (user_id TEXT PRIMARY KEY NOT NULL, granted_at TEXT NOT NULL, granted_by TEXT NOT NULL)").run();
    const admin = await env.DB.prepare("SELECT user_id FROM wiki_admins WHERE user_id = ?").bind(user.id).first();
    return { username: user.username, role: admin ? "admin" : "user", isAdmin: Boolean(admin) };
  }
  if (await isAdminRequest(request, env)) return { username: "위키 관리자", role: "admin", isAdmin: true };
  return null;
}
let pageProtectionSchemaPromise = null;
let pageAliasSchemaPromise = null;
let imageSchemaPromise = null;
async function ensurePageProtectionSchema(env) {
  if (!pageProtectionSchemaPromise) {
    pageProtectionSchemaPromise = env.DB.prepare("CREATE TABLE IF NOT EXISTS page_protections (title TEXT PRIMARY KEY NOT NULL, level TEXT NOT NULL CHECK(level IN ('registered','admin')), reason TEXT NOT NULL DEFAULT '', protected_by TEXT NOT NULL, updated_at TEXT NOT NULL)").run()
      .catch(error => { pageProtectionSchemaPromise = null; throw error; });
  }
  await pageProtectionSchemaPromise;
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
function imageNameMatches(filename, hash, extension) {
  const value = String(filename || "");
  const dot = value.lastIndexOf(".");
  const base = dot > 0 ? value.slice(0, dot) : value;
  const ext = dot > 0 ? value.slice(dot + 1).toLowerCase() : "jpg";
  return namuFileHash(base).toLowerCase() === hash.toLowerCase() && ext === String(extension || "").toLowerCase();
}


const SERVER_WIKI_TAGS = new Set("A ABBR B BDI BDO BLOCKQUOTE BR CAPTION CENTER CODE COL COLGROUP DD DEL DETAILS DIV DL DT EM FIGCAPTION FIGURE FONT FOOTNOTE_TITLE H1 H2 H3 H4 H5 H6 HR I IFRAME IMG INS KBD LI MARK OL P PRE Q RUBY RT RP S SAMP SMALL SPAN STRIKE STRONG STYLE SUB SUMMARY SUP TABLE TBODY TD TFOOT TH THEAD TR TT U UL VAR VIDEO AUDIO SOURCE".split(" "));
const SERVER_WIKI_ATTRS = new Set("alt allow allowfullscreen class colspan data-opennamu-action fn_target frameborder height href id lang loading open poster referrerpolicy rel rowspan src start style target title type width align valign controls loop muted".split(" "));
function sanitizeServerWikiStyle(raw) {
  const allowed = new Set(["color","background","background-color","font-size","font-weight","font-style","text-align","text-decoration","text-transform","line-height","letter-spacing","word-spacing","width","max-width","min-width","height","max-height","min-height","margin","margin-left","margin-right","margin-top","margin-bottom","padding","border","border-color","border-width","border-style","border-radius","border-collapse","float","clear","display","vertical-align","white-space","list-style-type","image-rendering","object-fit","overflow","overflow-wrap","box-shadow","opacity"]);
  const output=[];
  String(raw||"").split(";").forEach(entry=>{
    const at=entry.indexOf(":");if(at<1)return;
    const key=entry.slice(0,at).trim().toLowerCase();
    const value=entry.slice(at+1).trim();
    if(!allowed.has(key)||!value||/url\s*\(|expression|javascript|@import|[<>{}]/i.test(value))return;
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
let namuPageTitleIndexCache = { expiresAt: 0, rows: [] };
let namuPageTitleIndexPromise = null;
function invalidateNamuServerIndexes() {
  namuPageTitleIndexCache.expiresAt = 0;
  namuPageTitleIndexCache.rows = [];
}
async function getNamuPageTitleIndex(env) {
  if (Date.now() < namuPageTitleIndexCache.expiresAt) return namuPageTitleIndexCache.rows;
  if (!namuPageTitleIndexPromise) {
    namuPageTitleIndexPromise = env.DB.prepare("SELECT title FROM pages ORDER BY title COLLATE NOCASE LIMIT 20000").all()
      .then(result => {
        namuPageTitleIndexCache.rows = result.results || [];
        namuPageTitleIndexCache.expiresAt = Date.now() + 60 * 1000;
        return namuPageTitleIndexCache.rows;
      })
      .finally(() => { namuPageTitleIndexPromise = null; });
  }
  return await namuPageTitleIndexPromise;
}
async function buildNamuServerDatabase(env, title, content) {
  const pageRows=await getNamuPageTitleIndex(env);
  const records=new Map(pageRows.map(row=>[row.title,{title:row.title,data:""}]));
  records.set(title,{title,data:String(content||"")});

  let pending=collectIncludeTargets(content);
  let fetched=0;
  const visited=new Set([title]);
  for(let depth=0;depth<4&&pending.length&&fetched<50;depth++){
    const batch=[...new Set(pending)].filter(name=>!visited.has(name)).slice(0,40);
    pending=[];
    if(!batch.length)break;
    batch.forEach(name=>visited.add(name));
    const placeholders=batch.map(()=>"?").join(",");
    const included=await env.DB.prepare("SELECT title, content FROM pages WHERE title IN ("+placeholders+")").bind(...batch).all();
    for(const page of included.results||[]){
      const item={title:page.title,data:String(page.content||"")};
      records.set(page.title,item);
      fetched++;
      pending.push(...collectIncludeTargets(item.data));
      if(fetched>=50)break;
    }
  }

  const allMarkup=[String(content||""),...[...records.values()].map(item=>item.data||"")].join("\n");
  const categoryAliases = new Set();
  for(const row of pageRows){
    const rowTitle=String(row.title||"");
    if(/^분류:/i.test(rowTitle))categoryAliases.add("category:"+rowTitle.replace(/^분류:/i,""));
    else if(/^category:/i.test(rowTitle))categoryAliases.add(rowTitle);
  }
  for(const category of collectCategoryTargets(allMarkup)){
    categoryAliases.add("category:"+category);
  }

  if(/\[\[(?:파일|file):/i.test(allMarkup)){
    await ensureImageSchema(env);
    const [images,aliases]=await Promise.all([
      env.DB.prepare("SELECT filename FROM images").all(),
      env.DB.prepare("SELECT alias FROM image_aliases").all()
    ]);
    for(const row of images.results||[]){
      const name=String(row.filename||"");
      if(name)records.set("file:"+name,{title:"file:"+name,data:""});
    }
    for(const row of aliases.results||[]){
      const name=String(row.alias||"");
      if(name)records.set("file:"+name,{title:"file:"+name,data:""});
    }
  }
  const data=[...records.values()];
  const lookup=new Map(data.map(item=>[item.title,item]));
  for(const categoryTitle of categoryAliases)lookup.set(categoryTitle,{title:categoryTitle,data:""});
  return {data,lookup};
}
async function sanitizeServerWikiHtml(markup) {
  const input=new Response(String(markup||""),{headers:{"Content-Type":"text/html; charset=utf-8"}});
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
          if(tag==="A"&&value.includes("opennamu_heading_folding"))element.setAttribute("data-opennamu-action",value);
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
async function renderNamuMarkupOnWorker(env, title, source) {
  const database=await buildNamuServerDatabase(env,title,source);
  const parser=new NamuMarkBundle.NamuMark(
    String(source||""),
    {docName:title,useTocSet:"default",docType:"view"},
    database
  );
  const parsed=parser.parse();
  const html=await sanitizeServerWikiHtml(parsed[0]||"");
  return {html,metadata:parsed[2]||{}};
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
  const base = frontendOrigin.replace(/\/$/, "") + "/";
  return html.replace(/((?:href|src)=["'])(style\.css|namumark-beta\.css|app\.js)([^"']*)(["'])/g,
    (_, prefix, file, query, suffix) => prefix + base + file + query + suffix);
}
async function loadFrontendShell(env) {
  const origin = String(env.FRONTEND_ORIGIN || "https://hiakdhs323-cmd.github.io/aon").replace(/\/$/, "");
  const shellResponse = await fetch(origin + "/", { headers: { "Accept": "text/html" }, cf: { cacheTtl: 300, cacheEverything: true } });
  if (!shellResponse.ok) throw new Error("프런트엔드 HTML을 불러오지 못했습니다: " + shellResponse.status);
  const shell = await shellResponse.text();
  if (!shell.includes('id="article"')) throw new Error("프런트엔드 문서 템플릿에 article 영역이 없습니다.");
  return { shell: rewriteFrontendAssets(shell, origin), origin };
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
  const rendered = found ? await renderNamuMarkupOnWorker(env, actualTitle, page.content || "") : { html: "" };
  let protection = null;
  if (found) {
    await ensurePageProtectionSchema(env);
    protection = await env.DB.prepare("SELECT level, reason, protected_by, updated_at FROM page_protections WHERE title = ?").bind(actualTitle).first();
  }
  const titleText = found ? actualTitle : actualTitle + " (문서 없음)";
  const description = found ? String(page.content || "").replace(/\s+/g, " ").slice(0, 180) : "아직 작성되지 않은 문서입니다.";
  const state = {
    title: actualTitle,
    content: found ? String(page.content || "") : "",
    protection: { level: protection?.level || "none", reason: protection?.reason || "" },
    exists: found
  };
  let html = shell
    .replace("<title>AonWiki</title>", "<title>" + escapeHtml(titleText) + " - AonWiki</title>")
    .replace(/<meta name="theme-color"[^>]*>/i, '<meta name="theme-color" content="#ffffff">' + "\n" + '<meta name="description" content="' + escapeHtml(description) + '">' + "\n" + '<meta property="og:title" content="' + escapeHtml(titleText) + ' - AonWiki">' + "\n" + '<meta property="og:description" content="' + escapeHtml(description) + '">' + "\n" + '<link rel="canonical" href="' + escapeHtml(new URL(request.url).origin + "/w/" + encodeURIComponent(actualTitle)) + '">')
    .replace("<body>", '<body data-ssr-page="true">')
    .replace('<section id="home-view" class="home-view">', '<section id="home-view" class="home-view" hidden>')
    .replace('<section id="document-view" class="document-view" hidden>', '<section id="document-view" class="document-view">')
    .replace('<h1 id="title"></h1>', '<h1 id="title">' + escapeHtml(titleText) + '</h1>')
    .replace('<span id="crumb"></span>', '<span id="crumb">' + escapeHtml(actualTitle) + '</span>')
    .replace('<div id="message" class="notice" role="status"></div>', '<div id="message" class="notice" role="status">' + (found ? "" : "이 문서는 아직 존재하지 않습니다. 로그인 후 새 문서를 작성할 수 있습니다.") + '</div>')
    .replace('<article id="article" class="wiki-content"></article>', '<article id="article" class="wiki-content">' + rendered.html + '</article>')
    .replace('id="edit" class="nav-item" type="button" hidden', 'id="edit" class="nav-item" type="button"' + (found ? "" : ' hidden'))
    .replace('id="history" class="nav-item" type="button" hidden', 'id="history" class="nav-item" type="button"' + (found ? "" : ' hidden'))
    .replace('id="upload" class="nav-item" type="button" hidden', 'id="upload" class="nav-item" type="button"' + (found ? "" : ' hidden'))
    .replace('id="backlinks-tab" type="button" hidden', 'id="backlinks-tab" type="button"' + (found ? "" : ' hidden'));
  if (!found) html = html.replace('id="heading-edit" class="title-button" type="button"', 'id="heading-edit" class="title-button" type="button" hidden');
  html = html.replace('<script defer src="' + origin + '/app.js', '<script>window.__AONWIKI_SSR__=' + safeJsonForHtml(state) + ';</script>' + "\n" + '<script defer src="' + origin + '/app.js');
  return new Response(html, {
    status: found ? 200 : 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=30, s-maxage=120", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin", "X-AonWiki-Render": "full-document" }
  });
}
\nasync function passwordHash(password, salt) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 100000, hash: "SHA-256" }, material, 256);
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, "0")).join("");
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = getCors(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const declaredLength = Number(request.headers.get("Content-Length") || 0);
    if (declaredLength > 2 * 1024 * 1024) return response({ error: "요청 본문은 2MB 이하만 허용됩니다." }, 413, cors);
    try {
      if (request.method === "GET" && url.pathname.startsWith("/w/")) {
        let title = "";
        try { title = decodeURIComponent(url.pathname.slice(3)); }
        catch { return new Response("잘못된 문서 주소입니다.", { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } }); }
        title = cleanTitle(title);
        if (!title || title.includes("/") || title.includes(String.fromCharCode(92))) return new Response("잘못된 문서 주소입니다.", { status: 400 });
        return await renderFullWikiDocument(request, env, title);
      }
      if (request.method === "GET" && url.pathname === "/") {
        const { shell } = await loadFrontendShell(env);
        return new Response(shell, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60", "X-AonWiki-Render": "shell" } });
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
        const body = await request.json();
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
        const body = await request.json();
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
        const body = await request.json();
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
      if (url.pathname === "/api/page" && request.method === "DELETE") {
        const user = await currentUser(request, env);
        if (!user?.isAdmin) return response({ error: "문서를 삭제하려면 위키 관리자 권한이 필요합니다." }, 403, cors);
        const title = cleanTitle(url.searchParams.get("title"));
        if (!title || title === "대문") return response({ error: "삭제할 수 없는 문서입니다." }, 400, cors);
        await env.DB.prepare("DELETE FROM pages WHERE title = ?").bind(title).run();
        invalidateNamuServerIndexes();
        await env.DB.prepare("DELETE FROM revisions WHERE title = ?").bind(title).run();
        return response({ ok: true, title }, 200, cors);
      }
      if (url.pathname === "/api/health" && request.method === "GET") {
        return response({ ok: true, service: "AonWiki API" }, 200, cors);
      }
      if (url.pathname === "/api/account/password" && request.method === "POST") {
        const authorization = request.headers.get("Authorization") || "";
        if (!authorization.startsWith("Bearer ")) return response({ error: "로그인이 필요합니다." }, 401, cors);
        const sessionTokenHash = await sha256(authorization.slice(7));
        const now = new Date().toISOString();
        const user = await env.DB.prepare(
          "SELECT users.id, users.username, users.salt, users.password_hash FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?"
        ).bind(sessionTokenHash, now).first();
        if (!user) return response({ error: "일반 계정으로 로그인한 뒤 비밀번호를 변경하세요." }, 401, cors);

        const body = await request.json();
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
        const body = await request.json();
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
        const body = await request.json();
        const username = String(body.username || "").trim();
        const password = String(body.password || "");
        const user = await env.DB.prepare("SELECT id,username,salt,password_hash FROM users WHERE username = ? COLLATE NOCASE").bind(username).first();
        if (!user || await passwordHash(password,user.salt) !== user.password_hash) return response({error:"아이디 또는 비밀번호가 올바르지 않습니다."},401,cors);
        const token = [...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,"0")).join("");
        const expires = new Date(Date.now()+7*24*60*60*1000).toISOString();
        await env.DB.prepare("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)").bind(await sha256(token),user.id,expires).run();
        return response({ok:true,token,username:user.username,expires_at:expires},200,cors);
      }
      if (url.pathname === "/api/page-index" && request.method === "GET") {
        const result = await env.DB.prepare("SELECT title FROM pages ORDER BY title COLLATE NOCASE LIMIT 10000").all();
        return response({ pages: result.results || [] }, 200, cors);
      }
      if (url.pathname === "/api/pages" && request.method === "GET") {
        const q = (url.searchParams.get("q") || "").trim().slice(0, 100);
        const createdAfter = String(url.searchParams.get("created_after") || "").slice(0, 40);
        let result;
        if (q) {
          const pattern = "%" + q.replace(/[\\%_]/g, "") + "%";
          result = await env.DB.prepare("SELECT title, created_at, updated_at FROM pages WHERE title LIKE ? OR content LIKE ? ORDER BY updated_at DESC LIMIT 100").bind(pattern, pattern).all();
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
        let page = await env.DB.prepare("SELECT title, content, created_at, updated_at FROM pages WHERE title = ?").bind(title).first();
        if (!page) {
          await ensurePageAliasSchema(env);
          const alias = await env.DB.prepare("SELECT title FROM page_aliases WHERE alias = ? COLLATE NOCASE").bind(title).first();
          if (alias) page = await env.DB.prepare("SELECT title, content, created_at, updated_at FROM pages WHERE title = ?").bind(alias.title).first();
        }
        if (!page) return response({ page: null, html: "", engine: "namumark-worker" }, 200, cors);
        await ensurePageProtectionSchema(env);
        const protection = await env.DB.prepare("SELECT level, reason, protected_by, updated_at FROM page_protections WHERE title = ?").bind(page.title).first();
        const rendered = await renderNamuMarkupOnWorker(env, page.title, page.content || "");
        return response({
          page: {
            ...page,
            protectionLevel: protection?.level || "none",
            protectionReason: protection?.reason || "",
            protectedBy: protection?.protected_by || "",
            protectionUpdatedAt: protection?.updated_at || ""
          },
          html: rendered.html,
          engine: "namumark-worker"
        }, 200, { ...cors, "X-AonWiki-Render": "namumark-worker" });
      }
      if (url.pathname === "/api/render" && request.method === "POST") {
        if (await authRateLimited(request, env, "namumark-preview", 240, 60 * 1000)) {
          return response({ error: "미리보기 요청이 너무 많습니다. 잠시 후 다시 시도하세요." }, 429, cors);
        }
        const body = await request.json();
        const title = cleanTitle(body.title || "미리보기") || "미리보기";
        const content = String(body.content || "");
        if (content.length > 200000) return response({ error: "미리보기 문서는 200,000자 이하만 지원합니다." }, 413, cors);
        const rendered = await renderNamuMarkupOnWorker(env, title, content);
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
        const protection = page ? await env.DB.prepare("SELECT level, reason, protected_by, updated_at FROM page_protections WHERE title = ?").bind(page.title).first() : null;
        return response({ page: page ? { ...page, protectionLevel: protection?.level || "none", protectionReason: protection?.reason || "", protectedBy: protection?.protected_by || "", protectionUpdatedAt: protection?.updated_at || "" } : null }, 200, cors);
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
        if (!Number.isSafeInteger(id) || id < 1) return response({ error: "올바른 버전 ID가 아닙니다." }, 400, cors);
        const revision = await env.DB.prepare("SELECT id, title, content, editor, created_at, summary FROM revisions WHERE id = ?").bind(id).first();
        if (!revision) return response({ error: "문서 버전을 찾을 수 없습니다." }, 404, cors);
        return response({ revision }, 200, cors);
      }
      if (url.pathname === "/api/page" && request.method === "PUT") {
        const user = await currentUser(request, env);
        if (!user) return response({ error: "문서를 편집하려면 로그인하세요." }, 401, cors);
        const body = await request.json();
        const title = cleanTitle(body.title);
        const originalTitle = body.createOnly ? "" : cleanTitle(body.originalTitle || "");
        const content = String(body.content || "");
        if (!title) return response({ error: "문서 제목을 입력하세요." }, 400, cors);
        await ensurePageProtectionSchema(env);
        const protectionTitle = cleanTitle(body.originalTitle || title);
        const protection = await env.DB.prepare("SELECT level FROM page_protections WHERE title = ?").bind(protectionTitle).first();
        if (protection?.level === "admin" && !user.isAdmin) return response({ error: "이 문서는 관리자만 편집할 수 있도록 보호되어 있습니다." }, 403, cors);
        if (protection?.level === "registered" && !user.isAdmin && user.role !== "user") return response({ error: "이 문서는 로그인한 회원만 편집할 수 있도록 보호되어 있습니다." }, 403, cors);
        if (title === "대문") return response({ error: "대문은 문서 목록 시작 화면이므로 편집할 수 없습니다." }, 403, cors);
        if (content.length > 200000) return response({ error: "문서는 200,000자 이하로 작성해 주세요." }, 413, cors);
        const now = new Date().toISOString();
        const summary = String(body.summary || "").trim().slice(0, 200);
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
        } else {
          previous = await env.DB.prepare("SELECT created_at FROM pages WHERE title = ?").bind(title).first();
          if (!previous) return response({ error: "수정할 문서를 찾을 수 없습니다." }, 404, cors);
          await env.DB.prepare("UPDATE pages SET content = ?, updated_at = ? WHERE title = ?")
            .bind(content, now, title).run();
        }

        invalidateNamuServerIndexes();
        await env.DB.prepare("INSERT INTO revisions (title, content, editor, created_at, summary) VALUES (?, ?, ?, ?, ?)")
          .bind(title, content, user.username, now, summary).run();
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
        const body = await request.json();
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
        headers.set("Cache-Control", "public, max-age=3600");
        headers.set("X-Content-Type-Options", "nosniff");
        if (image.content_type === "image/svg+xml") headers.set("Content-Security-Policy", "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox");
        return new Response(bytes, { headers });
      }
      return response({ error: "요청한 경로를 찾을 수 없습니다." }, 404, cors);
    } catch (error) {
      console.error("AonWiki API error", error);
      return response({ error: "서버 내부 오류" }, 500, cors);
    }
  }
};
