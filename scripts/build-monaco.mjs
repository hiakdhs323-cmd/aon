import { build } from "esbuild";
import { copyFile, mkdir, stat } from "node:fs/promises";

const outputDirectory = "editor-monaco";
await mkdir(outputDirectory, { recursive: true });

await build({
  entryPoints: ["editor/monaco-entry.js"],
  bundle: true,
  minify: true,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  outfile: `${outputDirectory}/monaco.js`,
  legalComments: "eof",
  sourcemap: false
});

await build({
  entryPoints: ["editor/monaco-worker.js"],
  bundle: true,
  minify: true,
  format: "esm",
  platform: "browser",
  target: ["es2020"],
  outfile: `${outputDirectory}/monaco.worker.js`,
  legalComments: "eof",
  sourcemap: false
});

await copyFile("node_modules/monaco-editor/LICENSE", `${outputDirectory}/LICENSE.monaco.txt`);

for (const file of ["monaco.js", "monaco.worker.js", "monaco.css", "LICENSE.monaco.txt"]) {
  const filePath = `${outputDirectory}/${file}`;
  const info = await stat(filePath);
  if (info.size < 100) throw new Error(`Monaco build output is unexpectedly small: ${filePath}`);
  process.stdout.write(`Built ${filePath} (${info.size.toLocaleString()} bytes)\n`);
}
