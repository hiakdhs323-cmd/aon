import { readFile } from "node:fs/promises";
const api = (process.env.AON_API_ORIGIN || "https://aon.hiakdhs323.workers.dev").replace(/\/$/, "");
const wasmBytes = await readFile(".cache/namumark.wasm");
const module = await WebAssembly.compile(wasmBytes);
const response = await fetch(api + "/api/page-index");
if (!response.ok) throw new Error("Cannot read live D1 page index: HTTP " + response.status);
const index = await response.json();
const titles = (index.pages || []).map(item => String(item.title || "")).filter(Boolean);
if (titles.length === 10000) throw new Error("The page index reached its 10,000 row cap; compatibility scan is incomplete.");
const needsLegacy = source => /\[\[(?:파일|file):|\[include\(|\{\{\{#!(?:wiki|style|syntax|latex|if|folding)|^\s*#redirect\b/im.test(source);
let wasmCount = 0, legacyCount = 0, emptyCount = 0;
for (const title of titles) {
  const pageResponse = await fetch(api + "/api/page?title=" + encodeURIComponent(title));
  if (!pageResponse.ok) throw new Error("Page fetch failed for " + title + ": HTTP " + pageResponse.status);
  const page = (await pageResponse.json()).page;
  if (!page) throw new Error("Indexed page disappeared during scan: " + title);
  const source = String(page.content || "");
  if (!source.trim()) { emptyCount++; continue; }
  if (needsLegacy(source)) {
    const old = await fetch(api + "/api/render?title=" + encodeURIComponent(title));
    if (!old.ok) throw new Error("Legacy fallback failed for " + title + ": HTTP " + old.status);
    const data = await old.json();
    if (typeof data.html !== "string") throw new Error("Legacy fallback returned no HTML for " + title);
    legacyCount++;
    continue;
  }
  const instance = await WebAssembly.instantiate(module);
  const wasm = instance.exports;
  const input = new TextEncoder().encode(source);
  const pointer = wasm.alloc(input.length);
  try {
    new Uint8Array(wasm.memory.buffer, pointer, input.length).set(input);
    const outputPointer = wasm.render_html(pointer, input.length);
    const outputLength = wasm.get_buffer_len();
    if (!Number.isInteger(outputLength) || outputLength < 0 || outputLength > 8000000) throw new Error("Invalid WASM output length");
    const html = new TextDecoder().decode(new Uint8Array(wasm.memory.buffer, outputPointer, outputLength));
    if (!html.trim()) throw new Error("Empty render output");
    wasmCount++;
  } catch (error) {
    throw new Error("WASM compatibility failure for existing page '" + title + "': " + String(error));
  } finally {
    wasm.dealloc(pointer, input.length);
  }
}
console.log("Live D1 compatibility scan passed.");
console.log("Total pages: " + titles.length + "; WASM-rendered: " + wasmCount + "; legacy compatibility fallback: " + legacyCount + "; empty: " + emptyCount + ".");
