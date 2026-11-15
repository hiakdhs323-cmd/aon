import { build } from "esbuild";

await build({
  entryPoints: ["app.js"],
  outfile: "app.bundle.js",
  bundle: true,
  minify: true,
  format: "esm",
  platform: "browser",
  target: ["es2020"],
  loader: { ".wasm": "dataurl" },
  legalComments: "eof",
  sourcemap: false,
  metafile: false,
  logLevel: "info",
});

console.log("Built app.bundle.js: Highlight.js, NamuMark WASM, and wiki interactions are bundled.");
