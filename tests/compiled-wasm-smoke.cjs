const assert = require("node:assert/strict");
const fs = require("node:fs");

const wrangler = fs.readFileSync("wrangler.toml", "utf8");
const buildWorkflow = fs.readFileSync(".github/workflows/build-renderer.yml", "utf8");
const deployWorkflow = fs.readFileSync(".github/workflows/deploy-worker.yml", "utf8");
const workerBundle = fs.readFileSync("worker/dist/index.js", "utf8");

assert.match(wrangler, /\[\[rules\]\][\s\S]*?type\s*=\s*"CompiledWasm"[\s\S]*?globs\s*=\s*\["\*\*\/\*\.wasm"\]/,
  "Wrangler must upload WebAssembly as a precompiled CompiledWasm module");
for (const [name, workflow] of [["renderer build", buildWorkflow], ["Worker deploy", deployWorkflow]]) {
  assert.match(workflow, /--external:\*\.wasm/,
    name + " must leave Wasm as an external module for Wrangler");
  assert.doesNotMatch(workflow, /--loader:\.wasm=binary/,
    name + " must not inline Wasm bytes into JavaScript");
}
assert.match(workerBundle, /import\s+\w+\s+from\s+["'][^"']+\.wasm["']/,
  "the generated Worker bundle must retain an external Wasm module import");

console.log("CompiledWasm deployment checks passed.");
