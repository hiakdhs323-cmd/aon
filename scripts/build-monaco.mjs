import { build } from "esbuild";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";

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
  sourcemap: false,
  loader: { ".ttf": "dataurl", ".woff": "dataurl", ".woff2": "dataurl" }
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
  sourcemap: false,
  loader: { ".ttf": "dataurl", ".woff": "dataurl", ".woff2": "dataurl" }
});

// Include the exact editor stylesheet uploaded for this integration, then append
// Monaco's codicon font CSS (the font itself is inlined by esbuild's dataurl loader).
const uploadedEditorCss = await readFile("editor/monaco-user.css", "utf8");
const codiconCss = await readFile(`${outputDirectory}/monaco.css`, "utf8");
await writeFile(`${outputDirectory}/monaco.css`, uploadedEditorCss + "\n" + codiconCss);

await copyFile("node_modules/monaco-editor/LICENSE", `${outputDirectory}/LICENSE.monaco.txt`);

for (const file of ["monaco.js", "monaco.worker.js", "monaco.css", "LICENSE.monaco.txt"]) {
  const filePath = `${outputDirectory}/${file}`;
  const info = await stat(filePath);
  if (info.size < 100) throw new Error(`Monaco build output is unexpectedly small: ${filePath}`);
  process.stdout.write(`Built ${filePath} (${info.size.toLocaleString()} bytes)\n`);
}
