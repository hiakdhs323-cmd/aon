import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { fetchApi } from "$lib/server/api";
import { renderWikiMarkup } from "$lib/server/namumark";

type WikiPage = { title: string; content: string; updated_at?: string };
type ImageFile = { id: string; filename: string };

const legacyPattern = /\[\[(?:파일|file):|\[include\(|\{\{\{#!(?:folding|wiki|syntax)\b/i;

function safeStyle(raw: string): string {
  const allowed = new Set(["color", "background-color", "font-size", "font-weight", "font-style", "text-align", "text-decoration", "width", "max-width", "margin", "padding", "border", "border-radius"]);
  return raw.split(";").flatMap(part => {
    const index = part.indexOf(":");
    if (index < 1) return [];
    const key = part.slice(0, index).trim().toLowerCase();
    const value = part.slice(index + 1).trim();
    if (!allowed.has(key) || !value || /url\s*\(|expression|javascript|[<>{}]/i.test(value)) return [];
    return [key + ":" + value];
  }).join(";");
}

async function expandIncludes(
  event: Parameters<RequestHandler>[0],
  source: string,
  visited: Set<string>,
  depth: number,
  auth: string,
  cache: Map<string, string>,
  unresolved: string[]
): Promise<string> {
  if (depth > 5) return source;
  const pattern = /\[include\(([^)\n]+)\)\]/gi;
  let result = "";
  let cursor = 0;
  for (const match of source.matchAll(pattern)) {
    const start = match.index ?? 0;
    result += source.slice(cursor, start);
    const expression = String(match[1] || "").trim();
    const target = expression.split(",")[0].trim();
    if (!target || expression.includes(",") || visited.has(target)) {
      unresolved.push("include: " + expression);
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

function transformLegacyMarkup(source: string, files: Map<string, ImageFile>, unresolved: string[]): string {
  let output = source;
  output = output.replace(/\{\{\{#!folding\s*([^\n]*)\n([\s\S]*?)\n\}\}\}/gi, (_all, heading: string, body: string) =>
    "<details><summary>" + String(heading || "펼치기").trim() + "</summary>\n" + String(body || "") + "\n</details>");
  output = output.replace(/\{\{\{#!wiki\s+style="([^"]*)"\s*\n([\s\S]*?)\n\}\}\}/gi, (_all, style: string, body: string) => {
    const css = safeStyle(String(style || ""));
    if (!css) {
      unresolved.push("wiki style 블록: 안전하게 변환할 수 없는 스타일");
      return _all;
    }
    return '<div style="' + css + '">\n' + String(body || "") + "\n</div>";
  });
  output = output.replace(/\{\{\{#!syntax\s+([a-z0-9_+-]+)\s*\n([\s\S]*?)\n\}\}\}/gi, (_all, language: string, body: string) =>
    "```" + String(language || "").toLowerCase() + "\n" + String(body || "") + "\n```");
  output = output.replace(/\[\[(?:파일|file):([^\]|]+)(?:\|([^\]]*))?\]\]/gi, (all, filename: string, options = "") => {
    const name = String(filename || "").trim();
    const file = files.get(name.toLocaleLowerCase());
    if (!file) {
      unresolved.push("이미지 파일을 찾지 못함: " + name);
      return all;
    }
    const width = String(options).match(/(?:^|[&;,])\s*width\s*=\s*(\d{1,4})/i)?.[1];
    const align = String(options).match(/(?:^|[&;,])\s*align\s*=\s*(left|center|right)/i)?.[1];
    const attrs = ['src="/media/' + file.id + '"', 'alt="' + name.replace(/["&<>]/g, "") + '"'];
    if (width) attrs.push('width="' + Math.min(2000, Number(width)) + '"');
    if (align) attrs.push('class="wiki-image-align-' + align + '"');
    return "<img " + attrs.join(" ") + ">";
  });
  return output;
}

export const POST: RequestHandler = async (event) => {
  const authorization = event.request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  const meResponse = await fetchApi(event, "/api/me", { headers: { Authorization: authorization } });
  if (!meResponse.ok) return json({ error: "관리자 권한을 확인하지 못했습니다." }, { status: 401 });
  const me = await meResponse.json() as { isAdmin?: boolean };
  if (!me.isAdmin) return json({ error: "위키 관리자 권한이 필요합니다." }, { status: 403 });

  const body = await event.request.json().catch(() => ({})) as { apply?: boolean; limit?: number };
  const apply = body.apply === true;
  const limit = Math.max(1, Math.min(500, Number(body.limit) || 200));
  const indexResponse = await fetchApi(event, "/api/page-index", { headers: { Authorization: authorization } });
  if (!indexResponse.ok) return json({ error: "문서 목록을 불러오지 못했습니다." }, { status: indexResponse.status });
  const index = await indexResponse.json() as { pages?: Array<{ title: string }> };
  const titles = (index.pages || []).map(item => String(item.title || "")).filter(title => title && title !== "대문").slice(0, limit);

  const filesResponse = await fetchApi(event, "/api/files?manage=1", { headers: { Authorization: authorization } });
  const filesData = filesResponse.ok ? await filesResponse.json() as { files?: ImageFile[] } : { files: [] };
  const files = new Map((filesData.files || []).map(file => [String(file.filename).toLocaleLowerCase(), file]));
  const includeCache = new Map<string, string>();
  const report: Array<{ title: string; status: string; changes?: string[]; unresolved?: string[]; error?: string }> = [];

  for (const title of titles) {
    try {
      const pageResponse = await fetchApi(event, "/api/page?title=" + encodeURIComponent(title), { headers: { Authorization: authorization } });
      if (!pageResponse.ok) throw new Error("문서 조회 HTTP " + pageResponse.status);
      const data = await pageResponse.json() as { page?: WikiPage | null };
      if (!data.page) { report.push({ title, status: "missing" }); continue; }
      const original = String(data.page.content || "");
      if (!legacyPattern.test(original)) { report.push({ title, status: "already-compatible" }); continue; }

      const unresolved: string[] = [];
      const expanded = await expandIncludes(event, original, new Set([title]), 0, authorization, includeCache, unresolved);
      const migrated = transformLegacyMarkup(expanded, files, unresolved);
      if (migrated === original) {
        report.push({ title, status: "manual-review-required", unresolved });
        continue;
      }
      const rendered = await renderWikiMarkup(event, migrated);
      const stillLegacy = /\[include\(|\{\{\{#!(?:folding|wiki|syntax)|\[\[파일:/i.test(rendered.html);
      if (!rendered.html.trim() || stillLegacy || unresolved.length) {
        report.push({ title, status: "manual-review-required", unresolved: [...unresolved, ...(stillLegacy ? ["새 엔진 출력에 기존 문법이 남아 있음"] : []), ...(!rendered.html.trim() ? ["새 엔진 렌더링 결과가 비어 있음"] : [])] });
        continue;
      }
      const changes = [
        ...(original.includes("[include(") ? ["include를 본문에 확장"] : []),
        ...(original.includes("[[파일:") ? ["파일 삽입을 새 이미지 URL로 변환"] : []),
        ...(original.includes("{{{#!folding") ? ["접기 블록을 details/summary로 변환"] : []),
        ...(original.includes("{{{#!wiki") ? ["스타일 블록을 안전한 HTML로 변환"] : []),
        ...(original.includes("{{{#!syntax") ? ["코드 블록을 fenced code로 변환"] : [])
      ];
      if (!apply) {
        report.push({ title, status: "ready", changes, unresolved });
        continue;
      }
      const saveResponse = await fetchApi(event, "/api/admin/migrate-page", {
        method: "POST",
        headers: { Authorization: authorization, "Content-Type": "application/json" },
        body: JSON.stringify({ title, expectedUpdatedAt: String(data.page.updated_at || ""), content: migrated })
      });
      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => ({})) as { error?: string };
        throw new Error(errorData.error || "문서 저장 HTTP " + saveResponse.status);
      }
      report.push({ title, status: "migrated", changes, unresolved });
    } catch (error) {
      report.push({ title, status: "error", error: error instanceof Error ? error.message : String(error) });
    }
  }

  const counts = Object.fromEntries(["migrated", "ready", "already-compatible", "manual-review-required", "missing", "error"].map(status => [status, report.filter(item => item.status === status).length]));
  return json({ ok: true, apply, scanned: report.length, counts, report });
};
