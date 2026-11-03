import type { PageServerLoad } from "./$types";
import legacyShell from "$lib/legacy-shell.html?raw";
import { fetchApi } from "$lib/server/api";
import { renderWikiMarkup } from "$lib/server/namumark";
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => {
  switch (c) {
    case "&": return "&amp;";
    case "<": return "&lt;";
    case ">": return "&gt;";
    case '"': return "&quot;";
    default: return "&#39;";
  }
});
export const load: PageServerLoad = async (event) => {
  const [pagesResponse, homeResponse] = await Promise.all([
    fetchApi(event, "/api/pages"),
    fetchApi(event, "/api/home").catch(() => null)
  ]);
  if (!pagesResponse.ok) throw new Error("문서 목록을 불러오지 못했습니다.");
  const pagesData = await pagesResponse.json() as { pages?: Array<{ title: string; updated_at?: string }> };
  const homeData = homeResponse?.ok ? await homeResponse.json() as { settings?: Record<string, string> } : { settings: {} };
  const settings = homeData.settings || {};
  let shell = legacyShell;
  const homeContent = String(settings.content || "");
  let rendered = "";
  if (homeContent) {
    const result = await renderWikiMarkup(event, "대문", homeContent, {
      path: "/api/render",
      init: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "대문", content: homeContent }) }
    });
    rendered = result.html;
  }
  const pageRows = (pagesData.pages || []).filter(item => item.title !== "대문" && !/^(?:분류|category):/i.test(item.title || ""));
  const rows = pageRows.map(item => {
    const href = "/w/" + encodeURIComponent(item.title);
    const date = item.updated_at ? new Date(item.updated_at).toLocaleDateString("ko-KR") : "";
    return '<div class="page-row"><a href="' + href + '">' + escapeHtml(item.title) + '</a><time>' + escapeHtml(date) + '</time></div>';
  }).join("");
  shell = shell.replace('<h1 id="home-title">AonWiki</h1>', '<h1 id="home-title">' + escapeHtml(settings.title || "AonWiki") + '</h1>');
  shell = shell.replace('<p id="home-tagline">함께 만드는 지식 백과사전</p>', '<p id="home-tagline">' + escapeHtml(settings.tagline || "함께 만드는 지식 백과사전") + '</p>');
  shell = shell.replace('<div id="home-search-hint" class="home-search-hint">검색창에서 문서를 찾거나 아래 목록에서 원하는 문서를 선택하세요.</div>', '<div id="home-search-hint" class="home-search-hint">' + escapeHtml(settings.searchHint || "검색창에서 문서를 찾거나 아래 목록에서 원하는 문서를 선택하세요.") + '</div>');
  shell = shell.replace('<h2 id="home-list-title">최근 수정된 문서</h2>', '<h2 id="home-list-title">' + escapeHtml(settings.listTitle || "최근 수정된 문서") + '</h2>');
  shell = shell.replace('<h2 id="home-bottom-title">문서가 없나요?</h2>', '<h2 id="home-bottom-title">' + escapeHtml(settings.bottomTitle || "문서가 없나요?") + '</h2>');
  shell = shell.replace('<p id="home-bottom-text" class="home-help">로그인한 뒤 새 문서를 만들어 지식을 공유할 수 있습니다.</p>', '<p id="home-bottom-text" class="home-help">' + escapeHtml(settings.bottomText || "로그인한 뒤 새 문서를 만들어 지식을 공유할 수 있습니다.") + '</p>');
  shell = shell.replace('<div id="home-notice" class="home-notice" hidden></div>', settings.notice
    ? '<div id="home-notice" class="home-notice">' + escapeHtml(settings.notice) + '</div>'
    : '<div id="home-notice" class="home-notice" hidden></div>');
  shell = shell.replace('<article id="home-content" class="wiki-content home-content"></article>', '<article id="home-content" class="wiki-content home-content">' + rendered + '</article>');
  shell = shell.replace('<div id="page-list" class="page-list"><p class="loading">문서 목록을 불러오는 중입니다…</p></div>', '<div id="page-list" class="page-list">' + (rows || '<p class="empty-list">아직 등록된 문서가 없습니다. 로그인 후 첫 문서를 만들어 보세요.</p>') + '</div>');
  shell = shell.replace('<span id="page-count"></span>', '<span id="page-count">' + pageRows.length + '개 문서</span>');
  return { shellHtml: shell, documentTitle: String(settings.title || "AonWiki"), ssrState: { route: "home", title: "대문", content: homeContent, exists: false, protection: { level: "none", reason: "" } } };
};
