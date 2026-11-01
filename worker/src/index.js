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
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
function cleanTitle(value) {
  return String(value || "").trim().replace(/[\\/#?<>\[\]{}|]/g, "").slice(0, 120);
}
function isAdmin(request, env) {
  const value = request.headers.get("Authorization") || "";
  return Boolean(env.ADMIN_TOKEN && value === "Bearer " + env.ADMIN_TOKEN);
}
function safeFileName(value) {
  return String(value || "image").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "image";
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = getCors(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try {
      if (url.pathname === "/api/health" && request.method === "GET") {
        return response({ ok: true, service: "AonWiki API" }, 200, cors);
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
      if (url.pathname === "/api/page" && request.method === "GET") {
        const title = cleanTitle(url.searchParams.get("title"));
        if (!title) return response({ error: "문서 제목을 입력하세요." }, 400, cors);
        const page = await env.DB.prepare("SELECT title, content, created_at, updated_at FROM pages WHERE title = ?").bind(title).first();
        return response({ page: page || null }, 200, cors);
      }
      if (url.pathname === "/api/history" && request.method === "GET") {
        const title = cleanTitle(url.searchParams.get("title"));
        if (!title) return response({ error: "문서 제목을 입력하세요." }, 400, cors);
        const result = await env.DB.prepare("SELECT id, title, editor, created_at FROM revisions WHERE title = ? ORDER BY id DESC LIMIT 50").bind(title).all();
        return response({ revisions: result.results || [] }, 200, cors);
      }
      if (url.pathname === "/api/page" && request.method === "PUT") {
        if (!isAdmin(request, env)) return response({ error: "관리자 토큰이 없거나 올바르지 않습니다. 설정을 확인하세요." }, 401, cors);
        const body = await request.json();
        const title = cleanTitle(body.title);
        const content = String(body.content || "");
        if (!title) return response({ error: "문서 제목을 입력하세요." }, 400, cors);
        if (content.length > 200000) return response({ error: "문서는 200,000자 이하로 작성해 주세요." }, 413, cors);
        const previous = await env.DB.prepare("SELECT created_at FROM pages WHERE title = ?").bind(title).first();
        const now = new Date().toISOString();
        await env.DB.prepare("INSERT INTO pages (title, content, created_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(title) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at").bind(title, content, previous ? previous.created_at : now, now).run();
        await env.DB.prepare("INSERT INTO revisions (title, content, editor, created_at) VALUES (?, ?, ?, ?)").bind(title, content, "관리자", now).run();
        return response({ ok: true, title, updated_at: now }, 200, cors);
      }
      if (url.pathname === "/api/upload" && request.method === "POST") {
        if (!isAdmin(request, env)) return response({ error: "이미지 업로드에는 관리자 토큰이 필요합니다." }, 401, cors);
        const form = await request.formData();
        const file = form.get("file");
        if (!file || typeof file.stream !== "function") return response({ error: "이미지 파일을 선택하세요." }, 400, cors);
        const allowedTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
        if (!allowedTypes.includes(file.type)) return response({ error: "PNG, JPG, GIF, WebP 파일만 지원합니다." }, 415, cors);
        if (file.size < 1 || file.size > 5 * 1024 * 1024) return response({ error: "이미지는 5MB 이하로 업로드해 주세요." }, 413, cors);
        const key = "uploads/" + new Date().toISOString().slice(0, 10) + "/" + crypto.randomUUID() + "-" + safeFileName(file.name);
        await env.IMAGES.put(key, file.stream(), {
          httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" }
        });
        return response({ ok: true, key, url: new URL("/media/" + key, url.origin).href }, 201, cors);
      }
      if (url.pathname.startsWith("/media/") && request.method === "GET") {
        const key = decodeURIComponent(url.pathname.slice("/media/".length));
        if (!key.startsWith("uploads/") || key.includes("..")) return new Response("Not found", { status: 404 });
        const object = await env.IMAGES.get(key);
        if (!object) return new Response("Not found", { status: 404 });
        const headers = new Headers(cors);
        object.writeHttpMetadata(headers);
        headers.set("ETag", object.httpEtag);
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
        headers.set("X-Content-Type-Options", "nosniff");
        return new Response(object.body, { headers });
      }
      return response({ error: "요청한 경로를 찾을 수 없습니다." }, 404, cors);
    } catch (error) {
      console.error("AonWiki API error", error);
      return response({ error: "서버 내부 오류입니다. Cloudflare Worker 로그를 확인하세요." }, 500, cors);
    }
  }
};
