import { mkdir, writeFile } from "node:fs/promises";
const url = "https://raw.githubusercontent.com/uiovasot/namumark/6d8bd559734c173ae1b728f858a7c9f15e6a77f7/namumark.wasm";
const response = await fetch(url);
if (!response.ok) throw new Error("NamuMark WASM download failed: " + response.status);
const bytes = new Uint8Array(await response.arrayBuffer());
if (bytes.length < 1024 || bytes[0] !== 0 || bytes[1] !== 97 || bytes[2] !== 115 || bytes[3] !== 109) throw new Error("Downloaded file is not a valid WebAssembly module.");
await mkdir(".cache", { recursive: true });
await writeFile(".cache/namumark.wasm", bytes);
console.log("Downloaded pinned uiovasot/namumark WASM (" + bytes.length.toLocaleString() + " bytes).");
