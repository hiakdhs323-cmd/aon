import type { PageServerLoad } from "./$types";
import { error, redirect } from "@sveltejs/kit";
import legacyShell from "$lib/legacy-shell.html?raw";
import { fetchApi } from "$lib/server/api";
import { renderWikiMarkup } from "$lib/server/namumark";
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);
export const load: PageServerLoad = async (event) => {
  const title = String(event.params.title || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 120);
  if (!title) throw error(400, "잘못된 문서 제목입니다.");
  if (/^(?:분류|category):/i.test(title)) return { shellHtml: legacyShell, documentTitle: title + " - AonWiki", ssrState: null };
  const pageResponse = await fetchApi(event, "/api/page?title=" + encodeURIComponent(title));
  if (!pageResponse.ok) throw error(pageResponse.status, "문서를 불러오지 못했습니다.");
  const pageData = await pageResponse.json() as { page?: { title: string; content: string; protectionLevel?: string; protectionReason?: string } | null };
  const record = pageData.page || null;
  if (record?.title && record.title !== title) throw redirect(308, "/w/" + encodeURIComponent(record.title));
  const exists = Boolean(record);
  const content = String(record?.content || "");
  const redirectMatch = content.match(/^\s*#redirect\s+(?:\[\[)?([^\]\n]+?)(?:\]\])?\s*$/im);
  if (exists && redirectMatch?.[1]?.trim() && redirectMatch[1].trim() !== title) throw redirect(302, "/w/" + encodeURIComponent(redirectMatch[1].trim()));
  let rendered = "";
  let engine = "empty";
  if (exists) {
    const result = await renderWikiMarkup(event, title, content, { path: "/api/render?title=" + encodeURIComponent(title) });
    rendered = result.html;
    engine = result.engine;
  }
  const protectionLevel = record?.protectionLevel || "none";
  const protectionReason = record?.protectionReason || "";
  const protectionLabel = protectionLevel === "admin" ? "관리자 편집 보호" : protectionLevel === "registered" ? "회원 편집 보호" : "";
  const protectionMessage = protectionLabel ? protectionReason || (protectionLevel === "admin" ? "이 문서는 관리자만 편집할 수 있습니다." : "이 문서는 로그인한 회원만 편집할 수 있습니다.") : "";
  const displayTitle = title;
  const titleText = exists ? displayTitle : displayTitle + " (문서 없음)";
  let shell = legacyShell
    .replace('<section id="home-view" class="home-view">', '<section id="home-view" class="home-view" hidden>')
    .replace('<section id="document-view" class="document-view" hidden>', '<section id="document-view" class="document-view">')
    .replace('<h1 id="title"></h1>', '<h1 id="title">' + escapeHtml(titleText) + '</h1>')
    .replace('<span id="crumb"></span>', '<span id="crumb">' + escapeHtml(displayTitle) + '</span>')
    .replace('<article id="article" class="wiki-content"></article>', '<article id="article" class="wiki-content" data-render-engine="' + engine + '">' + rendered + '</article>')
    .replace('<div id="message" class="notice" role="status"></div>', '<div id="message" class="notice" role="status">' + (exists ? "" : "이 문서는 아직 존재하지 않습니다. 로그인 후 새 문서를 작성할 수 있습니다.") + '</div>');
  shell = shell.replace('<span id="protection-status" class="protection-status" hidden></span>', protectionLabel
    ? '<span id="protection-status" class="protection-status">' + escapeHtml(protectionLabel) + '</span>'
    : '<span id="protection-status" class="protection-status" hidden></span>');
  shell = shell.replace('<div id="protection-notice" class="protection-notice" role="status" aria-live="polite" hidden></div>', protectionMessage
    ? '<div id="protection-notice" class="protection-notice" role="status" aria-live="polite">' + escapeHtml(protectionMessage) + '</div>'
    : '<div id="protection-notice" class="protection-notice" role="status" aria-live="polite" hidden></div>');
  if (exists) {
    shell = shell
      .replace('id="edit" class="nav-item" type="button" hidden', 'id="edit" class="nav-item" type="button"')
      .replace('id="history" class="nav-item" type="button" hidden', 'id="history" class="nav-item" type="button"')
      .replace('id="upload" class="nav-item" type="button" hidden', 'id="upload" class="nav-item" type="button"')
      .replace('id="backlinks-tab" type="button" hidden', 'id="backlinks-tab" type="button"');
  } else {
    shell = shell
      .replace('<button id="edit" class="nav-item" type="button" hidden>문서 편집</button>', '<button id="edit" class="nav-item" type="button">문서 만들기</button>')
      .replace('<button id="heading-edit" class="title-button" type="button">편집</button>', '<button id="heading-edit" class="title-button" type="button" hidden>편집</button>');
  }
  return { shellHtml: shell, documentTitle: titleText + " - AonWiki", ssrState: { route: "article", title: displayTitle, content, protection: { level: protectionLevel, reason: protectionReason }, exists, engine } };
};
