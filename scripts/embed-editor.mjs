import { readFile, writeFile } from "node:fs/promises";

const page = new URL("../index.html", import.meta.url);
const exportedPage = await readFile(
  new URL("../next-editor/out/index.html", import.meta.url),
  "utf8",
);
const editor = exportedPage.match(
  /<section id="editor-view"[^>]*>[\s\S]*?<\/form><\/section><\/section>/,
)?.[0];
if (!editor) throw new Error("Next.js export is missing the AonWiki editor.");

const editorCss = await readFile(
  new URL("../next-editor/editor.css", import.meta.url),
  "utf8",
);
const styledEditor = editor.replace(
  /^<section[^>]*>/,
  (opening) => `${opening}
<style id="aonwiki-editor-styles">
${editorCss}</style>
`,
);

const html = await readFile(page, "utf8");
const slot = /(    <!-- editor:start -->\n)[\s\S]*?(    <!-- editor:end -->)/;
if (!slot.test(html)) throw new Error("index.html is missing the editor slot.");

await writeFile(
  page,
  html.replace(slot, (_, start, end) => `${start}    ${styledEditor}\n${end}`),
);
