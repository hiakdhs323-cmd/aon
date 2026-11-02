let wasmExports = null;
let wasmPromise = null;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const DEFAULT_WASM_URL = "https://uiovasot.github.io/namumark/namumark.wasm";
export async function initWasm(path = DEFAULT_WASM_URL) {
  if (wasmExports) return;
  if (!wasmPromise) {
    wasmPromise = (async () => {
      const response = await fetch(path, { mode: "cors", credentials: "omit", cache: "force-cache" });
      if (!response.ok) throw new Error("WASM 다운로드 실패 (" + response.status + ")");
      const bytes = await response.arrayBuffer();
      const result = await WebAssembly.instantiate(bytes);
      wasmExports = result.instance.exports;
      if (!wasmExports.memory || !wasmExports.alloc || !wasmExports.dealloc || !wasmExports.render_html || !wasmExports.get_buffer_len) {
        wasmExports = null;
        throw new Error("지원하지 않는 나무마크 WASM ABI입니다.");
      }
    })().catch(error => { wasmPromise = null; throw error; });
  }
  await wasmPromise;
}
export function render(text) {
  if (!wasmExports) throw new Error("먼저 initWasm()을 호출해야 합니다.");
  const bytes = encoder.encode(String(text || ""));
  const ptr = wasmExports.alloc(bytes.length);
  try {
    new Uint8Array(wasmExports.memory.buffer, ptr, bytes.length).set(bytes);
    const outPtr = wasmExports.render_html(ptr, bytes.length);
    const outLen = wasmExports.get_buffer_len();
    return decoder.decode(new Uint8Array(wasmExports.memory.buffer, outPtr, outLen));
  } finally {
    wasmExports.dealloc(ptr, bytes.length);
  }
}
