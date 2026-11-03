import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { fetchApi } from "$lib/server/api";
import { renderWikiMarkup } from "$lib/server/namumark";

type WikiPage = { title: string; content: string; updated_at?: string };
type D1Result = { meta?: { changes?: number } };
type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results?: T[] }>;
  run(): Promise<D1Result>;
};
type D1Database = { prepare(sql: string): D1Statement; batch(statements: D1Statement[]): Promise<D1Result[]> };

async function expandIncludes(
  event: Parameters<RequestHandler>[0],
  source: string,
  visited: Set<string>,
  depth: number,
  auth: string,
  cache: Map<string, string>,
  unresolved: string[]
): Promise<string> {
  if (depth > 5) {
    if (/\[include\(/i.test(source)) unresolved.push("include 중첩 깊이가 5단계를 초과함");
    return source;
  }
  const pattern = /\[include\(([^)\n]+)\)\]/gi;
  let result = "";
  let cursor = 0;
  for (const match of source.matchAll(pattern)) {
    const start = match.index ?? 0;
    result += source.slice(cursor, start);
    const expression = String(match[1] || "").trim();
    const target = expression.trim();
    if (!target || target.includes(",") || visited.has(target)) {
      unresolved.push("include 인수 또는 순환 참조: " + expression);
      result += match[0];
    } else {
      let included = cache.get(target);
      if (included === undefined) {
        const response = await fetchApi(event, "/api/page?title=" + encodeURIComponent(target), { headers: { Authorization: auth } });
        if (!response.ok) {
          unresolved.push("include 문서를 찾지 못함: " + target);
          included = "";
        } else {
          const data = await response.json() as { page?: WikiPage | null };
          included = data.page ? String(data.page.content || "") : "";
          if (!data.page) unresolved.push("include 문서를 찾지 못함: " + target);
        }
        cache.set(target, included);
      }
      if (included) {
        const next = new Set(visited);
        next.add(target);
        result += await expandIncludes(event, included, next, depth + 1, auth, cache, unresolved);
      }
    }
    cursor = start + match[0].length;
  }
  return result + source.slice(cursor);
}

export const POST: RequestHandler = async (event) => {
  const authorization = event.request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  const meResponse = await fetchApi(event, "/api/me", { headers: { Authorization: authorization } });
  if (!meResponse.ok) return json({ error: "관리자 권한을 확인하지 못했습니다." }, { status: 401 });
  const me = await meResponse.json() as { isAdmin?: boolean; username?: string };
  if (!me.isAdmin) return json({ error: "위키 관리자 권한이 필요합니다." }, { status: 403 });

  const body = await event.request.json().catch(() => ({})) as { apply?: boolean; limit?: number };
  const apply = body.apply === true;
  const limit = Math.max(1, Math.min(500, Number(body.limit) || 200));
  const indexResponse = await fetchApi(event, "/api/page-index", { headers: { Authorization: authorization } });
  if (!indexResponse.ok) return json({ error: "문서 목록을 불러오지 못했습니다." }, { status: indexResponse.status });
  const index = await indexResponse.json() as { pages?: Array<{ title: string }> };
  const titles = (index.pages || []).map(item => String(item.title || "")).filter(title => title && title !== "대문").slice(0, limit);
  const includeCache = new Map<string, string>();
  const report: Array<{ title: string; status: string; changes?: string[]; unresolved?: string[]; error?: string }> = [];

  for (const title of titles) {
    try {
      const pageResponse = await fetchApi(event, "/api/page?title=" + encodeURIComponent(title), { headers: { Authorization: authorization } });
      if (!pageResponse.ok) throw new Error("문서 조회 HTTP " + pageResponse.status);
      const data = await pageResponse.json() as { page?: WikiPage | null };
      if (!data.page) { report.push({ title, status: "missing" }); continue; }

      const original = String(data.page.content || "");
      const unresolved: string[] = [];
      const migrated = await expandIncludes(event, original, new Set([title]), 0, authorization, includeCache, unresolved);
      const hasInclude = /\[include\(/i.test(original);
      const rendered = await renderWikiMarkup(event, migrated);
      const unresolvedEngineMarkup = /\[include\(|class=["']include["']/i.test(rendered.html);
      if (!rendered.html.trim() || unresolved.length || unresolvedEngineMarkup) {
        report.push({
          title,
          status: "manual-review-required",
          unresolved: [...unresolved, ...(unresolvedEngineMarkup ? ["새 엔진에 남은 include 구문"] : []), ...(!rendered.html.trim() ? ["새 엔진 렌더링 결과가 비어 있음"] : [])]
        });
        continue;
      }

      if (migrated === original) {
        report.push({ title, status: "already-compatible" });
        continue;
      }

      const changes = ["include 문서 내용을 새 엔진이 직접 처리할 수 있도록 본문에 확장"];
      if (!apply) {
        report.push({ title, status: "ready", changes });
        continue;
      }

      const db = (event.platform?.env as { DB?: D1Database } | undefined)?.DB;
      if (!db) throw new Error("D1 데이터베이스 바인딩을 사용할 수 없습니다.");
      const expectedUpdatedAt = String(data.page.updated_at || "");
      const current = await db.prepare("SELECT content, updated_at FROM pages WHERE title = ?").bind(title).first<{ content: string; updated_at: string }>();
      if (!current || String(current.updated_at || "") !== expectedUpdatedAt || String(current.content || "") !== original) {
        throw new Error("검사 이후 문서가 변경되었습니다. 다시 검사하세요.");
      }

      await db.prepare("CREATE TABLE IF NOT EXISTS wiki_migration_backups (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, original_content TEXT NOT NULL, migrated_content TEXT NOT NULL, created_at TEXT NOT NULL, created_by TEXT NOT NULL, engine_version TEXT NOT NULL)").run();
      await db.prepare("CREATE TABLE IF NOT EXISTS revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT NOT NULL, editor TEXT NOT NULL, created_at TEXT NOT NULL)").run();
      const revisionColumns = await db.prepare("PRAGMA table_info(revisions)").all();
      if (!((revisionColumns.results || []) as Array<{ name: string }>).some(column => column.name === "summary")) {
        await db.prepare("ALTER TABLE revisions ADD COLUMN summary TEXT NOT NULL DEFAULT ''").run();
      }

      const now = new Date().toISOString();
      const backupId = crypto.randomUUID();
      const batch = await db.batch([
        db.prepare("INSERT INTO wiki_migration_backups (id, title, original_content, migrated_content, created_at, created_by, engine_version) SELECT ?, title, content, ?, ?, ?, 'uiovasot-namumark-wasm' FROM pages WHERE title = ? AND updated_at = ?")
          .bind(backupId, migrated, now, String(me.username || "wiki-admin"), title, expectedUpdatedAt),
        db.prepare("UPDATE pages SET content = ?, updated_at = ? WHERE title = ? AND updated_at = ?")
          .bind(migrated, now, title, expectedUpdatedAt),
        db.prepare("INSERT INTO revisions (title, content, editor, created_at, summary) SELECT title, content, ?, ?, ? FROM pages WHERE title = ? AND updated_at = ?")
          .bind(String(me.username || "wiki-admin"), now, "NamuMark WASM 자동 문법 마이그레이션", title, now)
      ]);
      if (Number(batch?.[1]?.meta?.changes || 0) !== 1) throw new Error("동시 수정이 감지되어 반영하지 않았습니다.");
      report.push({ title, status: "migrated", changes });
    } catch (error) {
      report.push({ title, status: "error", error: error instanceof Error ? error.message : String(error) });
    }
  }

  const statuses = ["migrated", "ready", "already-compatible", "manual-review-required", "missing", "error"];
  const counts = Object.fromEntries(statuses.map(status => [status, report.filter(item => item.status === status).length]));
  return json({ ok: true, apply, scanned: report.length, counts, report });
};
