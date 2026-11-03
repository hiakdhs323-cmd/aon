import { readFile } from "node:fs/promises";

const bytes = await readFile(".cache/namumark.wasm");
const module = await WebAssembly.compile(bytes);
const samples = [
  ["basic", "== 제목 ==\\n'''굵게''' [[문서]]"],
  ["file", "[[파일:sample.webp|width=500&align=right]]"],
  ["folding", "{{{#!folding 펼치기\\n접힌 내용\\n}}}"],
  ["wiki-style", "{{{#!wiki style=\\"color:red\\"\\n빨간 내용\\n}}}"],
  ["include", "[include(문서)]"],
  ["redirect", "#redirect [[문서]]"],
  ["table", "|| 항목 || 값 ||\\n|| 이름 || 아온 ||"]
];

function render(source) {
  const instance = new WebAssembly.Instance(module, {});
  const wasm = instance.exports;
  const input = new TextEncoder().encode(source);
  const pointer = wasm.alloc(input.length);
  try {
    new Uint8Array(wasm.memory.buffer, pointer, input.length).set(input);
    const outputPointer = wasm.render_html(pointer, input.length);
    const outputLength = wasm.get_buffer_len();
    if (!Number.isInteger(outputLength) || outputLength < 0 || outputLength > 8000000) {
      throw new Error("Invalid WASM output length: " + outputLength);
    }
    return new TextDecoder().decode(new Uint8Array(wasm.memory.buffer, outputPointer, outputLength).slice());
  } finally {
    wasm.dealloc(pointer, input.length);
  }
}

for (const [name, source] of samples) {
  const html = render(source);
  if (!html.trim()) throw new Error("NamuMark WASM returned empty output for sample: " + name);
  console.log("[namumark-sample] " + name + " source=" + JSON.stringify(source) + " html=" + JSON.stringify(html.slice(0, 900)));
}
console.log("NamuMark WASM sample suite passed (" + samples.length + " cases).");
