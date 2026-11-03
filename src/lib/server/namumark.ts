import sanitizeHtml from "sanitize-html";
import type { RequestEvent } from "@sveltejs/kit";
import { apiOrigin, fetchApi } from "./api";

let modulePromise: Promise<WebAssembly.Module> | undefined;

type NamuExports = WebAssembly.Exports & {
  memory: WebAssembly.Memory;
  alloc(length: number): number;
  dealloc(pointer: number, length: number): void;
  render_html(pointer: number, length: number): number;
  get_buffer_len(): number;
};

type StaticAssets = { fetch(input: Request): Promise<Response> };

async function getWasmModule(event: RequestEvent): Promise<WebAssembly.Module> {
  if (!modulePromise) {
    modulePromise = (async () => {
      const assets = (event.platform?.env as { ASSETS?: StaticAssets } | undefined)?.ASSETS;
      const request = new Request(new URL("/namumark.wasm", event.url.origin));
      const response = assets
        ? await assets.fetch(request)
        : await fetch(request);
      if (!response.ok) throw new Error("NamuMark WASM asset load failed: " + response.status);
      return WebAssembly.compile(await response.arrayBuffer());
    })().catch(error => {
      modulePromise = undefined;
      throw error;
    });
  }
  return modulePromise;
}

async function renderWithWasm(event: RequestEvent, source: string): Promise<string> {
  const module = await getWasmModule(event);
  const instance = await WebAssembly.instantiate(module);
  const wasm = instance.exports as NamuExports;
  const input = new TextEncoder().encode(source);
  const pointer = wasm.alloc(input.length);
  try {
    new Uint8Array(wasm.memory.buffer, pointer, input.length).set(input);
    const outputPointer = wasm.render_html(pointer, input.length);
    const outputLength = wasm.get_buffer_len();
    if (!Number.isInteger(outputLength) || outputLength < 0 || outputLength > 8000000) {
      throw new Error("Invalid NamuMark WASM output length: " + outputLength);
    }
    return new TextDecoder().decode(
      new Uint8Array(wasm.memory.buffer, outputPointer, outputLength).slice()
    );
  } finally {
    wasm.dealloc(pointer, input.length);
  }
}

async function resolveWikiFileUrls(event: RequestEvent, markup: string): Promise<string> {
  const paths = new Set([...markup.matchAll(/src=["'][/]files[/]([^"']+)["']/gi)].map(match => String(match[1] || "")));
  let output = markup;
  for (const encodedName of paths) {
    let filename = encodedName;
    try { filename = decodeURIComponent(encodedName); } catch {}
    const response = await fetchApi(event, "/api/file?name=" + encodeURIComponent(filename)).catch(() => null);
    if (!response?.ok) continue;
    const data = await response.json().catch(() => ({})) as { image?: { key?: string } };
    if (!data.image?.key) continue;
    output = output.replaceAll("/files/" + encodedName, "/media/" + data.image.key);
  }
  return output;
}

function sanitizeWikiHtml(markup: string, origin: string): string {
  return sanitizeHtml(markup, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "article", "section", "figure", "figcaption", "details", "summary", "ruby", "rt", "rp", "iframe", "video", "audio", "source", "center", "font", "del", "ins", "sub", "sup", "hr"],
    allowedAttributes: {
      "*": ["class", "id", "title", "lang", "dir", "role", "aria-label", "aria-hidden", "colspan", "rowspan", "align", "valign", "width", "height", "open", "start", "loading", "decoding", "style"],
      "a": ["href", "name", "target", "rel"],
      "img": ["src", "alt", "width", "height", "loading", "decoding"],
      "iframe": ["src", "width", "height", "allow", "allowfullscreen", "frameborder", "loading", "referrerpolicy"],
      "video": ["src", "controls", "width", "height", "poster", "loop", "muted"],
      "audio": ["src", "controls", "loop", "muted"],
      "source": ["src", "type"]
    },
    allowedStyles: {
      "*": {
        "color": [/^#[0-9a-f]{3,8}$/i, /^[a-z]{1,24}$/i],
        "background-color": [/^#[0-9a-f]{3,8}$/i, /^[a-z]{1,24}$/i],
        "font-size": [/^\d+(?:\.\d+)?(?:px|em|rem|%)$/i],
        "font-weight": [/^(?:normal|bold|[1-9]00)$/i],
        "font-style": [/^(?:normal|italic|oblique)$/i],
        "text-align": [/^(?:left|right|center|justify)$/i],
        "text-decoration": [/^(?:none|underline|line-through)$/i],
        "width": [/^\d+(?:\.\d+)?(?:px|%)$/i],
        "max-width": [/^\d+(?:\.\d+)?(?:px|%)$/i],
        "margin": [/^[\d.\s%pxemauto-]+$/i],
        "padding": [/^[\d.\s%pxem-]+$/i],
        "border": [/^[\w\s#().,%/-]+$/i],
        "border-radius": [/^\d+(?:\.\d+)?(?:px|%)$/i]
      }
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    allowedIframeHostnames: ["www.youtube.com", "youtube.com", "www.instagram.com", "www.facebook.com", "www.tiktok.com", "twitframe.com", "tv.kakao.com", "tv.naver.com", "embed.nicovideo.jp", "player.vimeo.com"],
    transformTags: {
      "a": (_tag, attribs) => {
        const href = String(attribs.href || "");
        if (/^https?:[/][/]/i.test(href)) {
          return { tagName: "a", attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" } };
        }
        if (href.startsWith("/wiki/")) {
          try {
            const parsed = new URL(href, "https://aonwiki.invalid");
            const title = decodeURIComponent(parsed.pathname.slice(6));
            return { tagName: "a", attribs: { ...attribs, href: "/w/" + encodeURIComponent(title) + parsed.search + parsed.hash } };
          } catch {
            return { tagName: "a", attribs: { ...attribs, href: "#" } };
          }
        }
        return { tagName: "a", attribs };
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
  source: string
): Promise<{ html: string; engine: "uiovasot-namumark-wasm" }> {
  const rawHtml = await renderWithWasm(event, String(source || ""));
  const html = await resolveWikiFileUrls(event, rawHtml);
  return {
    html: sanitizeWikiHtml(html, apiOrigin(event)),
    engine: "uiovasot-namumark-wasm"
  };
}
