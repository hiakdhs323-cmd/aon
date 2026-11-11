import init, {
  parse_with_metadata,
  parse_with_options,
  parse_with_callbacks,
  parse_with_callbacks_and_options,
} from "./namumark.js";

export * from "./namumark.js";

let initialized = false;

export async function initWasm(
  path = new URL("./namumark_bg.wasm", import.meta.url),
) {
  const wasm = await init({ module_or_path: path });
  initialized = true;
  return wasm;
}

export function renderWithMetadata(text, { options, callbacks } = {}) {
  if (!initialized) {
    throw new Error("initWasm() 사용해주세용");
  }

  const result = callbacks
    ? options
      ? parse_with_callbacks_and_options(text, callbacks, options)
      : parse_with_callbacks(text, callbacks)
    : options
      ? parse_with_options(text, options)
      : parse_with_metadata(text);

  try {
    return {
      html: result.html,
      categories: result.categories,
      backlinks: result.backlinks,
      redirect_target: result.redirect_target,
      redirect_anchor: result.redirect_anchor,
    };
  } finally {
    result.free();
  }
}

export function render(text, config) {
  return renderWithMetadata(text, config).html;
}
