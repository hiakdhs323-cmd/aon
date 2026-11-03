import sanitizeHtml from "sanitize-html";
import type { RequestEvent } from "@sveltejs/kit";
import { apiOrigin } from "./api";

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
        return /^https?:[/][/]/i.test(href)
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
  source: string
): Promise<{ html: string; engine: "uiovasot-namumark-wasm" }> {
  const html = await renderWithWasm(event, String(source || ""));
  return {
    html: sanitizeWikiHtml(html, apiOrigin(event)),
    engine: "uiovasot-namumark-wasm"
  };
}
