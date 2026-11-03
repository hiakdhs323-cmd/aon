import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { fetchApi } from "$lib/server/api";
import { renderWikiMarkup } from "$lib/server/namumark";
export const GET: RequestHandler = async (event) => {
  const title = String(event.url.searchParams.get("title") || "").trim().slice(0, 120);
  if (!title) return json({ error: "문서 제목을 입력하세요." }, { status: 400 });
  const pageResponse = await fetchApi(event, "/api/page?title=" + encodeURIComponent(title));
  if (!pageResponse.ok) return json({ error: "문서를 조회하지 못했습니다." }, { status: pageResponse.status });
  const data = await pageResponse.json() as { page?: Record<string, unknown> | null };
  if (!data.page) return json({ page: null, html: "", engine: "uiovasot-namumark-wasm" });
  const page = data.page as { title: string; content: string };
  const rendered = await renderWikiMarkup(event, page.content || "");
  return json({ page, html: rendered.html, engine: rendered.engine });
};
export const POST: RequestHandler = async (event) => {
  const body = await event.request.json().catch(() => ({})) as { title?: string; content?: string };
  const title = String(body.title || "미리보기").trim().slice(0, 120) || "미리보기";
  const content = String(body.content || "");
  if (content.length > 200000) return json({ error: "미리보기 문서는 200,000자 이하만 지원합니다." }, { status: 413 });
  const rendered = await renderWikiMarkup(event, content);
  return json({ html: rendered.html, engine: rendered.engine, title });
};
