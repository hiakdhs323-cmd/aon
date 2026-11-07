(() => {
  let theme = "dark";
  try {
    theme = localStorage.getItem("aonwiki-theme-v2") === "light" ? "light" : "dark";
  } catch (_) {}
  document.documentElement.dataset.theme = theme;
  const colorMeta = document.querySelector('meta[name="theme-color"]');
  if (colorMeta) colorMeta.content = theme === "dark" ? "#111315" : "#ffffff";
})();
