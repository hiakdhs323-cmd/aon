import sanitizeHtml from "sanitize-html";
import type { RequestEvent } from "@sveltejs/kit";
import { apiOrigin, fetchApi } from "./api";

const UPSTREAM_WASM = "https://raw.githubusercontent.com/uiovasot/namumark/6d8bd559734c173ae1b728f858a7c9f15e6a77f7/namumark.wasm";
let modulePromise: Promise<WebAssembly.Module> | undefined;

type NamuExports = WebAssembly.Exports & {
  memory: WebAssembly.Memory;
  alloc(length: number): number;
  dealloc(pointer: number, length: number): void;
  render_html(pointer: number, length: number): number;
  get_buffer_len(): number;
};

export function requiresLegacyCompatibility(source: string): boolean {
  return /\[\[(?:파일|file):|\[include\(|\{\{\{#!|^\s*#redirect\b/im.test(source);
}

async function getWasmModule(): Promise<WebAssembly.Module> {
  if (!modulePromise) {
    modulePromise = (async () => {
      const response = await fetch(UPSTREAM_WASM, { headers: { "Accept": "application/wasm, application/octet-stream" } });
      if (!response.ok) throw new Error("상위 NamuMark WASM을 불러오지 못했습니다: " + response.status);
      return WebAssembly.compile(await response.arrayBuffer());
    })().catch(error => {
      modulePromise = undefined;
      throw error;
    });
  }
  return modulePromise;
}

async function renderWithUpstreamWasm(source: string): Promise<string> {
  const module = await getWasmModule();
  const instance = await WebAssembly.instantiate(module);
  const wasm = instance.exports as NamuExports;
  const input = new TextEncoder().encode(source);
  const pointer = wasm.alloc(input.length);
  try {
    new Uint8Array(wasm.memory.buffer, pointer, input.length).set(input);
    const outputPointer = wasm.render_html(pointer, input.length);
    const outputLength = wasm.get_buffer_len();
    if (!Number.isInteger(outputLength) || outputLength < 0 || outputLength > 8000000) {
      throw new Error("잘못된 WASM 출력 길이");
    }
    return new TextDecoder().decode(new Uint8Array(wasm.memory.buffer, outputPointer, outputLength).slice());
  } finally {
    wasm.dealloc(pointer, input.length);
  }
}

function sanitizeWikiHtml(markup: string, origin: string): string {
  return sanitizeHtml(markup, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "article", "section", "figure", "figcaption", "details", "summary", "ruby", "rt", "rp", "iframe", "video", "audio", "source", "center", "font", "del", "ins", "sub", "sup", "hr"],
    allowedAttributes: {
      "*": ["class", "id", "title", "lang", "dir", "role", "aria-label", "aria-hidden", "colspan", "rowspan", "align", "valign", "width", "height", "open", "start", "loading", "decoding"],
      "a": ["href", "name", "target", "rel"],
      "img": ["src", "alt", "width", "height", "loading", "decoding"],
      "iframe": ["src", "width", "height", "allow", "allowfullscreen", "frameborder", "loading", "referrerpolicy"],
      "video": ["src", "controls", "width", "height", "poster", "loop", "muted"],
      "audio": ["src", "controls", "loop", "muted"],
      "source": ["src", "type"]
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    allowedIframeHostnames: ["www.youtube.com", "youtube.com", "www.instagram.com", "www.facebook.com", "www.tiktok.com", "twitframe.com", "tv.kakao.com", "tv.naver.com", "embed.nicovideo.jp", "player.vimeo.com"],
    transformTags: {
      "a": (_tag, attribs) => {
        const href = String(attribs.href || "");
        return /^https?:\/\//i.test(href)
          ? { tagName: "a", attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" } }
          : { tagName: "a", attribs };
      },
      "img": (_tag, attribs) => {
        let src = String(attribs.src || "");
        if (src.startsWith("/media/") || src.startsWith("/image/")) src = origin + src;
        return { tagName: "img", attribs: { ...attribs, src, loading: "lazy", decoding: "async" } };
      }
    }
  });
}

export async function renderWikiMarkup(
  event: RequestEvent,
  title: string,
  source: string,
  legacy: { path: string; init?: RequestInit }
): Promise<{ html: string; engine: string }> {
  const content = String(source || "");
  const fallback = async () => {
    const response = await fetchApi(event, legacy.path, legacy.init || {});
    if (!response.ok) throw new Error("기존 렌더러 호환 요청 실패: " + response.status);
    const data = await response.json() as { html?: string };
    return { html: String(data.html || ""), engine: "legacy-compatibility" };
  };

  if (requiresLegacyCompatibility(content)) return fallback();

  try {
    const html = await renderWithUpstreamWasm(content);
    return { html: sanitizeWikiHtml(html, apiOrigin(event)), engine: "uiovasot-namumark-wasm" };
  } catch (error) {
    console.error("Upstream NamuMark WASM failed; using legacy compatibility renderer", error);
    return fallback();
  }
}
