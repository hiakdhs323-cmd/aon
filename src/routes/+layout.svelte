<script lang="ts">
  import { page } from "$app/state";
  import legacyShell from "$lib/legacy-shell.html?raw";
  const shell = $derived(page.data.shellHtml ?? legacyShell);
  const ssrState = $derived(page.data.ssrState ?? null);
  const documentTitle = $derived(page.data.documentTitle ?? "AonWiki");
</script>
<svelte:head>
  <title>{documentTitle}</title>
  <meta name="aonwiki-ssr" content={JSON.stringify(ssrState)} />
  <link rel="stylesheet" href="/legacy/namumark.css" />
  <link rel="stylesheet" href="/legacy/style.css?v=sveltekit-1" />
  <link rel="stylesheet" href="/legacy/namumark-beta.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css" crossorigin="anonymous" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github.min.css" crossorigin="anonymous" />
  <script defer src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js" crossorigin="anonymous"></script>
  <script defer src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js" crossorigin="anonymous"></script>
  <script defer src="https://cdnjs.cloudflare.com/ajax/libs/highlightjs-line-numbers.js/2.8.0/highlightjs-line-numbers.min.js" crossorigin="anonymous"></script>
  <script defer src="/legacy/app.js"></script>
</svelte:head>
{@html shell}
