import * as monaco from "monaco-editor";
import "../node_modules/monaco-editor/esm/vs/base/browser/ui/codicons/codicon/codicon.css";

const globalObject = globalThis;
const currentScript = typeof document !== "undefined" ? document.currentScript : null;
const workerBase = currentScript?.src || (typeof document !== "undefined" ? document.baseURI : globalObject.location?.href);
const workerUrl = new URL("./monaco.worker.js", workerBase).toString();

globalObject.MonacoEnvironment = {
  ...(globalObject.MonacoEnvironment || {}),
  getWorker(_moduleId, label) {
    return new Worker(workerUrl, {
      type: "module",
      name: label || "aonwiki-monaco-editor"
    });
  }
};

const languageId = "namumark";

monaco.languages.register({
  id: languageId,
  aliases: ["NamuMark", "나무마크", "Namumark"],
  extensions: [".namu", ".wiki"]
});

monaco.languages.setLanguageConfiguration(languageId, {
  brackets: [
    ["[", "]"],
    ["{", "}"],
    ["(", ")"],
    ["{{{", "}}}"],
    ["[[", "]]"]
  ],
  autoClosingPairs: [
    { open: "[[", close: "]]" },
    { open: "{{{", close: "}}}" },
    { open: "'''", close: "'''" },
    { open: "''", close: "''" },
    { open: "[", close: "]" },
    { open: "(", close: ")" }
  ],
  surroundingPairs: [
    { open: "'''", close: "'''" },
    { open: "''", close: "''" },
    { open: "[[", close: "]]" },
    { open: "{{{", close: "}}}" }
  ],
  folding: {
    offSide: false
  }
});

monaco.languages.setMonarchTokensProvider(languageId, {
  defaultToken: "",
  tokenizer: {
    root: [
      [/^\s*(={2,6})(.*?)(={2,6})\s*$/, ["aon.heading.delimiter", "aon.heading", "aon.heading.delimiter"]],
      [/^\s*\[목차\]\s*$/, "aon.directive"],
      [/\[(?:anchor|ruby|br|clearfix|date|datetime|age|youtube|nicovideo)(?:\([^\]\r\n]*\))?\]/i, "aon.macro"],
      [/<(?:[a-z][\w-]*(?:=[^>]+)?|-[0-9]+|\|[0-9]+)>/i, "aon.table.attribute"],
      [/^\s*[0-9]+\.\s/, "aon.list.number"],
      [/\[include\([^\]]+\)\]/i, "aon.directive"],
      [/\[\*[^\]]+\]/, "aon.footnote"],
      [/\[https?:\/\/[^\]]+\]/i, "aon.external"],
      [/\[\[분류:/i, { token: "aon.category", next: "@category" }],
      [/\[\[파일:/i, { token: "aon.file", next: "@file" }],
      [/\[\[틀:/i, { token: "aon.template", next: "@template" }],
      [/\[\[/, { token: "aon.link.delimiter", next: "@link" }],
      [/'''/, { token: "aon.bold", next: "@bold" }],
      [/''/, { token: "aon.italic", next: "@italic" }],
      [/~~/, { token: "aon.strike", next: "@strike" }],
      [/\{\{\{#[^\s}]+/, { token: "aon.color.delimiter", next: "@colorStyle" }],
      [/\{\{\{\+[0-9]+/, { token: "aon.size.delimiter", next: "@sizeStyle" }],
      [/\{\{\{#![\w-]+/, "aon.directive"],
      [/\{\{\{/, { token: "aon.code.delimiter", next: "@code" }],
      [/\}\}\}/, "aon.code.delimiter"],
      [/\|\|/, "aon.table.delimiter"],
      [/^\s*\*+\s/, "aon.list"],
      [/https?:\/\/[^\s\]]+/i, "aon.url"],
      [/#(?:[0-9a-f]{3,8})\b/i, "number"],
      [/^\s*#.*$/, "comment"]
    ],
    category: [
      [/\]\]/, { token: "aon.link.delimiter", next: "@pop" }],
      [/[^\]]+/, "aon.category"]
    ],
    file: [
      [/\]\]/, { token: "aon.link.delimiter", next: "@pop" }],
      [/\|/, "delimiter"],
      [/[^\]]+/, "aon.file"]
    ],
    template: [
      [/\]\]/, { token: "aon.link.delimiter", next: "@pop" }],
      [/[^\]]+/, "aon.template"]
    ],
    link: [
      [/\]\]/, { token: "aon.link.delimiter", next: "@pop" }],
      [/\|/, "delimiter"],
      [/[^\]|]+/, "aon.link"]
    ],
    bold: [
      [/'''/, { token: "aon.bold", next: "@pop" }],
      [/[^']+/, "aon.bold"],
      [/'/, "aon.bold"]
    ],
    italic: [
      [/''/, { token: "aon.italic", next: "@pop" }],
      [/[^']+/, "aon.italic"],
      [/'/, "aon.italic"]
    ],
    strike: [
      [/~~/, { token: "aon.strike", next: "@pop" }],
      [/[^~]+/, "aon.strike"],
      [/~/, "aon.strike"]
    ],
    colorStyle: [
      [/\}\}\}/, { token: "aon.code.delimiter", next: "@pop" }],
      [/[^}]+/, "aon.color.text"],
      [/\}/, "aon.color.text"]
    ],
    sizeStyle: [
      [/\}\}\}/, { token: "aon.code.delimiter", next: "@pop" }],
      [/[^}]+/, "aon.size.text"],
      [/\}/, "aon.size.text"]
    ],
    code: [
      [/^\s*\}\}\}\s*$/, { token: "aon.code.delimiter", next: "@pop" }],
      [/.*$/, "aon.code"]
    ]
  }
});

monaco.editor.defineTheme("aonwiki-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "aon.heading", foreground: "79B8FF", fontStyle: "bold" },
    { token: "aon.heading.delimiter", foreground: "58A6FF" },
    { token: "aon.bold", foreground: "F0F6FC", fontStyle: "bold" },
    { token: "aon.italic", foreground: "D2A8FF", fontStyle: "italic" },
    { token: "aon.strike", foreground: "A5A5A5", fontStyle: "strikethrough" },
    { token: "aon.link", foreground: "79C0FF" },
    { token: "aon.link.delimiter", foreground: "8B949E" },
    { token: "aon.category", foreground: "FFA657" },
    { token: "aon.file", foreground: "7EE787" },
    { token: "aon.template", foreground: "D2A8FF" },
    { token: "aon.url", foreground: "F0883E", underline: true },
    { token: "aon.external", foreground: "F0883E", underline: true },
    { token: "aon.footnote", foreground: "E3B341" },
    { token: "aon.directive", foreground: "FF7B72" },
    { token: "aon.table.delimiter", foreground: "8B949E" },
    { token: "aon.code.delimiter", foreground: "D2A8FF" },
    { token: "aon.code", foreground: "C9D1D9" },
    { token: "aon.list", foreground: "FFA657" },
    { token: "aon.list.number", foreground: "FFA657", fontStyle: "bold" },
    { token: "aon.table.attribute", foreground: "79C0FF" },
    { token: "aon.macro", foreground: "56D4DD" },
    { token: "aon.color.delimiter", foreground: "FF7B72" },
    { token: "aon.color.text", foreground: "A5D6FF" },
    { token: "aon.size.delimiter", foreground: "FF7B72" },
    { token: "aon.size.text", foreground: "D2A8FF" },
    { token: "comment", foreground: "8B949E", fontStyle: "italic" }
  ],
  colors: {
    "editor.background": "#1e1e1e",
    "editor.foreground": "#d4d4d4",
    "editorGutter.background": "#1e1e1e",
    "editorLineNumber.foreground": "#777777",
    "editorLineNumber.activeForeground": "#f0f0f0",
    "editor.selectionBackground": "#264F78",
    "editor.lineHighlightBackground": "#ffffff08",
    "editorCursor.foreground": "#f4f4f4",
    "editorWhitespace.foreground": "#383838",
    "editorIndentGuide.background": "#343434",
    "editorIndentGuide.activeBackground": "#555555",
    "editorWidget.background": "#252526",
    "editorWidget.border": "#454545"
  }
});

const completionItems = [
  { label: "문서 링크", insertText: "[[문서명]]", detail: "내부 문서 링크" },
  { label: "파일 링크", insertText: "[[파일:파일명.png]]", detail: "파일 포함" },
  { label: "틀 삽입", insertText: "[[틀:틀이름]]", detail: "틀 문법" },
  { label: "분류 지정", insertText: "[[분류:분류명]]", detail: "문서 분류" },
  { label: "각주", insertText: "[* 각주 내용]", detail: "각주 삽입" },
  { label: "목차", insertText: "[목차]", detail: "목차 삽입" },
  { label: "접기", insertText: "{{{#!folding 제목\n접을 내용\n}}}", detail: "접기 영역" },
  { label: "표", insertText: "||항목 1||항목 2||\n||내용||내용||", detail: "표 삽입" },
  { label: "굵게", insertText: "'''굵은 글씨'''", detail: "굵은 글씨" },
  { label: "기울임", insertText: "''기울임''", detail: "기울임" },
  { label: "외부 링크", insertText: "[https://example.com|표시 문구]", detail: "외부 링크" },
  { label: "틀/위키 스타일", insertText: "{{{#!wiki style=\"border: 1px solid #aaa; padding: 8px;\"\n내용\n}}}", detail: "위키 스타일 박스" }
];

monaco.languages.registerCompletionItemProvider(languageId, {
  triggerCharacters: ["[", "{", "=", "|"],
  provideCompletionItems(model, position) {
    const word = model.getWordUntilPosition(position);
    const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
    return {
      suggestions: completionItems.map((item) => ({
        ...item,
        kind: monaco.languages.CompletionItemKind.Snippet,
        range,
        sortText: item.label
      }))
    };
  }
});

function createEditor(container, value, options = {}) {
  return monaco.editor.create(container, {
    value: String(value ?? ""),
    language: languageId,
    theme: "aonwiki-dark",
    automaticLayout: true,
    fontSize: 13,
    lineHeight: 21,
    fontFamily: 'D2Coding, Consolas, "Courier New", monospace',
    lineNumbers: "on",
    lineNumbersMinChars: 3,
    glyphMargin: false,
    folding: true,
    foldingStrategy: "auto",
    showFoldingControls: "mouseover",
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: "on",
    wordWrapColumn: 120,
    tabSize: 4,
    insertSpaces: true,
    autoIndent: "full",
    bracketPairColorization: { enabled: true },
    matchBrackets: "always",
    renderLineHighlight: "line",
    renderWhitespace: "selection",
    smoothScrolling: true,
    cursorBlinking: "smooth",
    quickSuggestions: { other: true, comments: false, strings: false },
    suggestOnTriggerCharacters: true,
    wordBasedSuggestions: "currentDocument",
    contextmenu: true,
    padding: { top: 8, bottom: 10 },
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    scrollbar: { vertical: "auto", horizontal: "auto", verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
    ...options
  });
}

function setLanguage(editor, mode) {
  const model = editor?.getModel?.();
  if (!model) return;
  monaco.editor.setModelLanguage(model, mode === "raw" ? "plaintext" : languageId);
}

globalObject.AonMonacoEditor = Object.freeze({
  monaco,
  languageId,
  createEditor,
  setLanguage,
  version: "0.57.0"
});
