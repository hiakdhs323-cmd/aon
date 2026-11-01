// Load the upstream TypeScript engine as one module so Parser and Renderer share exports.
(async () => {
  try {
    const engine = await import("https://esm.sh/gh/uiovasot/namumark.ts@main/src/index.ts?bundle");
    if (typeof engine.default !== "function" || typeof engine.Renderer !== "function") {
      throw new Error("The upstream module did not expose parse() and Renderer.");
    }
    window.AonNamuMarkEngine = { parse: engine.default, Renderer: engine.Renderer };
    window.AonNamuMarkEngineReady = true;
    window.dispatchEvent(new Event("aon-namumark-ready"));
    console.info("namumark.ts engine ready");
  } catch (error) {
    window.AonNamuMarkEngineReady = false;
    window.AonNamuMarkEngineError = error;
    console.error("namumark.ts engine failed to load; using the built-in renderer.", error);
    window.dispatchEvent(new Event("aon-namumark-error"));
  }
})();
