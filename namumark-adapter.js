// Browser adapter for uiovasot/namumark.ts.
// The upstream project is TypeScript-only, so load its source through esm.sh.
(async () => {
  try {
    const [engine, rendererModule] = await Promise.all([
      import("https://esm.sh/gh/uiovasot/namumark.ts@main/src/index.ts"),
      import("https://esm.sh/gh/uiovasot/namumark.ts@main/src/renderer.ts")
    ]);
    window.AonNamuMarkEngine = {
      parse: engine.default,
      Renderer: rendererModule.Renderer
    };
    window.dispatchEvent(new Event("aon-namumark-ready"));
  } catch (error) {
    console.error("namumark.ts engine failed to load", error);
    window.AonNamuMarkEngineError = error;
    window.dispatchEvent(new Event("aon-namumark-error"));
  }
})();
