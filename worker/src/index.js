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
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
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
  const user = await env.DB.prepare("SELECT users.username FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?").bind(tokenHash, now).first();
  if (user) {
    const isAonAccount = String(user.username || "").normalize("NFC").trim() === "아온";
    return { ...user, role: "user", isAdmin: isAonAccount };
  }
  if (await isAdminRequest(request, env)) return { username: "위키 관리자", role: "admin", isAdmin: true };
  return null;
}
async function ensureImageSchema(env) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY NOT NULL, content_type TEXT NOT NULL, data_base64 TEXT NOT NULL, filename TEXT NOT NULL, created_at TEXT NOT NULL, owner TEXT NOT NULL DEFAULT '')").run();
  const columns = await env.DB.prepare("PRAGMA table_info(images)").all();
  if (!(columns.results || []).some(column => column.name === "owner")) {
    await env.DB.prepare("ALTER TABLE images ADD COLUMN owner TEXT NOT NULL DEFAULT ''").run();
  }
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS image_aliases (alias TEXT PRIMARY KEY COLLATE NOCASE, image_id TEXT NOT NULL, created_at TEXT NOT NULL)").run();
}
function cleanImageName(value, contentType) {
  const extension = ({ "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp" })[contentType] || "img";
  let name = String(value || "").normalize("NFC").replace(/[\\/:*?"<>|]/g, "_").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  name = name.replace(/\.[^.]*$/, "").replace(/[. ]+$/g, "").slice(0, 100);
  if (!name) name = "image";
  return name + "." + extension;
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

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
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
    try {
      if (url.pathname === "/api/me" && request.method === "GET") {
        const user = await currentUser(request, env);
        return response({ authenticated: Boolean(user), username: user?.username || null, role: user?.role || "anonymous", isAdmin: Boolean(user?.isAdmin) }, 200, cors);
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
      if (url.pathname === "/api/page" && request.method === "DELETE") {
        const user = await currentUser(request, env);
        if (!user?.isAdmin) return response({ error: "문서를 삭제하려면 위키 관리자 권한이 필요합니다." }, 403, cors);
        const title = cleanTitle(url.searchParams.get("title"));
        if (!title || title === "대문") return response({ error: "삭제할 수 없는 문서입니다." }, 400, cors);
        await env.DB.prepare("DELETE FROM pages WHERE title = ?").bind(title).run();
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
      if (url.pathname === "/api/pages" && request.method === "GET") {
        const q = (url.searchParams.get("q") || "").trim().slice(0, 100);
        let result;
        if (q) {
          const pattern = "%" + q.replace(/[\\%_]/g, "") + "%";
          result = await env.DB.prepare("SELECT title, updated_at FROM pages WHERE title LIKE ? OR content LIKE ? ORDER BY updated_at DESC LIMIT 100").bind(pattern, pattern).all();
        } else {
          result = await env.DB.prepare("SELECT title, updated_at FROM pages ORDER BY updated_at DESC LIMIT 100").all();
        }
        return response({ pages: result.results || [] }, 200, cors);
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
      if (url.pathname === "/api/page" && request.method === "GET") {
        const title = cleanTitle(url.searchParams.get("title"));
        if (!title) return response({ error: "문서 제목을 입력하세요." }, 400, cors);
        const page = await env.DB.prepare("SELECT title, content, created_at, updated_at FROM pages WHERE title = ?").bind(title).first();
        return response({ page: page || null }, 200, cors);
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
      if (url.pathname === "/api/page" && request.method === "PUT") {
        const user = await currentUser(request, env);
        if (!user) return response({ error: "문서를 편집하려면 로그인하세요." }, 401, cors);
        const body = await request.json();
        const title = cleanTitle(body.title);
        const content = String(body.content || "");
        if (!title) return response({ error: "문서 제목을 입력하세요." }, 400, cors);
        if (title === "대문") return response({ error: "대문은 문서 목록 시작 화면이므로 편집할 수 없습니다." }, 403, cors);
        if (content.length > 200000) return response({ error: "문서는 200,000자 이하로 작성해 주세요." }, 413, cors);
        const previous = await env.DB.prepare("SELECT created_at FROM pages WHERE title = ?").bind(title).first();
        if (body.createOnly && previous) return response({ error: "같은 제목의 문서가 이미 있습니다." }, 409, cors);
        const summary = String(body.summary || "").trim().slice(0, 200);
        const now = new Date().toISOString();
        await env.DB.prepare("INSERT INTO pages (title, content, created_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(title) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at").bind(title, content, previous ? previous.created_at : now, now).run();
        const columns = await env.DB.prepare("PRAGMA table_info(revisions)").all();
        if (!(columns.results || []).some(column => column.name === "summary")) {
          await env.DB.prepare("ALTER TABLE revisions ADD COLUMN summary TEXT NOT NULL DEFAULT ''").run();
        }
        await env.DB.prepare("INSERT INTO revisions (title, content, editor, created_at, summary) VALUES (?, ?, ?, ?, ?)").bind(title, content, user.username, now, summary).run();
        return response({ ok: true, title, updated_at: now }, 200, cors);
      }
      if (url.pathname === "/api/upload" && request.method === "POST") {
        const user = await currentUser(request, env);
        if (!user) return response({ error: "이미지를 업로드하려면 로그인하세요." }, 401, cors);
        const form = await request.formData();
        const file = form.get("file");
        if (!file || typeof file.arrayBuffer !== "function") return response({ error: "이미지 파일을 선택하세요." }, 400, cors);
        const allowedTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
        if (!allowedTypes.includes(file.type)) return response({ error: "PNG, JPG, GIF, WebP 파일만 지원합니다." }, 415, cors);
        if (file.size < 1 || file.size > 1 * 1024 * 1024) return response({ error: "D1 저장 방식은 이미지 1MB 이하만 지원합니다." }, 413, cors);
        await ensureImageSchema(env);
        const bytes = new Uint8Array(await file.arrayBuffer());
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
        headers.set("Cache-Control", "public, max-age=3600");
        headers.set("X-Content-Type-Options", "nosniff");
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
        return new Response(bytes, { headers });
      }
      return response({ error: "요청한 경로를 찾을 수 없습니다." }, 404, cors);
    } catch (error) {
      console.error("AonWiki API error", error);
      return response({ error: "서버 내부 오류", detail: String(error?.message || error).slice(0, 300) }, 500, cors);
    }
  }
};
