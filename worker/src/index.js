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
        if (!file || typeof file.arrayBuffer !== "function") return response({ error: "이미지 파일을 선택하세요." }, 400, cors);
        const allowedTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
        if (!allowedTypes.includes(file.type)) return response({ error: "PNG, JPG, GIF, WebP 파일만 지원합니다." }, 415, cors);
        if (file.size < 1 || file.size > 1 * 1024 * 1024) return response({ error: "D1 저장 방식은 이미지 1MB 이하만 지원합니다." }, 413, cors);
        const bytes = new Uint8Array(await file.arrayBuffer());
        let binary = "";
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        const encoded = btoa(binary);
        const key = crypto.randomUUID();
        const now = new Date().toISOString();
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY NOT NULL, content_type TEXT NOT NULL, data_base64 TEXT NOT NULL, filename TEXT NOT NULL, created_at TEXT NOT NULL)").run();
        await env.DB.prepare("INSERT INTO images (id, content_type, data_base64, filename, created_at) VALUES (?, ?, ?, ?, ?)").bind(key, file.type, encoded, String(file.name || "image").slice(0, 120), now).run();
        return response({ ok: true, key, url: new URL("/media/" + key, url.origin).href }, 201, cors);
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
      return response({ error: "서버 내부 오류입니다. Cloudflare Worker 로그를 확인하세요." }, 500, cors);
    }
  }
};
