const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("design-system.css", "utf8");
const buildWorkflow = fs.readFileSync(".github/workflows/build-renderer.yml", "utf8");
const deployWorkflow = fs.readFileSync(".github/workflows/deploy-worker.yml", "utf8");

assert.match(html, /<a class="skip-link" href="#main-content">본문으로 바로가기<\\/a>/,
  "the page must provide a keyboard-accessible skip link");
assert.match(html, /<main class="main" id="main-content" tabindex="-1">/,
  "the skip link must target the main content landmark");
assert.match(html, /design-system\\.css\\?v=20261120-editorial-shell-v1/,
  "the editorial design system must be loaded after the existing wiki skins");
assert.match(css, /\\.home-quick-nav\\s+\\.home-shortcut\\s*\\{/,
  "homepage quick actions must style the actual button markup");
assert.match(css, /min-height:\\s*68px/,
  "homepage quick actions must have comfortable touch targets");
assert.match(css, /\\.global-rail\\s*\\{/,
  "the activity rail must receive a defined layout");
assert.match(css, /@media\\s*\\(max-width:\\s*760px\\)/,
  "the layout must have a dedicated small-screen breakpoint");
assert.match(css, /@media\\s*\\(prefers-reduced-motion:\\s*reduce\\)/,
  "motion-sensitive users must receive reduced-motion styles");
assert.match(css, /html\\[data-theme="dark"\\]/,
  "the design system must define a complete dark palette");
assert.match(css, /html\\[data-theme="light"\\]/,
  "the design system must define a complete light palette");
assert.doesNotMatch(css, /@import\\s+url|fonts\\.googleapis\\.com|fonts\\.gstatic\\.com/i,
  "the design system must not add a remote font dependency");
assert.match(buildWorkflow, /design-system\\.css/,
  "the build workflow must track changes to the design system");
assert.match(buildWorkflow, /node tests\\/design-system-smoke\\.cjs/,
  "the build workflow must run the design-system regression test");
assert.match(deployWorkflow, /design-system\\.css/,
  "the Worker deployment workflow must track changes to the design system");
assert.match(deployWorkflow, /node tests\\/design-system-smoke\\.cjs/,
  "the Worker deployment workflow must run the design-system regression test");

console.log("AonWiki design system smoke test passed.");
