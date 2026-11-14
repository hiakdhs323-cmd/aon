import { build } from "esbuild";
import { gunzipSync } from "node:zlib";
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

// Combine the existing editor skin, the separately uploaded Monaco widget CSS,
// and Monaco's bundled Codicon font CSS. The external NBS font reference was
// removed from the uploaded stylesheet; use the locally bundled Codicon instead.
const uploadedEditorCss = await readFile("editor/monaco-user.css", "utf8");
const uploadedExtraCss = gunzipSync(await readFile("editor/monaco-extra.css.gz")).toString("utf8");
if (/\/skins\/nbs\/assets\/codicon-/i.test(uploadedExtraCss)) {
  throw new Error("Monaco extra CSS must not reference the external NBS Codicon font.");
}
const codiconCss = await readFile(`${outputDirectory}/monaco.css`, "utf8");
await writeFile(`${outputDirectory}/monaco.css`, uploadedEditorCss + "\n" + uploadedExtraCss + "\n" + codiconCss);

await copyFile("node_modules/monaco-editor/LICENSE", `${outputDirectory}/LICENSE.monaco.txt`);

for (const file of ["monaco.js", "monaco.worker.js", "monaco.css", "LICENSE.monaco.txt"]) {
  const filePath = `${outputDirectory}/${file}`;
  const info = await stat(filePath);
  if (info.size < 100) throw new Error(`Monaco build output is unexpectedly small: ${filePath}`);
  process.stdout.write(`Built ${filePath} (${info.size.toLocaleString()} bytes)\n`);
}
