// Namu_test-main/namumark.js
var ParseResult = class _ParseResult {
  static __wrap(ptr) {
    const obj = Object.create(_ParseResult.prototype);
    obj.__wbg_ptr = ptr;
    ParseResultFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    ParseResultFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_parseresult_free(ptr, 0);
  }
  /**
   * @returns {string[]}
   */
  get backlinks() {
    const ret = wasm.parseresult_backlinks(this.__wbg_ptr);
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]);
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
  }
  /**
   * @returns {string[]}
   */
  get categories() {
    const ret = wasm.parseresult_categories(this.__wbg_ptr);
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]);
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
  }
  /**
   * @returns {string}
   */
  get html() {
    let deferred1_0;
    let deferred1_1;
    try {
      const ret = wasm.parseresult_html(this.__wbg_ptr);
      deferred1_0 = ret[0];
      deferred1_1 = ret[1];
      return getStringFromWasm0(ret[0], ret[1]);
    } finally {
      wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
  }
  /**
   * @returns {string | undefined}
   */
  get redirect_anchor() {
    const ret = wasm.parseresult_redirect_anchor(this.__wbg_ptr);
    let v1;
    if (ret[0] !== 0) {
      v1 = getStringFromWasm0(ret[0], ret[1]);
      wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    }
    return v1;
  }
  /**
   * @returns {string | undefined}
   */
  get redirect_target() {
    const ret = wasm.parseresult_redirect_target(this.__wbg_ptr);
    let v1;
    if (ret[0] !== 0) {
      v1 = getStringFromWasm0(ret[0], ret[1]);
      wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    }
    return v1;
  }
};
if (Symbol.dispose) ParseResult.prototype[Symbol.dispose] = ParseResult.prototype.free;
var RendererOptions = class {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    RendererOptionsFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_rendereroptions_free(ptr, 0);
  }
  /**
   * @returns {string | undefined}
   */
  get dark_class() {
    const ret = wasm.__wbg_get_rendereroptions_dark_class(this.__wbg_ptr);
    let v1;
    if (ret[0] !== 0) {
      v1 = getStringFromWasm0(ret[0], ret[1]);
      wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    }
    return v1;
  }
  /**
   * @returns {string | undefined}
   */
  get document_query_prefix() {
    const ret = wasm.__wbg_get_rendereroptions_document_query_prefix(this.__wbg_ptr);
    let v1;
    if (ret[0] !== 0) {
      v1 = getStringFromWasm0(ret[0], ret[1]);
      wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    }
    return v1;
  }
  /**
   * Also derives the `?doc=` route unless `document_query_prefix` is given.
   * @returns {string | undefined}
   */
  get document_url_prefix() {
    const ret = wasm.__wbg_get_rendereroptions_document_url_prefix(this.__wbg_ptr);
    let v1;
    if (ret[0] !== 0) {
      v1 = getStringFromWasm0(ret[0], ret[1]);
      wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    }
    return v1;
  }
  /**
   * @returns {string | undefined}
   */
  get html_redirect_prefix() {
    const ret = wasm.__wbg_get_rendereroptions_html_redirect_prefix(this.__wbg_ptr);
    let v1;
    if (ret[0] !== 0) {
      v1 = getStringFromWasm0(ret[0], ret[1]);
      wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    }
    return v1;
  }
  /**
   * @param {string} filename
   * @param {string[]} domains
   */
  add_external_image_link_rule(filename, domains) {
    let ptr0, len0, ptr1, len1;
    try {
      ptr0 = passStringToWasm0(filename, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      len0 = WASM_VECTOR_LEN;
      ptr1 = passArrayJsValueToWasm0(domains, wasm.__wbindgen_malloc);
      len1 = WASM_VECTOR_LEN;
    } catch (e) {
      if (ptr1) {
        wasm.__externref_drop_slice(ptr1, len1);
        wasm.__wbindgen_free(ptr1, len1 * 4, 4);
      }
      if (ptr0) {
        wasm.__wbindgen_free(ptr0, len0 * 1, 1);
      }
      throw e;
    }
    wasm.rendereroptions_add_external_image_link_rule(this.__wbg_ptr, ptr0, len0, ptr1, len1);
  }
  /**
   * Replace the default file/domain registration policy.
   */
  clear_external_image_link_rules() {
    wasm.rendereroptions_clear_external_image_link_rules(this.__wbg_ptr);
  }
  constructor() {
    const ret = wasm.rendereroptions_new();
    this.__wbg_ptr = ret;
    RendererOptionsFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  /**
   * @param {string | null} [arg0]
   */
  set dark_class(arg0) {
    var ptr0 = isLikeNone(arg0) ? 0 : passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.__wbg_set_rendereroptions_dark_class(this.__wbg_ptr, ptr0, len0);
  }
  /**
   * @param {string | null} [arg0]
   */
  set document_query_prefix(arg0) {
    var ptr0 = isLikeNone(arg0) ? 0 : passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.__wbg_set_rendereroptions_document_query_prefix(this.__wbg_ptr, ptr0, len0);
  }
  /**
   * Also derives the `?doc=` route unless `document_query_prefix` is given.
   * @param {string | null} [arg0]
   */
  set document_url_prefix(arg0) {
    var ptr0 = isLikeNone(arg0) ? 0 : passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.__wbg_set_rendereroptions_document_url_prefix(this.__wbg_ptr, ptr0, len0);
  }
  /**
   * @param {string | null} [arg0]
   */
  set html_redirect_prefix(arg0) {
    var ptr0 = isLikeNone(arg0) ? 0 : passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.__wbg_set_rendereroptions_html_redirect_prefix(this.__wbg_ptr, ptr0, len0);
  }
};
if (Symbol.dispose) RendererOptions.prototype[Symbol.dispose] = RendererOptions.prototype.free;
function parse_with_callbacks_and_options(input, callbacks, options) {
  _assertClass(options, RendererOptions);
  const ptr0 = passStringToWasm0(input, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.parse_with_callbacks_and_options(ptr0, len0, callbacks, options.__wbg_ptr);
  return ParseResult.__wrap(ret);
}
function __wbg_get_imports() {
  const import0 = {
    __proto__: null,
    __wbg___wbindgen_is_function_741ff2bb612836f5: function(arg0) {
      const ret = typeof arg0 === "function";
      return ret;
    },
    __wbg___wbindgen_is_null_c22311b1cc228e3a: function(arg0) {
      const ret = arg0 === null;
      return ret;
    },
    __wbg___wbindgen_is_undefined_be5b34249ff1fc15: function(arg0) {
      const ret = arg0 === void 0;
      return ret;
    },
    __wbg___wbindgen_number_get_934b640d0889af78: function(arg0, arg1) {
      const obj = arg1;
      const ret = typeof obj === "number" ? obj : void 0;
      getDataViewMemory0().setFloat64((arg0 >>> 0) + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
      getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, !isLikeNone(ret), true);
    },
    __wbg___wbindgen_string_get_7ce8eee7fd327545: function(arg0, arg1) {
      const obj = arg1;
      const ret = typeof obj === "string" ? obj : void 0;
      var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      var len1 = WASM_VECTOR_LEN;
      getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 1, len1, true);
      getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, ptr1, true);
    },
    __wbg___wbindgen_throw_4c88d8bf264fd984: function(arg0, arg1) {
      throw new Error(getStringFromWasm0(arg0, arg1));
    },
    __wbg_apply_bfe2b07b146427e2: function() {
      return handleError(function(arg0, arg1, arg2) {
        const ret = arg0.apply(arg1, arg2);
        return ret;
      }, arguments);
    },
    __wbg_documentExists_abd6191fda4494e9: function(arg0, arg1, arg2) {
      const ret = arg0.documentExists(getStringFromWasm0(arg1, arg2));
      return ret;
    },
    __wbg_getDocumentContent_2569c79087121cbd: function(arg0, arg1, arg2, arg3) {
      const ret = arg0.getDocumentContent(getStringFromWasm0(arg1, arg2), arg3);
      return ret;
    },
    __wbg_getPagecount_3a30bb25fe48432e: function(arg0, arg1) {
      const ret = arg0.getPagecount(arg1);
      return ret;
    },
    __wbg_get_2080c49015e35254: function() {
      return handleError(function(arg0, arg1) {
        const ret = Reflect.get(arg0, arg1);
        return ret;
      }, arguments);
    },
    __wbg_new_37eb45aaf5eeb820: function() {
      const ret = new Array();
      return ret;
    },
    __wbg_new_cd4348290afae586: function() {
      const ret = new Object();
      return ret;
    },
    __wbg_now_463ac581d2fc7ea3: function() {
      const ret = Date.now();
      return ret;
    },
    __wbg_push_c9f4893fc209f768: function(arg0, arg1) {
      const ret = arg0.push(arg1);
      return ret;
    },
    __wbg_set_2793479888329cb6: function() {
      return handleError(function(arg0, arg1, arg2) {
        const ret = Reflect.set(arg0, arg1, arg2);
        return ret;
      }, arguments);
    },
    __wbindgen_generic_0000000000000001: function(arg0, arg1) {
      const ret = getStringFromWasm0(arg0, arg1);
      return ret;
    },
    __wbindgen_init_externref_table: function() {
      const table = wasm.__wbindgen_externrefs;
      table.set(0, void 0);
      table.set(1024, void 0);
      table.set(1025, null);
      table.set(1026, true);
      table.set(1027, false);
    }
  };
  return {
    __proto__: null,
    "./namumark_bg.js": import0
  };
}
var ParseResultFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((ptr) => wasm.__wbg_parseresult_free(ptr, 1));
var RendererOptionsFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((ptr) => wasm.__wbg_rendereroptions_free(ptr, 1));
function addToExternrefTable0(obj) {
  const idx = wasm.__externref_table_alloc();
  wasm.__wbindgen_externrefs.set(idx, obj);
  return idx;
}
function _assertClass(instance, klass) {
  if (!(instance instanceof klass)) {
    throw new Error(`expected instance of ${klass.name}`);
  }
}
function getArrayJsValueFromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  const mem = getDataViewMemory0();
  const result = [];
  for (let i = ptr; i < ptr + 4 * len; i += 4) {
    result.push(wasm.__wbindgen_externrefs.get(mem.getUint32(i, true)));
  }
  wasm.__externref_drop_slice(ptr, len);
  return result;
}
var cachedDataViewMemory0 = null;
function getDataViewMemory0() {
  if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || cachedDataViewMemory0.buffer.detached === void 0 && cachedDataViewMemory0.buffer !== wasm.memory.buffer) {
    cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
  }
  return cachedDataViewMemory0;
}
function getStringFromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return decodeText(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}
var cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
  if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}
function handleError(f, args) {
  try {
    return f.apply(this, args);
  } catch (e) {
    const idx = addToExternrefTable0(e);
    wasm.__wbindgen_exn_store(idx);
  }
}
function isLikeNone(x) {
  return x === void 0 || x === null;
}
function passArrayJsValueToWasm0(array, malloc) {
  const ptr = malloc(array.length * 4, 4) >>> 0;
  for (let i = 0; i < array.length; i++) {
    const add = addToExternrefTable0(array[i]);
    getDataViewMemory0().setUint32(ptr + 4 * i, add, true);
  }
  WASM_VECTOR_LEN = array.length;
  return ptr;
}
function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === void 0) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr2 = malloc(buf.length, 1) >>> 0;
    getUint8ArrayMemory0().subarray(ptr2, ptr2 + buf.length).set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr2;
  }
  let len = arg.length;
  let ptr = malloc(len, 1) >>> 0;
  const mem = getUint8ArrayMemory0();
  let offset = 0;
  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset);
    if (code > 127) break;
    mem[ptr + offset] = code;
  }
  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset);
    }
    ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
    const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
    const ret = cachedTextEncoder.encodeInto(arg, view);
    offset += ret.written;
    ptr = realloc(ptr, len, offset, 1) >>> 0;
  }
  WASM_VECTOR_LEN = offset;
  return ptr;
}
var cachedTextDecoder = new TextDecoder("utf-8", { ignoreBOM: true });
cachedTextDecoder.decode();
var MAX_SAFARI_DECODE_BYTES = 2146435072;
var numBytesDecoded = 0;
function decodeText(bytes) {
  numBytesDecoded += bytes.length;
  if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
    cachedTextDecoder = new TextDecoder("utf-8", { ignoreBOM: true });
    cachedTextDecoder.decode();
    numBytesDecoded = bytes.length;
  }
  return cachedTextDecoder.decode(bytes);
}
var cachedTextEncoder = new TextEncoder();
if (!("encodeInto" in cachedTextEncoder)) {
  cachedTextEncoder.encodeInto = function(arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
      read: arg.length,
      written: buf.length
    };
  };
}
var WASM_VECTOR_LEN = 0;
var wasmModule;
var wasmInstance;
var wasm;
function __wbg_finalize_init(instance, module) {
  wasmInstance = instance;
  wasm = instance.exports;
  wasmModule = module;
  cachedDataViewMemory0 = null;
  cachedUint8ArrayMemory0 = null;
  wasm.__wbindgen_start();
  return wasm;
}
async function __wbg_load(module, imports) {
  if (typeof Response === "function" && module instanceof Response) {
    if (!module.ok) {
      throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
    }
    if (typeof WebAssembly.instantiateStreaming === "function") {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (e) {
        const validResponse = expectedResponseType(module.type);
        if (validResponse && module.headers.get("Content-Type") !== "application/wasm") {
          console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
        } else {
          throw e;
        }
      }
    }
    const bytes = await module.arrayBuffer();
    return await WebAssembly.instantiate(bytes, imports);
  } else {
    const instance = await WebAssembly.instantiate(module, imports);
    if (instance instanceof WebAssembly.Instance) {
      return { instance, module };
    } else {
      return instance;
    }
  }
  function expectedResponseType(type) {
    switch (type) {
      case "basic":
      case "cors":
      case "default":
        return true;
    }
    return false;
  }
}
var __wbg_init_promise;
async function __wbg_init(module_or_path) {
  if (wasm !== void 0) return wasm;
  if (__wbg_init_promise === void 0) {
    __wbg_init_promise = __wbg_init_once(module_or_path);
    __wbg_init_promise.catch(() => {
      __wbg_init_promise = void 0;
    });
  }
  return __wbg_init_promise;
}
async function __wbg_init_once(module_or_path) {
  if (module_or_path !== void 0) {
    if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
      ({ module_or_path } = module_or_path);
    } else {
      console.warn("using deprecated parameters for the initialization function; pass a single object instead");
    }
  }
  if (module_or_path === void 0) {
    module_or_path = new URL("namumark_bg.wasm", import.meta.url);
  }
  const imports = __wbg_get_imports();
  if (typeof module_or_path === "string" || typeof Request === "function" && module_or_path instanceof Request || typeof URL === "function" && module_or_path instanceof URL) {
    module_or_path = fetch(module_or_path);
  }
  const { instance, module } = await __wbg_load(await module_or_path, imports);
  return __wbg_finalize_init(instance, module);
}

// worker/src/index.js
import AON_NAMU_WASM_MODULE from "../../Namu_test-main/namumark_bg.wasm";
var aonNamuWasmPromise = null;
async function ensureAonNamuWasm() {
  if (!aonNamuWasmPromise) {
    aonNamuWasmPromise = __wbg_init({ module_or_path: AON_NAMU_WASM_MODULE }).catch((error) => {
      aonNamuWasmPromise = null;
      throw error;
    });
  }
  return aonNamuWasmPromise;
}
function response(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers }
  });
}
function getSecurityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), usb=(), xr-spatial-tracking=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Origin-Agent-Cluster": "?1",
    "X-Permitted-Cross-Domain-Policies": "none",
    "X-DNS-Prefetch-Control": "off",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
  };
}
function getCors(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGIN || "https://hiakdhs323-cmd.github.io").split(",").map((v) => v.trim()).filter(Boolean);
  const trustedOrigin = origin && allowed.includes(origin) ? origin : allowed[0] || "";
  return {
    ...getSecurityHeaders(),
    ...trustedOrigin ? { "Access-Control-Allow-Origin": trustedOrigin } : {},
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-AonWiki-Admin-Token,X-Admin-Bootstrap-Secret,X-AonWiki-Request",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
function isStateChangingMethod(method) {
  return !["GET", "HEAD", "OPTIONS"].includes(String(method || "").toUpperCase());
}
function isTrustedStateChangingRequest(request, env) {
  if (!isStateChangingMethod(request.method)) return true;
  if (request.headers.get("X-AonWiki-Request") !== "1") return false;
  const origin = request.headers.get("Origin");
  if (origin) {
    const allowed = (env.ALLOWED_ORIGIN || "").split(",").map((v) => v.trim()).filter(Boolean);
    const sameOrigin = (() => {
      try {
        return origin === new URL(request.url).origin;
      } catch {
        return false;
      }
    })();
    if (!sameOrigin && !allowed.includes(origin)) return false;
  }
  return true;
}
async function readJsonBody(request, maxBytes = 512 * 1024) {
  const contentType = String(request.headers.get("Content-Type") || "").toLowerCase().split(";")[0].trim();
  if (contentType !== "application/json" && !contentType.endsWith("+json")) {
    const error = new Error("JSON \uC694\uCCAD\uC740 application/json \uD615\uC2DD\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.");
    error.status = 415;
    throw error;
  }
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > maxBytes) {
    const error = new Error("JSON \uC694\uCCAD \uBCF8\uBB38\uC774 \uB108\uBB34 \uD07D\uB2C8\uB2E4.");
    error.status = 413;
    throw error;
  }
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      const error = new Error("\uC62C\uBC14\uB978 JSON \uAC1D\uCCB4\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.");
      error.status = 400;
      throw error;
    }
    return parsed;
  } catch (error) {
    if (error?.status) throw error;
    const invalid = new Error("\uC62C\uBC14\uB978 JSON \uC694\uCCAD\uC774 \uC544\uB2D9\uB2C8\uB2E4.");
    invalid.status = 400;
    throw invalid;
  }
}
function cleanTitle(value) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 120);
}
function namuFileHash(data) {
  let hash = 2166136261;
  for (let i = 0; i < data.length; i++) {
    hash ^= data.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const parts = [];
  for (let i = 0; i < 7; i++) {
    const value = Math.imul(hash ^ 2654435769 * (i + 1), 2246822507);
    parts.push((value >>> 0).toString(16).padStart(8, "0"));
  }
  return parts.join("").slice(0, 56);
}
var authRateLimitSchemaPromise = null;
var adminTokenSchemaPromise = null;
var wikiAdminSchemaPromise = null;
async function ensureAuthRateLimitSchema(env) {
  if (!authRateLimitSchemaPromise) {
    authRateLimitSchemaPromise = env.DB.prepare("CREATE TABLE IF NOT EXISTS auth_rate_limits (ip TEXT NOT NULL, action TEXT NOT NULL, attempts INTEGER NOT NULL, window_started_at TEXT NOT NULL, PRIMARY KEY(ip, action))").run().catch((error) => {
      authRateLimitSchemaPromise = null;
      throw error;
    });
  }
  await authRateLimitSchemaPromise;
}
async function authRateLimited(request, env, action, limit, windowMs) {
  await ensureAuthRateLimitSchema(env);
  const ip = String(request.headers.get("CF-Connecting-IP") || "unknown").slice(0, 64);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const row = await env.DB.prepare("SELECT attempts, window_started_at FROM auth_rate_limits WHERE ip = ? AND action = ?").bind(ip, action).first();
  const age = row ? Date.now() - Date.parse(row.window_started_at) : Infinity;
  if (row && age >= 0 && age < windowMs && Number(row.attempts) >= limit) return true;
  if (!row || age < 0 || age >= windowMs) {
    await env.DB.prepare("INSERT INTO auth_rate_limits (ip, action, attempts, window_started_at) VALUES (?, ?, 1, ?) ON CONFLICT(ip, action) DO UPDATE SET attempts = 1, window_started_at = excluded.window_started_at").bind(ip, action, now).run();
  } else {
    await env.DB.prepare("UPDATE auth_rate_limits SET attempts = attempts + 1 WHERE ip = ? AND action = ?").bind(ip, action).run();
  }
  return false;
}
async function ensureAdminTokenTable(env) {
  if (!adminTokenSchemaPromise) {
    adminTokenSchemaPromise = (async () => {
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS admin_tokens (id TEXT PRIMARY KEY NOT NULL, token_hash TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS admin_auth_attempts (ip TEXT PRIMARY KEY NOT NULL, attempts INTEGER NOT NULL, window_started_at TEXT NOT NULL)").run();
    })().catch((error) => {
      adminTokenSchemaPromise = null;
      throw error;
    });
  }
  await adminTokenSchemaPromise;
}
async function ensureWikiAdminSchema(env) {
  if (!wikiAdminSchemaPromise) {
    wikiAdminSchemaPromise = env.DB.prepare("CREATE TABLE IF NOT EXISTS wiki_admins (user_id TEXT PRIMARY KEY NOT NULL, granted_at TEXT NOT NULL, granted_by TEXT NOT NULL)").run().catch((error) => {
      wikiAdminSchemaPromise = null;
      throw error;
    });
  }
  await wikiAdminSchemaPromise;
}
function constantTimeEqual(left, right) {
  const a = String(left || ""), b = String(right || "");
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return difference === 0;
}
async function isAdminRequest(request, env) {
  const authorization = request.headers.get("X-AonWiki-Admin-Token") || "";
  if (!authorization) return false;
  await ensureAdminTokenTable(env);
  const ip = String(request.headers.get("CF-Connecting-IP") || "unknown").slice(0, 64);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const rate = await env.DB.prepare("SELECT attempts, window_started_at FROM admin_auth_attempts WHERE ip = ?").bind(ip).first();
  const windowAge = rate ? Date.now() - Date.parse(rate.window_started_at) : Infinity;
  if (rate && windowAge >= 0 && windowAge < 15 * 60 * 1e3 && Number(rate.attempts) >= 10) return false;
  const presented = authorization;
  const saved = await env.DB.prepare("SELECT token_hash FROM admin_tokens WHERE id = 'primary'").first();
  let valid = false;
  if (saved) {
    valid = constantTimeEqual(await sha256(presented), saved.token_hash);
  } else if (env.ADMIN_TOKEN) {
    valid = constantTimeEqual(presented, env.ADMIN_TOKEN);
  }
  if (valid) {
    if (!saved) {
      await env.DB.prepare("INSERT INTO admin_tokens (id, token_hash, updated_at) VALUES ('primary', ?, ?) ON CONFLICT(id) DO NOTHING").bind(await sha256(presented), now).run();
      const confirmed = await env.DB.prepare("SELECT token_hash FROM admin_tokens WHERE id = 'primary'").first();
      valid = Boolean(confirmed && constantTimeEqual(await sha256(presented), confirmed.token_hash));
    }
    if (valid) {
      await env.DB.prepare("DELETE FROM admin_auth_attempts WHERE ip = ?").bind(ip).run();
      return true;
    }
  }
  if (!rate || windowAge < 0 || windowAge >= 15 * 60 * 1e3) {
    await env.DB.prepare("INSERT INTO admin_auth_attempts (ip, attempts, window_started_at) VALUES (?, 1, ?) ON CONFLICT(ip) DO UPDATE SET attempts = 1, window_started_at = excluded.window_started_at").bind(ip, now).run();
  } else {
    await env.DB.prepare("UPDATE admin_auth_attempts SET attempts = attempts + 1 WHERE ip = ?").bind(ip).run();
  }
  return false;
}
var SESSION_COOKIE_NAME = "__Host-aon_session";
var SESSION_IDLE_TIMEOUT_MS = 5 * 60 * 1e3;
var SESSION_ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1e3;
function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return "";
}
function makeSessionCookie(token, request) {
  let sameSite = "Lax";
  const origin = request.headers.get("Origin") || "";
  if (origin) {
    try {
      if (origin !== new URL(request.url).origin) sameSite = "None";
    } catch {
    }
  }
  return SESSION_COOKIE_NAME + "=" + token + "; Path=/; Secure; HttpOnly; SameSite=" + sameSite;
}
function clearSessionCookie() {
  return SESSION_COOKIE_NAME + "=; Path=/; Secure; HttpOnly; SameSite=None; Max-Age=0";
}
async function createUserSession(env, userId) {
  await ensureUserSchema(env);
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const idleExpiresAt = new Date(nowMs + SESSION_IDLE_TIMEOUT_MS).toISOString();
  const absoluteExpiresAt = new Date(nowMs + SESSION_ABSOLUTE_TIMEOUT_MS).toISOString();
  const token = [...crypto.getRandomValues(new Uint8Array(32))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ? OR absolute_expires_at <= ?").bind(now, now).run();
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at, absolute_expires_at) VALUES (?, ?, ?, ?)").bind(await sha256(token), userId, idleExpiresAt, absoluteExpiresAt).run();
  return { token, expiresAt: idleExpiresAt, absoluteExpiresAt };
}
async function refreshSessionIdleTimeout(request, env) {
  const token = readCookie(request, SESSION_COOKIE_NAME);
  if (!/^[a-f0-9]{64}$/i.test(token)) return;
  await ensureUserSchema(env);
  const tokenHash = await sha256(token);
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const session = await env.DB.prepare("SELECT expires_at, absolute_expires_at FROM sessions WHERE token_hash = ?").bind(tokenHash).first();
  if (!session) return;
  const expiresAt = Date.parse(session.expires_at);
  const absoluteExpiresAt = Date.parse(session.absolute_expires_at);
  if (!Number.isFinite(expiresAt) || !Number.isFinite(absoluteExpiresAt) || expiresAt <= nowMs || absoluteExpiresAt <= nowMs) return;
  const nextExpiresAt = new Date(Math.min(nowMs + SESSION_IDLE_TIMEOUT_MS, absoluteExpiresAt)).toISOString();
  await env.DB.prepare("UPDATE sessions SET expires_at = ? WHERE token_hash = ? AND expires_at > ? AND absolute_expires_at > ?").bind(nextExpiresAt, tokenHash, now, now).run();
}
async function getSessionUser(request, env, includePasswordFields = false) {
  const token = readCookie(request, SESSION_COOKIE_NAME);
  if (!/^[a-f0-9]{64}$/i.test(token)) return null;
  await ensureUserSchema(env);
  const tokenHash = await sha256(token);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const userFields = includePasswordFields ? "users.id, users.username, users.salt, users.password_hash, users.password_iterations" : "users.id, users.username";
  const user = await env.DB.prepare(
    "SELECT " + userFields + ", sessions.expires_at, sessions.absolute_expires_at FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND sessions.absolute_expires_at > ?"
  ).bind(tokenHash, now, now).first();
  if (!user) return null;
  return { ...user, tokenHash };
}
async function currentUser(request, env) {
  const user = await getSessionUser(request, env);
  if (user) {
    await ensureWikiAdminSchema(env);
    const admin = await env.DB.prepare("SELECT user_id FROM wiki_admins WHERE user_id = ?").bind(user.id).first();
    return { username: user.username, role: admin ? "admin" : "user", isAdmin: Boolean(admin) };
  }
  if (await isAdminRequest(request, env)) return { username: "\uC704\uD0A4 \uAD00\uB9AC\uC790", role: "admin", isAdmin: true };
  return null;
}
function anonymousEditorIdentity(request) {
  const raw = String(request.headers.get("CF-Connecting-IP") || "").trim().toLowerCase();
  const ipv4 = raw.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  const validIPv4 = Boolean(ipv4 && ipv4.slice(1).every((part) => Number(part) >= 0 && Number(part) <= 255));
  const validIPv6 = raw.includes(":") && raw.length <= 45 && /^(?:[0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i.test(raw);
  const ip = validIPv4 || validIPv6 ? raw : "";
  return {
    username: ip ? "IP " + ip : "IP \uC54C \uC218 \uC5C6\uC74C",
    ip,
    role: "anonymous",
    isAdmin: false,
    isAnonymous: true
  };
}
var pageProtectionSchemaPromise = null;
var officialDocumentSchemaPromise = null;
var pageAliasSchemaPromise = null;
var pageLinkColorsSchemaPromise = null;
var imageSchemaPromise = null;
async function ensurePageProtectionSchema(env) {
  if (!pageProtectionSchemaPromise) {
    pageProtectionSchemaPromise = env.DB.prepare("CREATE TABLE IF NOT EXISTS page_protections (title TEXT PRIMARY KEY NOT NULL, level TEXT NOT NULL CHECK(level IN ('registered','admin')), reason TEXT NOT NULL DEFAULT '', protected_by TEXT NOT NULL, updated_at TEXT NOT NULL)").run().catch((error) => {
      pageProtectionSchemaPromise = null;
      throw error;
    });
  }
  await pageProtectionSchemaPromise;
}
async function ensureOfficialDocumentSchema(env) {
  if (!officialDocumentSchemaPromise) {
    officialDocumentSchemaPromise = env.DB.prepare("CREATE TABLE IF NOT EXISTS official_documents (title TEXT PRIMARY KEY NOT NULL, marked_by TEXT NOT NULL, updated_at TEXT NOT NULL)").run().catch((error) => {
      officialDocumentSchemaPromise = null;
      throw error;
    });
  }
  await officialDocumentSchemaPromise;
}
async function checkPageEditPermission(env, user, title, protectionTitle = title) {
  if (!user) return { status: 401, error: "\uBB38\uC11C\uB97C \uD3B8\uC9D1\uD558\uB824\uBA74 \uB85C\uADF8\uC778\uD558\uC138\uC694." };
  if ((title === "\uB300\uBB38" || protectionTitle === "\uB300\uBB38") && !user.isAdmin) return { status: 403, error: "\uB300\uBB38\uC740 \uC704\uD0A4 \uAD00\uB9AC\uC790\uB9CC \uD3B8\uC9D1\uD558\uAC70\uB098 \uBCF5\uC6D0\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." };
  await ensurePageProtectionSchema(env);
  const protection = await env.DB.prepare("SELECT level FROM page_protections WHERE title = ?").bind(protectionTitle).first();
  if (protection?.level === "admin" && !user.isAdmin) {
    return { status: 403, error: "\uC774 \uBB38\uC11C\uB294 \uAD00\uB9AC\uC790\uB9CC \uD3B8\uC9D1\uD558\uAC70\uB098 \uBCF5\uC6D0\uD560 \uC218 \uC788\uB3C4\uB85D \uBCF4\uD638\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4." };
  }
  if (protection?.level === "registered" && !user.isAdmin && user.role !== "user") {
    return { status: 403, error: "\uC774 \uBB38\uC11C\uB294 \uB85C\uADF8\uC778\uD55C \uD68C\uC6D0\uB9CC \uD3B8\uC9D1\uD558\uAC70\uB098 \uBCF5\uC6D0\uD560 \uC218 \uC788\uB3C4\uB85D \uBCF4\uD638\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4." };
  }
  return null;
}
async function ensurePageAliasSchema(env) {
  if (!pageAliasSchemaPromise) {
    pageAliasSchemaPromise = (async () => {
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS page_aliases (alias TEXT PRIMARY KEY COLLATE NOCASE, title TEXT NOT NULL, created_at TEXT NOT NULL)").run();
      await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_page_aliases_title ON page_aliases(title)").run();
    })().catch((error) => {
      pageAliasSchemaPromise = null;
      throw error;
    });
  }
  await pageAliasSchemaPromise;
}
async function ensurePageLinkColorsSchema(env) {
  if (!pageLinkColorsSchemaPromise) {
    pageLinkColorsSchemaPromise = env.DB.prepare("CREATE TABLE IF NOT EXISTS page_link_colors (title TEXT PRIMARY KEY NOT NULL, config_json TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL DEFAULT '')").run().catch((error) => {
      pageLinkColorsSchemaPromise = null;
      throw error;
    });
  }
  await pageLinkColorsSchemaPromise;
}
async function ensureImageSchema(env) {
  if (!imageSchemaPromise) {
    imageSchemaPromise = (async () => {
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY NOT NULL, content_type TEXT NOT NULL, data_base64 TEXT NOT NULL, filename TEXT NOT NULL, created_at TEXT NOT NULL, owner TEXT NOT NULL DEFAULT '')").run();
      const columns = await env.DB.prepare("PRAGMA table_info(images)").all();
      if (!(columns.results || []).some((column) => column.name === "owner")) {
        await env.DB.prepare("ALTER TABLE images ADD COLUMN owner TEXT NOT NULL DEFAULT ''").run();
      }
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS image_aliases (alias TEXT PRIMARY KEY COLLATE NOCASE, image_id TEXT NOT NULL, created_at TEXT NOT NULL)").run();
    })().catch((error) => {
      imageSchemaPromise = null;
      throw error;
    });
  }
  await imageSchemaPromise;
}
var discussionSchemaPromise = null;
async function ensureDiscussionSchema(env) {
  if (!discussionSchemaPromise) {
    discussionSchemaPromise = (async () => {
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS discussions (id INTEGER PRIMARY KEY AUTOINCREMENT, page_title TEXT NOT NULL DEFAULT '', title TEXT NOT NULL, body TEXT NOT NULL, author TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_post_at TEXT NOT NULL, reply_count INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')), deleted_at TEXT NOT NULL DEFAULT '', deleted_by TEXT NOT NULL DEFAULT '')").run();
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS discussion_posts (id INTEGER PRIMARY KEY AUTOINCREMENT, discussion_id INTEGER NOT NULL, body TEXT NOT NULL, author TEXT NOT NULL, created_at TEXT NOT NULL, edited_at TEXT NOT NULL DEFAULT '', is_deleted INTEGER NOT NULL DEFAULT 0, FOREIGN KEY(discussion_id) REFERENCES discussions(id))").run();
      await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_discussions_last_post ON discussions(deleted_at, last_post_at DESC)").run();
      await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_discussions_page_title ON discussions(page_title, deleted_at, last_post_at DESC)").run();
      await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_discussion_posts_topic ON discussion_posts(discussion_id, id)").run();
    })().catch((error) => {
      discussionSchemaPromise = null;
      throw error;
    });
  }
  await discussionSchemaPromise;
}
var editRequestSchemaPromise = null;
async function ensureEditRequestSchema(env) {
  if (!editRequestSchemaPromise) {
    editRequestSchemaPromise = env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS edit_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, page_title TEXT NOT NULL, requester TEXT NOT NULL, proposed_content TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '', base_updated_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected')), created_at TEXT NOT NULL, reviewed_by TEXT NOT NULL DEFAULT '', reviewed_at TEXT NOT NULL DEFAULT '')"
    ).run().catch((error) => {
      editRequestSchemaPromise = null;
      throw error;
    });
  }
  await editRequestSchemaPromise;
}
function cleanImageName(value, contentType) {
  const extension = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp", "image/svg+xml": "svg" }[contentType] || "img";
  let name = String(value || "").normalize("NFC").replace(/[\\/:*?"<>|]/g, "_").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  name = name.replace(/\.[^.]*$/, "").replace(/[. ]+$/g, "").slice(0, 100);
  if (!name) name = "image";
  return name + "." + extension;
}
function validateSvgUpload(text) {
  const svg = String(text || "").trim();
  if (!svg || svg.length > 1024 * 1024) throw new Error("SVG \uD30C\uC77C\uC740 1MB \uC774\uD558\uB9CC \uC9C0\uC6D0\uD569\uB2C8\uB2E4.");
  if (!/^<svg(?:\s|>)/i.test(svg.replace(/^<\?xml[^>]*>\s*/i, ""))) throw new Error("\uC62C\uBC14\uB978 SVG \uD30C\uC77C\uC774 \uC544\uB2D9\uB2C8\uB2E4.");
  if (/<!DOCTYPE|<!ENTITY|<\s*(?:script|foreignObject|iframe|object|embed|audio|video|use)\b|\bon[a-z]+\s*=|javascript\s*:|data\s*:\s*text\/html|url\s*\(\s*['"]?\s*(?:https?:|\/\/|javascript:)|\b(?:href|xlink:href)\s*=\s*['"]\s*(?:https?:|\/\/|javascript:|data:)/i.test(svg)) {
    throw new Error("\uBCF4\uC548\uC0C1 \uC2A4\uD06C\uB9BD\uD2B8, \uC678\uBD80 \uB9AC\uC18C\uC2A4 \uB610\uB294 \uC2E4\uD589 \uAC00\uB2A5\uD55C \uC694\uC18C\uAC00 \uD3EC\uD568\uB41C SVG\uB294 \uC5C5\uB85C\uB4DC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
  }
  if (!/<\/svg\s*>\s*$/i.test(svg)) throw new Error("SVG \uBB38\uC11C\uAC00 \uC62C\uBC14\uB974\uAC8C \uB2EB\uD600 \uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
  return svg;
}
function hasValidRasterImageSignature(bytes, contentType) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (contentType === "image/png") {
    return data.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => data[index] === value);
  }
  if (contentType === "image/jpeg") return data.length >= 3 && data[0] === 255 && data[1] === 216 && data[2] === 255;
  if (contentType === "image/gif") {
    const header = new TextDecoder().decode(data.subarray(0, 6));
    return header === "GIF87a" || header === "GIF89a";
  }
  if (contentType === "image/webp") {
    return data.length >= 12 && new TextDecoder().decode(data.subarray(0, 4)) === "RIFF" && new TextDecoder().decode(data.subarray(8, 12)) === "WEBP";
  }
  return false;
}
function makeAdminToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function imageFileHash(value) {
  let hash = 2166136261;
  const input = String(value || "");
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const parts = [];
  for (let i = 0; i < 7; i++) {
    const mixed = Math.imul(hash ^ 2654435769 * (i + 1), 2246822507);
    parts.push((mixed >>> 0).toString(16).padStart(8, "0"));
  }
  return parts.join("").slice(0, 56);
}
function imageNameMatches(filename, hash, extension) {
  const value = String(filename || "");
  const dot = value.lastIndexOf(".");
  const base = dot > 0 ? value.slice(0, dot) : value;
  const ext = dot > 0 ? value.slice(dot + 1).toLowerCase() : "jpg";
  return imageFileHash(base).toLowerCase() === String(hash || "").toLowerCase() && ext === String(extension || "").toLowerCase();
}
function mediaAssetPath(id) {
  const key = String(id || "").trim();
  return "/media/" + encodeURIComponent(key) + "?aonwiki_image=" + encodeURIComponent(key);
}
var SERVER_WIKI_TAGS = new Set("A ABBR B BDI BDO BLOCKQUOTE BR CAPTION CENTER CODE COL COLGROUP DD DEL DETAILS DIV DL DT EM FIGCAPTION FIGURE FONT FOOTNOTE_TITLE H1 H2 H3 H4 H5 H6 HR I IFRAME IMG INS KBD LI MARK OL P PRE Q RUBY RT RP S SAMP SMALL SPAN STRIKE STRONG STYLE SUB SUMMARY SUP TABLE TBODY TD TFOOT TH THEAD TR TT U UL VAR VIDEO AUDIO SOURCE".split(" "));
var SERVER_WIKI_ATTRS = new Set("alt allow allowfullscreen class colspan data-namumark-action fn_target frameborder height href id lang loading open poster referrerpolicy rel rowspan src start style target title type width align valign controls loop muted".split(" "));
function sanitizeServerWikiStyle(raw) {
  const allowed = /* @__PURE__ */ new Set(["color", "background", "background-color", "font-size", "font-weight", "font-style", "text-align", "text-decoration", "text-transform", "line-height", "letter-spacing", "word-spacing", "width", "max-width", "min-width", "height", "max-height", "min-height", "margin", "margin-left", "margin-right", "margin-top", "margin-bottom", "padding", "border", "border-top", "border-right", "border-bottom", "border-left", "border-color", "border-top-color", "border-right-color", "border-bottom-color", "border-left-color", "border-width", "border-top-width", "border-right-width", "border-bottom-width", "border-left-width", "border-style", "border-top-style", "border-right-style", "border-bottom-style", "border-left-style", "border-radius", "border-collapse", "float", "clear", "display", "vertical-align", "white-space", "list-style-type", "image-rendering", "object-fit", "overflow", "overflow-wrap", "box-shadow", "opacity"]);
  const themeVariable = /^--aonwiki-table-(?:(?:bg|fg|border)-(?:light|dark)|auto-fg-(?:light|dark))$/;
  const safeColor = /^(?:#[0-9a-f]{3,8}|[a-z]{1,24}|(?:rgba?|hsla?)\([\d.%+\-/ ,]+\))$/i;
  const output = [];
  String(raw || "").split(";").forEach((entry) => {
    const at = entry.indexOf(":");
    if (at < 1) return;
    const rawKey = entry.slice(0, at).trim().toLowerCase();
    const key = rawKey.replace(/^\\2d\s+\\2d\s+/i, "--");
    const value = entry.slice(at + 1).trim();
    const isThemeVariable = themeVariable.test(key);
    if (!allowed.has(key) && !isThemeVariable || !value || /url\s*\(|expression|javascript|@import|[<>{}]/i.test(value)) return;
    if (isThemeVariable && !safeColor.test(value)) return;
    output.push(key + ":" + value);
  });
  return output.join(";");
}
var ADMIN_LINK_COLOR_KEYS = /* @__PURE__ */ new Set(["light", "dark", "visited-light", "visited-dark", "hover-light", "hover-dark"]);
function normalizeAdminLinkColor(value) {
  const color = String(value || "").trim();
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) return color.toLowerCase();
  if (/^[a-z]{1,20}$/i.test(color) && !/^(?:inherit|initial|unset|revert|revert-layer|currentcolor)$/i.test(color)) return color.toLowerCase();
  if (/^rgba?\(\s*\d{1,3}(?:\.\d+)?%?(?:\s*,\s*|\s+)\d{1,3}(?:\.\d+)?%?(?:\s*,\s*|\s+)\d{1,3}(?:\.\d+)?%?(?:\s*[,/]\s*(?:0|1|0?\.\d+|\d{1,3}%))?\s*\)$/i.test(color)) return color;
  if (/^hsla?\(\s*-?\d+(?:\.\d+)?(?:deg|rad|turn)?(?:\s*,\s*|\s+)\d{1,3}(?:\.\d+)?%(?:\s*,\s*|\s+)\d{1,3}(?:\.\d+)?%(?:\s*[,/]\s*(?:0|1|0?\.\d+|\d{1,3}%))?\s*\)$/i.test(color)) return color;
  return "";
}
function extractAdminLinkColors(source) {
  const colors = {}, errors = [];
  let found = false;
  const input = String(source || "");
  const content = input.replace(/^\{\{\{#!linkcolor[ \t]*\r?\n([\s\S]*?)^\}\}\}[ \t]*(?:\r?\n|$)/gim, (_block, body) => {
    found = true;
    for (const [index, rawLine] of String(body || "").split(/\r?\n/).entries()) {
      const line = rawLine.trim();
      if (!line) continue;
      const separator = line.indexOf(":");
      if (separator < 1) {
        errors.push("\uB9C1\uD06C \uC0C9\uC0C1 \uC124\uC815 " + (index + 1) + "\uBC88\uC9F8 \uC904\uC740 key: color \uD615\uC2DD\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.");
        continue;
      }
      const key = line.slice(0, separator).trim().toLowerCase();
      if (!ADMIN_LINK_COLOR_KEYS.has(key)) {
        errors.push("\uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uB9C1\uD06C \uC0C9\uC0C1 \uD56D\uBAA9\uC785\uB2C8\uB2E4: " + key);
        continue;
      }
      const normalized = normalizeAdminLinkColor(line.slice(separator + 1).trim());
      if (!normalized) {
        errors.push("\uC62C\uBC14\uB974\uC9C0 \uC54A\uC740 \uC0C9\uC0C1 \uAC12\uC785\uB2C8\uB2E4: " + key);
        continue;
      }
      colors[key] = normalized;
    }
    return "";
  });
  if (/\{\{\{#!linkcolor\b/i.test(input) && !found) errors.push("\uB9C1\uD06C \uC0C9\uC0C1 \uC124\uC815 \uBE14\uB85D\uC744 }}} \uB85C \uB2EB\uC544\uC57C \uD569\uB2C8\uB2E4.");
  return { content, colors, found, errors };
}
function buildAdminLinkColorMarkup(html, colors) {
  const selectors = {
    light: 'html[data-theme="light"] .aonwiki-page-content a:not(.not-exist):not(.wiki-heading-number)',
    dark: 'html[data-theme="dark"] .aonwiki-page-content a:not(.not-exist):not(.wiki-heading-number)',
    "visited-light": 'html[data-theme="light"] .aonwiki-page-content a:not(.not-exist):not(.wiki-heading-number):visited',
    "visited-dark": 'html[data-theme="dark"] .aonwiki-page-content a:not(.not-exist):not(.wiki-heading-number):visited',
    "hover-light": 'html[data-theme="light"] .aonwiki-page-content a:not(.not-exist):not(.wiki-heading-number):hover',
    "hover-dark": 'html[data-theme="dark"] .aonwiki-page-content a:not(.not-exist):not(.wiki-heading-number):hover'
  };
  const rules = [];
  for (const [key, selector] of Object.entries(selectors)) {
    const color = normalizeAdminLinkColor(colors?.[key]);
    if (color) rules.push(selector + "{color:" + color + " !important}");
  }
  if (!rules.length) return String(html || "");
  rules.push('html[data-theme="light"] .aonwiki-page-content a.wiki-heading-number, html[data-theme="dark"] .aonwiki-page-content a.wiki-heading-number, html[data-theme="light"] .aonwiki-page-content a.wiki-heading-number:visited, html[data-theme="dark"] .aonwiki-page-content a.wiki-heading-number:visited, html[data-theme="light"] .aonwiki-page-content a.wiki-heading-number:hover, html[data-theme="dark"] .aonwiki-page-content a.wiki-heading-number:hover {color:var(--wiki-link) !important}');
  rules.push('.aonwiki-page-content span[style*="color"] a, .aonwiki-page-content span[style*="color"] a:visited, .aonwiki-page-content span[style*="color"] a:hover{color:inherit !important}');
  return "<style>" + rules.join("\n") + '</style><div class="aonwiki-page-content">' + String(html || "") + "</div>";
}
async function getPageLinkColors(env, title) {
  await ensurePageLinkColorsSchema(env);
  const row = await env.DB.prepare("SELECT config_json FROM page_link_colors WHERE title = ?").bind(title).first();
  if (!row) return {};
  try {
    const saved = JSON.parse(row.config_json || "{}"), colors = {};
    for (const key of ADMIN_LINK_COLOR_KEYS) {
      const color = normalizeAdminLinkColor(saved?.[key]);
      if (color) colors[key] = color;
    }
    return colors;
  } catch {
    return {};
  }
}
async function savePageLinkColors(env, title, extracted, editor) {
  await ensurePageLinkColorsSchema(env);
  if (!extracted?.found || !Object.keys(extracted.colors || {}).length) {
    await env.DB.prepare("DELETE FROM page_link_colors WHERE title = ?").bind(title).run();
    return;
  }
  await env.DB.prepare("INSERT INTO page_link_colors (title, config_json, updated_at, updated_by) VALUES (?, ?, ?, ?) ON CONFLICT(title) DO UPDATE SET config_json = excluded.config_json, updated_at = excluded.updated_at, updated_by = excluded.updated_by").bind(title, JSON.stringify(extracted.colors), (/* @__PURE__ */ new Date()).toISOString(), String(editor || "")).run();
}
function isNamuMarkupContainer(source, index) {
  const header = String(source || "").slice(index + 3);
  if (header.startsWith("#!")) {
    return ["#!wiki", "#!folding", "#!if"].some(
      (name) => header === name || header.startsWith(name + " ") || header.startsWith(name + "\n") || header.startsWith(name + "\r") || header.startsWith(name + "	")
    );
  }
  const first = header[0] || "";
  const second = header[1] || "";
  return first === "#" || (first === "+" || first === "-") && second >= "0" && second <= "9";
}
function replaceNamuIncludesOutsideCode(source, replacer) {
  const text = String(source || "");
  let output = "";
  let cursor = 0;
  while (cursor < text.length) {
    if (text.startsWith("{{{", cursor) && !isNamuMarkupContainer(text, cursor)) {
      const close = text.indexOf("}}}", cursor + 3);
      if (close < 0) {
        output += text.slice(cursor);
        break;
      }
      output += text.slice(cursor, close + 3);
      cursor = close + 3;
      continue;
    }
    if (text.slice(cursor, cursor + 9).toLowerCase() === "[include(") {
      const close = text.indexOf(")]", cursor + 9);
      if (close >= 0) {
        const match = text.slice(cursor, close + 2);
        const rawName = text.slice(cursor + 9, close);
        if (!String(rawName || "").toLowerCase().includes("[include(")) {
          output += replacer(match, rawName);
          cursor = close + 2;
          continue;
        }
      }
    }
    output += text[cursor];
    cursor++;
  }
  return output;
}
function collectIncludeTargets(source) {
  const targets = [];
  replaceNamuIncludesOutsideCode(source, (match, rawName) => {
    const first = String(rawName || "").split(",")[0].trim();
    if (first && !first.includes("=")) targets.push(first);
    return match;
  });
  return [...new Set(targets)];
}
function collectWikiLinkTargets(source) {
  const targets = /* @__PURE__ */ new Set();
  const text = String(source || "");
  for (const match of text.matchAll(/\[\[(?:파일|file):([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/gi)) {
    const name = String(match[1] || "").trim();
    if (name) targets.add("file:" + name);
  }
  for (const match of text.matchAll(/\[\[(?:분류|category):([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/gi)) {
    const name = String(match[1] || "").trim();
    if (name) targets.add("category:" + name);
  }
  for (const match of text.matchAll(/\[\[([^\]]+)\]\]/g)) {
    let target = String(match[1] || "").split("|")[0].trim();
    if (!target || target.startsWith("#") || /^https?:\/\//i.test(target)) continue;
    const hash = target.indexOf("#");
    if (hash >= 0) target = target.slice(0, hash).trim();
    if (!target) continue;
    if (/^(?:분류|category):/i.test(target)) {
      targets.add("category:" + target.replace(/^(?:분류|category):/i, ""));
    } else if (/^(?:파일|file):/i.test(target)) {
      targets.add("file:" + target.replace(/^(?:파일|file):/i, ""));
    } else {
      targets.add(target);
    }
  }
  return [...targets];
}
function normalizeNamuLookupKey(name) {
  const raw = String(name || "").trim();
  if (/^(?:\uD30C\uC77C|file):/i.test(raw)) return "file:" + raw.replace(/^(?:\uD30C\uC77C|file):/i, "").trim().toLocaleLowerCase();
  if (/^(?:\uBD84\uB958|category):/i.test(raw)) return "category:" + raw.replace(/^(?:\uBD84\uB958|category):/i, "").trim().toLocaleLowerCase();
  return raw.toLocaleLowerCase();
}
async function buildNamuServerDatabase(env, title, content) {
  const source = String(content || "");
  const records = /* @__PURE__ */ new Map([[title, { title, data: source }]]);
  const maxIncludes = 50;
  const batch = [...new Set(collectIncludeTargets(source))].filter((name) => name && name !== title).slice(0, maxIncludes);
  if (batch.length) {
    const placeholders = batch.map(() => "?").join(",");
    const result = await env.DB.prepare(
      "SELECT title, content FROM pages WHERE title IN (" + placeholders + ")"
    ).bind(...batch).all();
    for (const page of result.results || []) {
      records.set(page.title, { title: page.title, data: String(page.content || "") });
    }
  }
  const allMarkup = [...records.values()].map((item) => item.data || "").join("\n");
  const linkTargets = new Set(collectWikiLinkTargets(allMarkup));
  const categoryAliases = new Set(
    [...linkTargets].filter((name) => name.startsWith("category:"))
  );
  for (const alias of categoryAliases) linkTargets.delete(alias);
  const documentTargets = [...linkTargets].filter((name) => !name.startsWith("file:") && !records.has(name)).slice(0, 900);
  const documentRows = [];
  for (let index = 0; index < documentTargets.length; index += 90) {
    const batch2 = documentTargets.slice(index, index + 90);
    const placeholders = batch2.map(() => "?").join(",");
    const result = await env.DB.prepare(
      "SELECT title FROM pages WHERE title IN (" + placeholders + ")"
    ).bind(...batch2).all();
    documentRows.push(...result.results || []);
  }
  const fileTargets = [...linkTargets].filter((name) => name.startsWith("file:")).map((name) => {
    const raw = name.slice(5);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }).filter(Boolean).slice(0, 500);
  const imageRows = [];
  const imageAliasRows = [];
  if (fileTargets.length) {
    await ensureImageSchema(env);
    for (let index = 0; index < fileTargets.length; index += 90) {
      const batch2 = fileTargets.slice(index, index + 90);
      const placeholders = batch2.map(() => "?").join(",");
      const [images, aliases] = await Promise.all([
        env.DB.prepare("SELECT id, filename FROM images WHERE filename COLLATE NOCASE IN (" + placeholders + ")").bind(...batch2).all(),
        env.DB.prepare("SELECT alias, image_id FROM image_aliases WHERE alias COLLATE NOCASE IN (" + placeholders + ")").bind(...batch2).all()
      ]);
      imageRows.push(...images.results || []);
      imageAliasRows.push(...aliases.results || []);
    }
  }
  const pageCount = /\[pagecount\]/i.test(allMarkup) ? await getCachedNamuPageCount(env) : { total: 0 };
  for (const row of documentRows) {
    const key = row.title;
    if (key) records.set(key, { title: key, data: "" });
  }
  for (const row of imageRows) {
    const key = "file:" + row.filename;
    if (row.filename) records.set(key, { title: key, data: "" });
  }
  for (const row of imageAliasRows) {
    const key = "file:" + row.alias;
    if (row.alias) records.set(key, { title: key, data: "" });
  }
  for (const categoryTitle of categoryAliases) {
    records.set(categoryTitle, { title: categoryTitle, data: "" });
  }
  const imageMap = /* @__PURE__ */ new Map();
  for (const row of imageRows) {
    const value = String(row.filename || "");
    const dot = value.lastIndexOf(".");
    const base = dot > 0 ? value.slice(0, dot) : value;
    const ext = dot > 0 ? value.slice(dot + 1).toLowerCase() : "jpg";
    if (row.filename && row.id) {
      imageMap.set(imageFileHash(base).toLowerCase() + "." + ext, row.id);
      imageMap.set("name:" + value.toLocaleLowerCase(), row.id);
    }
  }
  for (const row of imageAliasRows) {
    const value = String(row.alias || "");
    const dot = value.lastIndexOf(".");
    const base = dot > 0 ? value.slice(0, dot) : value;
    const ext = dot > 0 ? value.slice(dot + 1).toLowerCase() : "jpg";
    const key = imageFileHash(base).toLowerCase() + "." + ext;
    if (row.alias && row.image_id) {
      if (!imageMap.has(key)) imageMap.set(key, row.image_id);
      imageMap.set("name:" + value.toLocaleLowerCase(), row.image_id);
    }
  }
  const lookup = new Map(records);
  const normalizedLookup = /* @__PURE__ */ new Map();
  for (const [key, value] of lookup) normalizedLookup.set(normalizeNamuLookupKey(key), value);
  return {
    data: new Array(Math.max(0, Number(pageCount?.total) || 0)),
    lookup,
    normalizedLookup,
    imageMap
  };
}
var namuPageCountCache = { value: null, expiresAt: 0 };
var namuPageCountPending = null;
async function getCachedNamuPageCount(env) {
  if (namuPageCountCache.value && namuPageCountCache.expiresAt > Date.now()) {
    return namuPageCountCache.value;
  }
  if (namuPageCountPending) return namuPageCountPending;
  namuPageCountPending = env.DB.prepare("SELECT COUNT(*) AS total FROM pages").first().then((row) => {
    const value = { total: Number(row?.total) || 0 };
    namuPageCountCache = { value, expiresAt: Date.now() + 60 * 1e3 };
    return value;
  }).finally(() => {
    namuPageCountPending = null;
  });
  return namuPageCountPending;
}
function rewriteNamuImageUrls(markup, imageMap) {
  let source = String(markup || "");
  if (!imageMap?.size) imageMap = /* @__PURE__ */ new Map();
  source = source.replace(
    /(["'])\/files\/([^"']+)(["'])/gi,
    (full, quote, rawName, endQuote) => {
      let filename = String(rawName || "");
      try {
        filename = decodeURIComponent(filename);
      } catch {
      }
      const dot = filename.lastIndexOf(".");
      const base = dot > 0 ? filename.slice(0, dot) : filename;
      const ext = dot > 0 ? filename.slice(dot + 1).toLowerCase() : "jpg";
      const id = imageMap.get("name:" + filename.toLocaleLowerCase()) || imageMap.get(imageFileHash(base).toLowerCase() + "." + ext);
      return id ? quote + mediaAssetPath(id) + endQuote : full;
    }
  );
  source = source.replace(
    /(["'])\/image\/([a-f0-9]{56})\.([a-z0-9]+)\.cache_v[0-9]+(?:[?#][^\"']*)?(["'])/gi,
    (full, quote, hash, ext, endQuote) => {
      const id = imageMap.get(hash.toLowerCase() + "." + ext.toLowerCase());
      return id ? quote + mediaAssetPath(id) + endQuote : full;
    }
  );
  const decodeHtml = (value) => String(value || "").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
  const escAttr = (value) => String(value || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  source = source.replace(
    /(<a\b(?=[^>]*\bhref=["']https?:\/\/[^"']+["'])[^>]*>)(<a\b([^>]*)>([\s\S]*?)<\/a>)(<\/a>)/gi,
    (full, outerOpen, innerFull, innerAttrs, innerText, outerClose) => {
      const titleMatch = String(innerAttrs || "").match(/\btitle=["']([^"']+)["']/i);
      if (!titleMatch) return full;
      let filename = decodeHtml(titleMatch[1]).trim();
      if (!/^(?:\uD30C\uC77C|file):/i.test(filename)) return full;
      filename = filename.replace(/^(?:\uD30C\uC77C|file):/i, "").trim();
      try {
        filename = decodeURIComponent(filename);
      } catch {
      }
      const dot = filename.lastIndexOf(".");
      const base = dot > 0 ? filename.slice(0, dot) : filename;
      const ext = dot > 0 ? filename.slice(dot + 1).toLowerCase() : "jpg";
      const id = imageMap.get("name:" + filename.toLocaleLowerCase()) || imageMap.get(imageFileHash(base).toLowerCase() + "." + ext);
      const width = decodeHtml(String(innerText || "").replace(/<[^>]+>/g, "")).match(/(?:^|[|&\s])width\s*=\s*(\d+(?:\.\d+)?)/i)?.[1];
      const widthAttr = width ? ' width="' + width + '" style="width:' + width + 'px"' : "";
      const imageSrc = id ? mediaAssetPath(id) : "/files/" + encodeURIComponent(filename) + "?aonwiki_image=" + encodeURIComponent(filename);
      return outerOpen + '<img class="wiki-image" src="' + imageSrc + '" alt="' + escAttr(filename) + '" loading="lazy" decoding="async"' + widthAttr + ">" + outerClose;
    }
  );
  source = source.replace(
    /<a\b([^>]*)>([\s\S]*?)<\/a>/gi,
    (full, attrs, inner) => {
      const titleMatch = String(attrs || "").match(/\btitle=["']([^"']+)["']/i);
      const hrefMatch = String(attrs || "").match(/\bhref=["']([^"']+)["']/i);
      const text = decodeHtml(String(inner || "").replace(/<[^>]+>/g, "")).trim();
      let filename = titleMatch?.[1] || "";
      if (/^(?:파일|file):/i.test(filename)) filename = filename.replace(/^(?:파일|file):/i, "");
      else if (/^(?:파일|file):/i.test(text)) filename = text.replace(/^(?:파일|file):/i, "");
      else if (hrefMatch && /(?:^|[\\/])(?:파일|file):/i.test(hrefMatch[1])) {
        filename = decodeHtml(hrefMatch[1]).replace(/^.*?(?:파일|file):/i, "");
      } else return full;
      filename = decodeHtml(filename).trim();
      try {
        filename = decodeURIComponent(filename);
      } catch {
      }
      const dot = filename.lastIndexOf(".");
      const base = dot > 0 ? filename.slice(0, dot) : filename;
      const ext = dot > 0 ? filename.slice(dot + 1).toLowerCase() : "jpg";
      const id = imageMap.get("name:" + filename.toLocaleLowerCase()) || imageMap.get(imageFileHash(base).toLowerCase() + "." + ext);
      if (!id) return full;
      return '<span class="wiki-image-align-normal"><span class="wiki-image-wrapper"><a href="' + mediaAssetPath(id) + '" rel="nofollow"><img class="wiki-image" src="' + mediaAssetPath(id) + '" alt="' + escAttr(filename) + '" loading="lazy" decoding="async"></a></span></span>';
    }
  );
  return source;
}
async function sanitizeServerWikiHtml(markup) {
  const source = String(markup || "");
  if (!/<(?:script|style|object|embed|form|input|button|link|meta|iframe|svg|math|base|applet)\b|\bon[a-z]+\s*=|style\s*=|(?:href|src|poster)\s*=\s*["']\s*(?:javascript|data|vbscript):|srcdoc\s*=|formaction\s*=|xlink:href\s*=/i.test(source)) {
    return source;
  }
  const input = new Response(source, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  const rewritten = new HTMLRewriter().on("*", {
    element(element) {
      const tag = String(element.tagName || "").toUpperCase();
      if (["SCRIPT", "STYLE", "OBJECT", "EMBED", "FORM", "INPUT", "BUTTON", "LINK", "META"].includes(tag)) {
        element.remove();
        return;
      }
      if (!SERVER_WIKI_TAGS.has(tag)) {
        element.removeAndKeepContent();
        return;
      }
      for (const [rawName, rawValue] of [...element.attributes]) {
        const name = String(rawName).toLowerCase(), value = String(rawValue || "");
        if (name === "onclick") {
          if (tag === "A" && /^javascript:namumark_heading_folding\('[a-f0-9_]+', this\);?$/i.test(value)) element.setAttribute("data-namumark-action", "heading-fold");
          element.removeAttribute(rawName);
          continue;
        }
        if (name.startsWith("on") || !SERVER_WIKI_ATTRS.has(name)) {
          element.removeAttribute(rawName);
          continue;
        }
        if (name === "style") {
          const safe = sanitizeServerWikiStyle(value);
          if (safe) element.setAttribute("style", safe);
          else element.removeAttribute("style");
          continue;
        }
        if (["href", "src", "poster"].includes(name) && /^\s*(?:javascript|data|vbscript):/i.test(value)) {
          element.removeAttribute(rawName);
          continue;
        }
        if (name === "href" && /^\s*\/\//.test(value)) element.removeAttribute(rawName);
      }
      if (tag === "A") {
        const href = element.getAttribute("href") || "";
        if (/^https?:\/\//i.test(href)) {
          element.setAttribute("target", "_blank");
          element.setAttribute("rel", "noopener noreferrer");
        }
      }
      if (tag === "A") {
        const classes = (element.getAttribute("class") || "").split(/\s+/);
        if (classes.includes("not-exist")) {
          const current = element.getAttribute("style") || "";
          const cleaned = current.split(";").filter((part) => !/^\s*(?:color|text-decoration)(?:\s|:)/i.test(part)).join(";");
          element.setAttribute("style", (cleaned ? cleaned.replace(/;?$/, ";") : "") + "color:#d1242f;text-decoration:underline;");
        }
      }
      if (tag === "IFRAME") {
        const src = element.getAttribute("src") || "";
        const allowedHosts = /* @__PURE__ */ new Set(["www.youtube.com", "youtube.com", "www.instagram.com", "www.facebook.com", "www.tiktok.com", "twitframe.com", "tv.kakao.com", "tv.naver.com", "embed.nicovideo.jp", "player.vimeo.com"]);
        try {
          const parsed = new URL(src);
          if (parsed.protocol !== "https:" || !allowedHosts.has(parsed.hostname)) {
            element.remove();
            return;
          }
          element.setAttribute("src", parsed.href);
          element.setAttribute("loading", "lazy");
          element.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
          element.setAttribute("allowfullscreen", "");
        } catch {
          element.remove();
          return;
        }
      }
    }
  }).transform(input);
  return await rewritten.text();
}
var namuRenderCache = /* @__PURE__ */ new Map();
var namuRenderPending = /* @__PURE__ */ new Map();
var namuRenderCacheSchemaPromise = null;
async function ensureNamuRenderCacheSchema(env) {
  if (!namuRenderCacheSchemaPromise) {
    namuRenderCacheSchemaPromise = env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS namu_render_cache (title TEXT PRIMARY KEY NOT NULL, source_hash TEXT NOT NULL, html TEXT NOT NULL, metadata_json TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL)"
    ).run().catch((error) => {
      namuRenderCacheSchemaPromise = null;
      throw error;
    });
  }
  await namuRenderCacheSchemaPromise;
}
async function clearPersistentNamuRenderCache(env, title = "") {
  try {
    await ensureNamuRenderCacheSchema(env);
    const target = cleanTitle(title);
    if (target) {
      await env.DB.prepare("DELETE FROM namu_render_cache WHERE title = ?").bind(target).run();
    } else {
      await env.DB.prepare("DELETE FROM namu_render_cache").run();
    }
  } catch (error) {
    console.warn("AonWiki persistent render cache clear failed:", error);
  }
}
var namuPageResponseCache = /* @__PURE__ */ new Map();
var namuPageResponsePending = /* @__PURE__ */ new Map();
function clearNamuPageResponseCache() {
  namuPageResponseCache.clear();
  namuPageResponsePending.clear();
}
function invalidateNamuServerIndexes() {
  namuRenderCache.clear();
  namuRenderPending.clear();
  clearNamuPageResponseCache();
}
function extractNamuCategoryNames(source) {
  const categories = /* @__PURE__ */ new Set();
  for (const match of String(source || "").matchAll(/\[\[(?:분류|category):([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/gi)) {
    let name = String(match[1] || "").trim();
    while (/^(?:분류|category):/i.test(name)) name = name.replace(/^(?:분류|category):/i, "").trim();
    if (name) categories.add(name);
  }
  return [...categories];
}
function mergeNamuRenderMetadata(metadata, source) {
  const value = metadata && typeof metadata === "object" ? { ...metadata } : {};
  value.categories = extractNamuCategoryNames(source);
  return value;
}
function parseTableColorRgb(value) {
  const input = String(value || "").trim().toLowerCase();
  const named = { black: "#000000", white: "#ffffff", red: "#ff0000", green: "#008000", blue: "#0000ff", yellow: "#ffff00", orange: "#ffa500", purple: "#800080", gray: "#808080", grey: "#808080", navy: "#000080", teal: "#008080" };
  const color = named[input] || input;
  let match = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (match) {
    const hex = match[1].length === 3 ? match[1].split("").map((c) => c + c).join("") : match[1];
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  match = color.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  if (match) return [Number(match[1]), Number(match[2]), Number(match[3])];
  return null;
}
function resolveThemeTableColor(value, theme) {
  const input = String(value || "").trim();
  const match = input.match(/^light-dark\(([\s\S]+)\)$/i);
  if (!match) return input;
  const inner = match[1];
  let depth = 0;
  for (let index = 0; index < inner.length; index++) {
    const character = inner[index];
    if (character === "(") depth++;
    else if (character === ")") depth--;
    else if (character === "," && depth === 0) {
      const light = inner.slice(0, index).trim();
      const dark = inner.slice(index + 1).trim();
      return theme === "dark" ? dark : light;
    }
  }
  return input;
}
function tableLuminance(rgb) {
  const linear = (value) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
}
function tableContrast(a, b) {
  const x = tableLuminance(a), y = tableLuminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function chooseTableTextColor(backgroundValue, foregroundValue, theme) {
  const canvas = theme === "dark" ? [26, 29, 32] : [255, 255, 255];
  const background = parseTableColorRgb(backgroundValue) || canvas;
  const foreground = parseTableColorRgb(foregroundValue);
  if (foreground && tableContrast(foreground, background) >= 4.5) return foregroundValue;
  const black = [0, 0, 0], white = [255, 255, 255];
  return tableContrast(black, background) >= tableContrast(white, background) ? "#000000" : "#ffffff";
}
function getInlineStyleProperties(element) {
  const properties = {};
  const style = element.getAttribute("style") || "";
  for (const declaration of style.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 1) continue;
    const name = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();
    if (name && value) properties[name] = value;
  }
  return properties;
}
async function applyTableTextContrast(markup) {
  const tableStack = [];
  const rowStack = [];
  const getThemeValue = (levels, key, theme) => {
    for (const properties of levels) {
      const paired = properties["--aonwiki-table-" + key + "-" + theme];
      if (paired) return resolveThemeTableColor(paired, theme);
      if (key === "bg") {
        const fixed = properties["background-color"] || properties.background || "";
        if (fixed && !/^transparent$/i.test(fixed)) return resolveThemeTableColor(fixed, theme);
      } else if (key === "fg" && properties.color && !/^var\(/i.test(properties.color)) {
        return resolveThemeTableColor(properties.color, theme);
      }
    }
    return "";
  };
  const rewriter = new HTMLRewriter().on("table", { element(el) {
    tableStack.push(getInlineStyleProperties(el));
  }, endTag() {
    tableStack.pop();
  } }).on("tr", { element(el) {
    rowStack.push(getInlineStyleProperties(el));
  }, endTag() {
    rowStack.pop();
  } }).on("td, th", {
    element(el) {
      const levels = [getInlineStyleProperties(el), rowStack[rowStack.length - 1] || {}, tableStack[tableStack.length - 1] || {}];
      const authoredLightBg = getThemeValue(levels, "bg", "light");
      const authoredDarkBg = getThemeValue(levels, "bg", "dark");
      const lightBg = authoredLightBg || authoredDarkBg || "#ffffff";
      const darkBg = authoredDarkBg || authoredLightBg || "#1a1d20";
      const lightFg = getThemeValue(levels, "fg", "light");
      const darkFg = getThemeValue(levels, "fg", "dark");
      const lightText = chooseTableTextColor(lightBg, lightFg, "light");
      const darkText = chooseTableTextColor(darkBg, darkFg, "dark");
      const current = el.getAttribute("style") || "";
      el.setAttribute(
        "style",
        (current.trim() ? current.trim().replace(/;?$/, ";") : "") + "--aonwiki-table-auto-fg-light:" + lightText + ";--aonwiki-table-auto-fg-dark:" + darkText + ";color:light-dark(var(--aonwiki-table-auto-fg-light,var(--wiki-text)),var(--aonwiki-table-auto-fg-dark,var(--wiki-text)));"
      );
      if (lightFg || darkFg) el.setAttribute("data-aonwiki-authored-fg", "1");
      else el.removeAttribute("data-aonwiki-authored-fg");
    }
  });
  return await rewriter.transform(new Response(String(markup || ""), {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  })).text();
}
async function expandAonIncludes(env, source) {
  const text = String(source || "");
  const seen = /* @__PURE__ */ new Set(["\uC544\uC628"]);
  const names = [...new Set(collectIncludeTargets(text))].filter((name) => name && !seen.has(name)).slice(0, 50);
  if (!names.length) return text;
  const placeholders = names.map(() => "?").join(",");
  const result = await env.DB.prepare(
    "SELECT title, content FROM pages WHERE title IN (" + placeholders + ")"
  ).bind(...names).all();
  const rows = new Map((result.results || []).map((row) => [String(row.title), String(row.content || "")]));
  return replaceNamuIncludesOutsideCode(text, (match, rawName) => {
    const name = String(rawName || "").split(",")[0].trim();
    if (!name || name.includes("=") || !rows.has(name)) return match;
    return "\n" + rows.get(name) + "\n";
  });
}
async function buildAonClientRenderPayload(env, title, source, linkColors = {}) {
  const expandedSource = await expandAonIncludes(env, source);
  const extracted = extractAdminLinkColors(expandedSource);
  const renderSource = extracted.content;
  const database = await buildNamuServerDatabase(env, title, source);
  const records = [...database.lookup.values()].map((item) => ({
    title: String(item.title || ""),
    data: String(item.data || "")
  }));
  const imageMap = {};
  for (const [key, id] of database.imageMap || []) {
    if (id) imageMap[String(key)] = String(id);
  }
  return {
    source: renderSource,
    records,
    pageCount: Number(database.data?.length) || 0,
    imageMap,
    linkColors: linkColors || {}
  };
}
async function renderNamuMarkupOnWorker(env, title, source, linkColors = {}) {
  const sourceText = String(source || "");
  const colors = {};
  for (const key of ADMIN_LINK_COLOR_KEYS) {
    const color = normalizeAdminLinkColor(linkColors?.[key]);
    if (color) colors[key] = color;
  }
  const sourceDigest = namuFileHash(sourceText + "\n" + JSON.stringify(colors));
  const cacheKey = "namutest-main-v7-include-category-isolation:" + String(title) + ":" + sourceDigest;
  const cached = namuRenderCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (namuRenderPending.has(cacheKey)) return namuRenderPending.get(cacheKey);
  const pending = (async () => {
    try {
      await ensureNamuRenderCacheSchema(env);
      const stored = await env.DB.prepare("SELECT source_hash, html, metadata_json FROM namu_render_cache WHERE title = ?").bind(title).first();
      if (stored && stored.source_hash === cacheKey) {
        let metadata = {};
        try {
          metadata = JSON.parse(stored.metadata_json || "{}");
        } catch {
        }
        metadata = mergeNamuRenderMetadata(metadata, sourceText);
        const value2 = { html: String(stored.html || ""), metadata, imageMap: metadata.imageMap || {} };
        namuRenderCache.set(cacheKey, { value: value2, expiresAt: Date.now() + 15 * 60 * 1e3 });
        return value2;
      }
    } catch (error) {
      console.warn("AonWiki persistent render cache read failed:", error);
    }
    const renderSource = title === "\uC544\uC628" ? await expandAonIncludes(env, sourceText) : sourceText;
    const extracted = extractAdminLinkColors(renderSource);
    const renderText = extracted.content;
    const database = await buildNamuServerDatabase(env, title, sourceText);
    await ensureAonNamuWasm();
    const options = new RendererOptions();
    options.document_url_prefix = "/w/";
    options.document_query_prefix = "/w/";
    options.dark_class = "dark";
    const callbacks = {
      documentExists(name) {
        const raw = String(name || "").trim();
        const key = raw.replace(/^(?:\uD30C\uC77C|file):/i, "");
        return database.lookup.has(raw) || database.lookup.has(key) || database.lookup.has("\uD30C\uC77C:" + key) || database.lookup.has("file:" + key) || database.lookup.has("category:" + key) || database.normalizedLookup.has(normalizeNamuLookupKey(raw));
      },
      getDocumentContent(name) {
        const raw = String(name || "").trim();
        const key = raw.replace(/^(?:\uD30C\uC77C|file):/i, "");
        return (database.lookup.get(raw) || database.lookup.get(key) || database.lookup.get("\uD30C\uC77C:" + key) || database.lookup.get("file:" + key) || database.lookup.get("category:" + key) || database.normalizedLookup.get(normalizeNamuLookupKey(raw)))?.data || "";
      },
      getPagecount() {
        return Number(database.data.length) || 0;
      }
    };
    const parsed = parse_with_callbacks_and_options(renderText, callbacks, options);
    let parsedHtml = "";
    let parsedMetadata = {};
    try {
      parsedHtml = parsed.html || "";
      parsedMetadata = {
        categories: parsed.categories || [],
        backlinks: parsed.backlinks || [],
        redirect_target: parsed.redirect_target,
        redirect_anchor: parsed.redirect_anchor
      };
    } finally {
      parsed.free();
      options.free();
    }
    const cleanHtml = rewriteNamuImageUrls(await sanitizeServerWikiHtml(parsedHtml), database.imageMap);
    const contrastedHtml = /<table\b/i.test(cleanHtml) ? await applyTableTextContrast(cleanHtml) : cleanHtml;
    const value = { html: buildAdminLinkColorMarkup(contrastedHtml, colors), metadata: { ...mergeNamuRenderMetadata(parsedMetadata, sourceText), imageMap: Object.fromEntries(database.imageMap || []) }, imageMap: Object.fromEntries(database.imageMap || []) };
    namuRenderCache.set(cacheKey, { value, expiresAt: Date.now() + 15 * 60 * 1e3 });
    if (namuRenderCache.size > 300) {
      const oldest = namuRenderCache.keys().next().value;
      if (oldest) namuRenderCache.delete(oldest);
    }
    if (value.html.length <= 25e4) {
      try {
        await ensureNamuRenderCacheSchema(env);
        await env.DB.prepare("INSERT INTO namu_render_cache (title, source_hash, html, metadata_json, updated_at) VALUES (?, ?, ?, ?, datetime('now')) ON CONFLICT(title) DO UPDATE SET source_hash = excluded.source_hash, html = excluded.html, metadata_json = excluded.metadata_json, updated_at = excluded.updated_at").bind(title, cacheKey, value.html, JSON.stringify(value.metadata || {})).run();
      } catch (error) {
        console.warn("AonWiki persistent render cache write failed:", error);
      }
    } else {
      try {
        await ensureNamuRenderCacheSchema(env);
        await env.DB.prepare("DELETE FROM namu_render_cache WHERE title = ?").bind(title).run();
      } catch {
      }
    }
    return value;
  })().finally(() => namuRenderPending.delete(cacheKey));
  namuRenderPending.set(cacheKey, pending);
  return pending;
}
async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}
function safeJsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
function rewriteFrontendAssets(html, frontendOrigin, localAssets = false) {
  const baseUrl = new URL(frontendOrigin.replace(/\/+$/, "") + "/");
  const basePath = baseUrl.pathname.endsWith("/") ? baseUrl.pathname : baseUrl.pathname + "/";
  const staticAssets = /* @__PURE__ */ new Set([
    "style.css",
    "app.bundle.js",
    "theme.js",
    "namumark-aon.css",
    "namumark-interactions-aon.css",
    "aonwiki-mark.svg",
    "design-system.css"
  ]);
  return String(html).replace(/\b(href|src)\s*=\s*(["'])(.*?)\2/gi, (attribute, name, quote, rawUrl) => {
    let parsed;
    try {
      parsed = new URL(String(rawUrl).trim(), baseUrl);
    } catch {
      return attribute;
    }
    if (parsed.origin !== baseUrl.origin || !parsed.pathname.startsWith(basePath)) return attribute;
    let assetPath;
    try {
      assetPath = decodeURIComponent(parsed.pathname.slice(basePath.length));
    } catch {
      return attribute;
    }
    if (!staticAssets.has(assetPath)) return attribute;
    parsed.searchParams.set("aonfix", "20261115-include-category-isolation-v1");
    const prefix = localAssets ? "/" : "/aon/";
    return name + "=" + quote + prefix + assetPath + parsed.search + parsed.hash + quote;
  });
}
var CACHEABLE_STATIC_ASSETS = /* @__PURE__ */ new Set([
  "app.js",
  "app.bundle.js",
  "style.css",
  "design-system.css",
  "theme.js",
  "namumark-aon.css",
  "namumark-interactions-aon.css",
  "aonwiki-mark.svg"
]);
var CACHEABLE_STATIC_ASSET_PATTERN = /\.(?:js|css|svg|png|jpe?g|gif|webp|ico|woff2?|ttf|wasm)$/i;
var LONG_LIVED_STATIC_CACHE_CONTROL = "public, max-age=31536000, immutable";
function isCacheableStaticAsset(pathname) {
  const basename = pathname.split("/").pop() || "";
  return CACHEABLE_STATIC_ASSETS.has(basename) || CACHEABLE_STATIC_ASSET_PATTERN.test(pathname);
}
var FRONTEND_TRANSIENT_STATUSES = /* @__PURE__ */ new Set([429, 500, 502, 503, 504]);
async function fetchFrontendWithRetry(url, init = {}, attempts = 3) {
  let lastResponse = null;
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const upstream = await fetch(url, init);
      if (!FRONTEND_TRANSIENT_STATUSES.has(upstream.status)) return upstream;
      lastResponse = upstream;
    } catch (error) {
      lastError = error;
    }
    if (attempt + 1 < attempts) {
      await new Promise((resolve) => setTimeout(resolve, 120 * (attempt + 1)));
    }
  }
  if (lastResponse) return lastResponse;
  throw lastError || new Error("\uD504\uB7F0\uD2B8\uC5D4\uB4DC \uC11C\uBC84\uC5D0 \uC5F0\uACB0\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
}
var frontendShellCache = { value: null, expiresAt: 0, staleUntil: 0 };
var frontendShellPending = null;
var frontendAssetCache = /* @__PURE__ */ new Map();
var frontendAssetPending = /* @__PURE__ */ new Map();
function makeFrontendAssetResponse(entry, cacheState) {
  const headers = new Headers(getSecurityHeaders());
  headers.set("Content-Type", entry.contentType || "application/octet-stream");
  headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=86400");
  headers.set("X-AonWiki-Asset-Proxy", "1");
  headers.set("X-AonWiki-Asset-Cache", cacheState);
  return new Response(entry.body.slice(), { status: 200, headers });
}
async function loadFrontendAsset(assetUrl, acceptHeader) {
  const now = Date.now();
  const cached = frontendAssetCache.get(assetUrl);
  if (cached && cached.expiresAt > now) return { entry: cached, cacheState: "HIT" };
  if (frontendAssetPending.has(assetUrl)) return frontendAssetPending.get(assetUrl);
  const pending = (async () => {
    let upstream;
    try {
      upstream = await fetchFrontendWithRetry(assetUrl, {
        headers: { "Accept": acceptHeader || "*/*" },
        cf: { cacheTtl: 3600, cacheEverything: true }
      });
    } catch (error) {
      if (cached && cached.staleUntil > Date.now()) {
        console.warn("AonWiki static asset using stale cache after upstream network failure:", assetUrl);
        return { entry: cached, cacheState: "STALE" };
      }
      throw error;
    }
    if (!upstream.ok) {
      if (FRONTEND_TRANSIENT_STATUSES.has(upstream.status) && cached && cached.staleUntil > Date.now()) {
        console.warn("AonWiki static asset using stale cache after upstream HTTP failure:", upstream.status, assetUrl);
        return { entry: cached, cacheState: "STALE" };
      }
      return { status: upstream.status };
    }
    const body = new Uint8Array(await upstream.arrayBuffer());
    const entry = {
      body,
      contentType: upstream.headers.get("Content-Type") || "application/octet-stream",
      expiresAt: Date.now() + 15 * 60 * 1e3,
      staleUntil: Date.now() + 24 * 60 * 60 * 1e3
    };
    if (body.byteLength <= 2 * 1024 * 1024) {
      frontendAssetCache.set(assetUrl, entry);
      while (frontendAssetCache.size > 8) {
        const oldest = frontendAssetCache.keys().next().value;
        if (oldest) frontendAssetCache.delete(oldest);
        else break;
      }
    }
    return { entry, cacheState: "MISS" };
  })().finally(() => frontendAssetPending.delete(assetUrl));
  frontendAssetPending.set(assetUrl, pending);
  return pending;
}
async function loadFrontendShell(env) {
  if (frontendShellCache.value && frontendShellCache.expiresAt > Date.now()) return frontendShellCache.value;
  if (frontendShellPending) return frontendShellPending;
  const staleShell = frontendShellCache.value && frontendShellCache.staleUntil > Date.now() ? frontendShellCache.value : null;
  frontendShellPending = (async () => {
    const frontendOrigin = String(env.FRONTEND_ORIGIN || "https://hiakdhs323-cmd.github.io/aon").replace(/\/$/, "");
    const hasLocalAssets = Boolean(env.ASSETS && typeof env.ASSETS.fetch === "function");
    let localAssetError = null;
    if (hasLocalAssets) {
      try {
        const localOrigin = "https://aonwiki-assets.local";
        const localResponse = await env.ASSETS.fetch(new Request(localOrigin + "/index.html", {
          headers: { "Accept": "text/html" }
        }));
        if (!localResponse.ok) {
          localAssetError = new Error("Worker Assets index.html returned " + localResponse.status);
        } else {
          const localShell = await localResponse.text();
          if (!localShell.includes('id="article"')) {
            localAssetError = new Error("Worker Assets index.html has no article template");
          } else {
            const value = {
              shell: rewriteFrontendAssets(localShell, localOrigin, true),
              origin: localOrigin
            };
            frontendShellCache = {
              value,
              expiresAt: Date.now() + 15 * 60 * 1e3,
              staleUntil: Date.now() + 24 * 60 * 60 * 1e3
            };
            return value;
          }
        }
      } catch (error) {
        localAssetError = error;
      }
      console.warn(
        "AonWiki local frontend shell unavailable; falling back to FRONTEND_ORIGIN:",
        localAssetError?.message || localAssetError
      );
    }
    try {
      const upstream = await fetchFrontendWithRetry(
        frontendOrigin + "/?aonwiki-shell=20261115-static-shell-fallback-v1",
        { headers: { "Accept": "text/html" }, cf: { cacheTtl: 300, cacheEverything: true } }
      );
      if (!upstream.ok) {
        const error = new Error("\uD504\uB7F0\uD2B8\uC5D4\uB4DC HTML\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4: " + upstream.status);
        error.status = FRONTEND_TRANSIENT_STATUSES.has(upstream.status) ? 503 : upstream.status;
        throw error;
      }
      const shell = await upstream.text();
      if (!shell.includes('id="article"')) {
        const error = new Error("\uD504\uB7F0\uD2B8\uC5D4\uB4DC \uBB38\uC11C \uD15C\uD50C\uB9BF\uC5D0 article \uC601\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
        error.status = 502;
        throw error;
      }
      const value = {
        shell: rewriteFrontendAssets(shell, frontendOrigin, false),
        origin: frontendOrigin
      };
      frontendShellCache = {
        value,
        expiresAt: Date.now() + 15 * 60 * 1e3,
        staleUntil: Date.now() + 24 * 60 * 60 * 1e3
      };
      return value;
    } catch (error) {
      const transient = !Number(error?.status) || FRONTEND_TRANSIENT_STATUSES.has(Number(error.status));
      if (staleShell && transient) {
        console.warn("AonWiki serving the last known-good frontend shell:", error?.message || error);
        frontendShellCache.expiresAt = Date.now() + 15 * 1e3;
        return staleShell;
      }
      if (localAssetError && !Number(error?.status)) error.status = 503;
      throw error;
    }
  })().finally(() => {
    frontendShellPending = null;
  });
  return frontendShellPending;
}
async function findWikiPage(env, title) {
  let page = await env.DB.prepare("SELECT title, content, created_at, updated_at FROM pages WHERE title = ?").bind(title).first();
  if (!page) {
    await ensurePageAliasSchema(env);
    const alias = await env.DB.prepare("SELECT title FROM page_aliases WHERE alias = ? COLLATE NOCASE").bind(title).first();
    if (alias) page = await env.DB.prepare("SELECT title, content, created_at, updated_at FROM pages WHERE title = ?").bind(alias.title).first();
  }
  return page;
}
function publicSiteOrigin(request, env) {
  return new URL(request.url).origin.replace(/\/$/, "");
}
function escapeXml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&apos;", '"': "&quot;" })[char]);
}
function sitemapLastmod(value) {
  const raw = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(raw)) return "";
  const timestamp = Date.parse(raw);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : "";
}
async function renderSitemapXml(request, env) {
  const origin = publicSiteOrigin(request, env);
  const result = await env.DB.prepare("SELECT title, updated_at FROM pages ORDER BY title COLLATE NOCASE ASC LIMIT 5000").all();
  const urls = [`<url><loc>${escapeXml(origin + "/")}</loc></url>`];
  for (const page of result.results || []) {
    const title = String(page.title || "").trim();
    if (!title || title === "\uB300\uBB38") continue;
    const lastmod = sitemapLastmod(page.updated_at);
    urls.push("<url><loc>" + escapeXml(origin + "/w/" + encodeURIComponent(title)) + "</loc>" + (lastmod ? "<lastmod>" + escapeXml(lastmod) + "</lastmod>" : "") + "</url>");
  }
  return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls.join("") + "</urlset>";
}
function decodePreviewEntities(value) {
  return String(value || "").replace(/&#x([0-9a-f]{1,8});?/gi, (_match, hex) => {
    const point = Number.parseInt(hex, 16);
    return point > 0 && point <= 1114111 && !(point >= 55296 && point <= 57343) ? String.fromCodePoint(point) : " ";
  }).replace(/&#([0-9]{1,8});?/g, (_match, decimal) => {
    const point = Number.parseInt(decimal, 10);
    return point > 0 && point <= 1114111 && !(point >= 55296 && point <= 57343) ? String.fromCodePoint(point) : " ";
  }).replace(/&nbsp;|&ensp;|&emsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&apos;|&#39;/gi, "'").replace(/&hellip;/gi, "\u2026").replace(/&ndash;/gi, "\u2013").replace(/&mdash;/gi, "\u2014").replace(/&lsquo;|&rsquo;/gi, "'").replace(/&ldquo;|&rdquo;/gi, '"');
}
function renderedHtmlToPreviewText(markup) {
  return decodePreviewEntities(String(markup || "").replace(/<!--[\s\S]*?-->/g, " ").replace(/<(script|style|noscript|svg|iframe)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ").replace(/<img\b[^>]*\balt=(["'])(.*?)\1[^>]*>/gi, " $2 ").replace(/<br\b[^>]*>|<\/(?:p|div|li|h[1-6]|tr|td|th|section|article|blockquote|pre|ul|ol|table|figure|figcaption)\s*>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/[\u00a0\s]+/g, " ").trim();
}
function namuSourceToPreviewText(source) {
  let value = String(source || "").replace(/<!--[\s\S]*?-->/g, " ").replace(/\[include\([\s\S]*?\)\]/gi, " ").replace(/^\s*\[\[(?:분류|category):[^\]]+\]\]\s*$/gim, " ").replace(/\[\[(?:분류|category):[^\]]+\]\]/gi, " ").replace(/\[\[(?:파일|file):([^\]|]+)(?:\|([^\]]*))?\]\]/gi, (_match, _filename, caption) => caption ? " " + caption + " " : " ").replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2").replace(/\[\[([^\]]+)\]\]/g, "$1").replace(/^\s*={1,6}\s*(.*?)\s*={1,6}\s*$/gm, "$1").replace(/^\s*\[\s*(?:목차|clearfix|tableofcontents)\s*\]\s*$/gim, " ").replace(/\[\*([^\]]*)\]/g, "$1").replace(/\{\{\{#!(?:wiki|folding|fold|if|linkcolor)\b[^\r\n]*(?:\r?\n)?/gi, " ").replace(/\{\{\{(?:#[\w-]+|\+\d+|-\d+)?\s*/g, " ").replace(/\}\}\}/g, " ").replace(/'''|''|~~|\^\^|,,/g, " ").replace(/<[^>]*>/g, " ").replace(/\|\|/g, " ").replace(/^\s*\|[-:| ]+\|\s*$/gm, " ");
  return decodePreviewEntities(value).replace(/[\u00a0\s]+/g, " ").trim();
}
function buildWikiTextFallbackHtml(sourcePreviewText) {
  const text = String(sourcePreviewText || "").trim();
  if (!text) return "";
  return '<p class="namumark-ssr-text-fallback">' + escapeHtml(text) + "</p>";
}
function buildWikiPageStructuredData({ title, description, url, siteUrl, createdAt, updatedAt }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": title,
    "headline": title,
    "description": description,
    "url": url,
    "inLanguage": "ko-KR",
    "isPartOf": {
      "@type": "WebSite",
      "name": "AonWiki",
      "alternateName": "\uC544\uC628 \uC704\uD0A4",
      "url": siteUrl
    },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "AonWiki", "item": siteUrl },
        { "@type": "ListItem", "position": 2, "name": title, "item": url }
      ]
    }
  };
  if (createdAt) data.datePublished = String(createdAt);
  if (updatedAt) data.dateModified = String(updatedAt);
  return data;
}
function shouldDeferHeavyWikiSSR(title, source) {
  const sourceText = String(source || "");
  return title === "\uC544\uC628" || sourceText.length > 6e3;
}
async function renderFullWikiDocument(request, env, title) {
  const { shell, origin } = await loadFrontendShell(env);
  const page = await findWikiPage(env, title);
  const found = Boolean(page);
  const actualTitle = found ? page.title : title;
  const linkColors = found ? await getPageLinkColors(env, actualTitle) : {};
  const sourceText = found ? String(page.content || "") : "";
  let clientRenderPending = found && shouldDeferHeavyWikiSSR(actualTitle, sourceText);
  let rendered = { html: "", metadata: {} };
  if (found && !clientRenderPending) {
    try {
      rendered = await renderNamuMarkupOnWorker(env, actualTitle, sourceText, linkColors);
    } catch (error) {
      console.warn("AonWiki full-document SSR switched to browser WASM:", actualTitle, error?.message || error);
      clientRenderPending = true;
    }
  }
  let protection = null;
  if (found) {
    await ensurePageProtectionSchema(env);
    protection = await env.DB.prepare("SELECT level, reason, protected_by, updated_at FROM page_protections WHERE title = ?").bind(actualTitle).first();
  }
  await ensureOfficialDocumentSchema(env);
  const official = found ? await env.DB.prepare("SELECT marked_by, updated_at FROM official_documents WHERE title = ?").bind(actualTitle).first() : null;
  const titleText = found ? actualTitle : actualTitle + " (\uBB38\uC11C \uC5C6\uC74C)";
  const renderedPreviewText = found && rendered.html ? renderedHtmlToPreviewText(rendered.html) : "";
  const sourcePreviewText = found ? namuSourceToPreviewText(sourceText) : "";
  const textFallbackHtml = found && clientRenderPending ? buildWikiTextFallbackHtml(sourcePreviewText) : "";
  const description = found ? (renderedPreviewText || sourcePreviewText || actualTitle + " \uBB38\uC11C").slice(0, 240) : "\uC544\uC9C1 \uC791\uC131\uB418\uC9C0 \uC54A\uC740 \uBB38\uC11C\uC785\uB2C8\uB2E4.";
  const siteUrl = new URL(request.url).origin + "/";
  const canonicalUrl = new URL(request.url).origin + "/w/" + encodeURIComponent(actualTitle);
  const pageStructuredData = buildWikiPageStructuredData({
    title: titleText + " - AonWiki",
    description,
    url: canonicalUrl,
    siteUrl,
    createdAt: found ? page.created_at : "",
    updatedAt: found ? page.updated_at : ""
  });
  const ssrUser = await currentUser(request, env);
  const ssrEditUser = ssrUser || anonymousEditorIdentity(request);
  const ssrEditDenied = found ? await checkPageEditPermission(env, ssrEditUser, actualTitle) : null;
  const state = {
    title: actualTitle,
    content: found ? String(page.content || "") : "",
    metadata: found ? mergeNamuRenderMetadata(rendered.metadata, page.content || "") : { categories: [], backlinks: [] },
    protection: { level: protection?.level || "none", reason: protection?.reason || "" },
    official: Boolean(official),
    canEdit: found ? !ssrEditDenied : false,
    exists: found,
    clientRenderPending
  };
  const protectionLabel = protection?.level === "admin" ? "\uAD00\uB9AC\uC790 \uD3B8\uC9D1 \uBCF4\uD638" : protection?.level === "registered" ? "\uD68C\uC6D0 \uD3B8\uC9D1 \uBCF4\uD638" : "";
  const protectionMessage = protectionLabel ? protection?.reason || (protection.level === "admin" ? "\uC774 \uBB38\uC11C\uB294 \uAD00\uB9AC\uC790\uB9CC \uD3B8\uC9D1\uD560 \uC218 \uC788\uB3C4\uB85D \uBCF4\uD638\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4." : "\uC774 \uBB38\uC11C\uB294 \uB85C\uADF8\uC778\uD55C \uD68C\uC6D0\uB9CC \uD3B8\uC9D1\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.") : "";
  const pageSeoTags = [
    '<meta name="description" content="' + escapeHtml(description) + '">',
    '<meta name="robots" content="' + (found ? "index,follow,max-snippet:-1,max-image-preview:large" : "noindex,follow") + '">',
    '<meta property="og:type" content="article">',
    '<meta property="og:site_name" content="AonWiki">',
    '<meta property="og:locale" content="ko_KR">',
    '<meta property="og:title" content="' + escapeHtml(titleText + " - AonWiki") + '">',
    '<meta property="og:description" content="' + escapeHtml(description) + '">',
    '<meta property="og:url" content="' + escapeHtml(canonicalUrl) + '">',
    '<meta name="twitter:card" content="summary">',
    '<meta name="twitter:title" content="' + escapeHtml(titleText + " - AonWiki") + '">',
    '<meta name="twitter:description" content="' + escapeHtml(description) + '">',
    '<link rel="canonical" href="' + escapeHtml(canonicalUrl) + '">',
    '<script type="application/ld+json" id="aonwiki-page-jsonld">' + safeJsonForHtml(pageStructuredData) + "<\/script>"
  ].join("\n");
  let html = shell.replace(/<title>[\s\S]*?<\/title>/i, "<title>" + escapeHtml(titleText) + " - AonWiki</title>").replace(/<meta name="description"[^>]*>\s*/gi, "").replace(/<meta name="robots"[^>]*>\s*/gi, "").replace(/<meta property="og:[^"]+"[^>]*>\s*/gi, "").replace(/<meta name="twitter:[^"]+"[^>]*>\s*/gi, "").replace(/<link rel="canonical"[^>]*>\s*/gi, "").replace(/<script[^>]*id="aonwiki-(?:website|page)-jsonld"[^>]*>[\s\S]*?<\/script>\s*/gi, "");
  const themeColorPattern = /<meta name="theme-color"[^>]*>/i;
  if (themeColorPattern.test(html)) {
    html = html.replace(themeColorPattern, (match) => match + "\n" + pageSeoTags);
  } else {
    html = html.replace(/<\/head>/i, pageSeoTags + "\n</head>");
  }
  html = html.replace("<body>", '<body data-ssr-page="true">').replace('<section id="home-view" class="home-view">', '<section id="home-view" class="home-view" hidden>').replace('<section id="document-view" class="document-view" hidden>', '<section id="document-view" class="document-view">').replace('<h1 id="title"></h1>', '<h1 id="title">' + escapeHtml(titleText) + "</h1>").replace('<span id="crumb"></span>', '<span id="crumb">' + escapeHtml(actualTitle) + "</span>").replace('<span id="template-status" class="template-status" hidden>\uACF5\uC2DD \uD2C0 \uBB38\uC11C</span>', state.official && /^(?:틀|template):/i.test(actualTitle) ? '<span id="template-status" class="template-status">\uACF5\uC2DD \uD2C0 \uBB38\uC11C</span>' : '<span id="template-status" class="template-status" hidden>\uACF5\uC2DD \uD2C0 \uBB38\uC11C</span>').replace('<span id="official-status" class="official-status" hidden>\uACF5\uC2DD \uBB38\uC11C</span>', state.official ? '<span id="official-status" class="official-status">\uACF5\uC2DD \uBB38\uC11C</span>' : '<span id="official-status" class="official-status" hidden>\uACF5\uC2DD \uBB38\uC11C</span>').replace('<span id="protection-status" class="protection-status" hidden></span>', protectionLabel ? '<span id="protection-status" class="protection-status">' + escapeHtml(protectionLabel) + "</span>" : '<span id="protection-status" class="protection-status" hidden></span>').replace('<div id="protection-notice" class="protection-notice" role="status" aria-live="polite" hidden></div>', protectionMessage ? '<div id="protection-notice" class="protection-notice" role="status" aria-live="polite">' + escapeHtml(protectionMessage) + "</div>" : '<div id="protection-notice" class="protection-notice" role="status" aria-live="polite" hidden></div>').replace('<div id="message" class="notice" role="status"></div>', '<div id="message" class="notice" role="status">' + (found ? "" : "\uC774 \uBB38\uC11C\uB294 \uC544\uC9C1 \uC874\uC7AC\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uB85C\uADF8\uC778 \uD6C4 \uC0C8 \uBB38\uC11C\uB97C \uC791\uC131\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.") + "</div>").replace('<article id="article" class="namumark-content-host"></article>', '<article id="article" class="namumark-wasm-content"' + (clientRenderPending ? ' data-client-render-pending="true"' : "") + ">" + (rendered.html || textFallbackHtml) + "</article>").replace('id="edit" class="nav-item" type="button" hidden', protection?.level === "admin" ? 'id="edit" class="nav-item" type="button" hidden' : 'id="edit" class="nav-item" type="button"').replace('id="history" class="nav-item" type="button" hidden', 'id="history" class="nav-item" type="button"' + (found ? "" : " hidden")).replace('id="upload" class="nav-item" type="button" hidden', 'id="upload" class="nav-item" type="button"' + (found ? "" : " hidden")).replace('id="backlinks-tab" type="button" hidden', 'id="backlinks-tab" type="button"' + (found ? "" : " hidden"));
  if (!found) {
    html = html.replace('id="heading-edit" class="title-button" type="button"', 'id="heading-edit" class="title-button" type="button" hidden');
    html = html.replace('<button id="edit" class="nav-item" type="button">\uBB38\uC11C \uD3B8\uC9D1</button>', '<button id="edit" class="nav-item" type="button">\uBB38\uC11C \uB9CC\uB4E4\uAE30</button>');
  }
  const appScriptPattern = /<script\b(?=[^>]*\bsrc=["'](?:\/aon)?\/?(?:app\.bundle\.js|app\.js)(?:\?[^"']*)?["'])[^>]*>\s*<\/script>/i;
  const appScriptMatch = html.match(appScriptPattern);
  if (!appScriptMatch) throw new Error("\uD504\uB7F0\uD2B8\uC5D4\uB4DC app.bundle.js/app.js \uC2A4\uD06C\uB9BD\uD2B8 \uC704\uCE58\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
  const ssrStateScript = '<script id="aonwiki-ssr-state" type="application/json">' + safeJsonForHtml(state) + "<\/script>";
  html = html.replace(appScriptPattern, ssrStateScript + "\n" + appScriptMatch[0]);
  return new Response(html, {
    status: found ? 200 : 404,
    headers: { ...getSecurityHeaders(), "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-AonWiki-Render": clientRenderPending ? "text-fallback" : "full-document" }
  });
}
var PASSWORD_HASH_ITERATIONS = 6e5;
var userSchemaPromise = null;
async function ensureUserSchema(env) {
  if (!userSchemaPromise) {
    userSchemaPromise = (async () => {
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL, password_iterations INTEGER NOT NULL DEFAULT 100000)").run();
      const columns = await env.DB.prepare("PRAGMA table_info(users)").all();
      if (!(columns.results || []).some((column) => column.name === "password_iterations")) {
        await env.DB.prepare("ALTER TABLE users ADD COLUMN password_iterations INTEGER NOT NULL DEFAULT 100000").run();
      }
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL, absolute_expires_at TEXT NOT NULL DEFAULT '')").run();
      const sessionColumns = await env.DB.prepare("PRAGMA table_info(sessions)").all();
      if (!(sessionColumns.results || []).some((column) => column.name === "absolute_expires_at")) {
        await env.DB.prepare("ALTER TABLE sessions ADD COLUMN absolute_expires_at TEXT NOT NULL DEFAULT ''").run();
      }
      await env.DB.prepare("UPDATE sessions SET absolute_expires_at = expires_at WHERE absolute_expires_at IS NULL OR absolute_expires_at = ''").run();
    })().catch((error) => {
      userSchemaPromise = null;
      throw error;
    });
  }
  await userSchemaPromise;
}
var MAX_PBKDF2_ITERATIONS_PER_CALL = 1e5;
async function passwordHash(password, salt, iterations = PASSWORD_HASH_ITERATIONS) {
  const rounds = Math.max(1e5, Math.min(1e6, Number(iterations) || PASSWORD_HASH_ITERATIONS));
  const encoder = new TextEncoder();
  if (rounds <= MAX_PBKDF2_ITERATIONS_PER_CALL) {
    const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: rounds,
      hash: "SHA-256"
    }, material, 256);
    return [...new Uint8Array(bits)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  let value = encoder.encode(password);
  let remaining = rounds;
  let stage = 0;
  while (remaining > 0) {
    const stageRounds = Math.min(MAX_PBKDF2_ITERATIONS_PER_CALL, remaining);
    const material = await crypto.subtle.importKey("raw", value, "PBKDF2", false, ["deriveBits"]);
    const stageSalt = encoder.encode("AonWiki-PBKDF2-SHA256-chain-v1:" + String(salt) + ":" + stage);
    const bits = await crypto.subtle.deriveBits({
      name: "PBKDF2",
      salt: stageSalt,
      iterations: stageRounds,
      hash: "SHA-256"
    }, material, 256);
    value = new Uint8Array(bits);
    remaining -= stageRounds;
    stage += 1;
  }
  return [...value].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = getCors(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (isStateChangingMethod(request.method) && url.pathname.startsWith("/api/") && !isTrustedStateChangingRequest(request, env)) return response({ error: "\uBCF4\uC548\uC0C1 \uD5C8\uC6A9\uB418\uC9C0 \uC54A\uC740 \uC694\uCCAD\uC785\uB2C8\uB2E4." }, 403, cors);
    const declaredLength = Number(request.headers.get("Content-Length") || 0);
    if (declaredLength > 2 * 1024 * 1024) return response({ error: "\uC694\uCCAD \uBCF8\uBB38\uC740 2MB \uC774\uD558\uB9CC \uD5C8\uC6A9\uB429\uB2C8\uB2E4." }, 413, cors);
    if (isStateChangingMethod(request.method) && !request.headers.get("Content-Length")) {
      const probe = await request.clone().arrayBuffer();
      if (probe.byteLength > 2 * 1024 * 1024) return response({ error: "\uC694\uCCAD \uBCF8\uBB38\uC740 2MB \uC774\uD558\uB9CC \uD5C8\uC6A9\uB429\uB2C8\uB2E4." }, 413, cors);
    }
    try {
      const passivePagePoll = url.pathname === "/api/pages" && url.searchParams.has("created_after");
      if (!passivePagePoll && (url.pathname.startsWith("/api/") || url.pathname === "/" || url.pathname.startsWith("/w/"))) {
        await refreshSessionIdleTimeout(request, env);
      }
      if (request.method === "GET" && url.pathname === "/favicon.ico") {
        const headers = new Headers(getSecurityHeaders());
        headers.set("Location", new URL("/favicon.png", url.origin).toString());
        headers.set("Cache-Control", "public, max-age=86400");
        return new Response(null, { status: 302, headers });
      }
      if (request.method === "GET" && url.pathname === "/robots.txt") {
        const origin = publicSiteOrigin(request, env);
        return new Response("User-agent: *\nAllow: /\nSitemap: " + origin + "/sitemap.xml\n", { status: 200, headers: { ...getSecurityHeaders(), "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" } });
      }
      if (request.method === "GET" && url.pathname === "/sitemap.xml") {
        const xml = await renderSitemapXml(request, env);
        return new Response(xml, { status: 200, headers: { ...getSecurityHeaders(), "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300" } });
      }
      const staticFiles = /* @__PURE__ */ new Set(["style.css", "app.bundle.js", "theme.js", "namumark-aon.css", "namumark-interactions-aon.css", "editor-monaco/monaco.js", "editor-monaco/monaco.worker.js", "editor-monaco/monaco.css", "aonwiki-mark.svg", "favicon.png"]);
      const assetPath = url.pathname.startsWith("/aon/") ? url.pathname.slice("/aon/".length) : url.pathname.slice(1);
      const assetName = staticFiles.has(assetPath) ? assetPath : "";
      if (request.method === "GET" && staticFiles.has(assetName)) {
        if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
          try {
            const localAssetUrl = new URL("/" + assetName, request.url);
            localAssetUrl.search = url.search;
            const localAsset = await env.ASSETS.fetch(new Request(localAssetUrl.toString(), { method: "GET", headers: request.headers }));
            if (localAsset.ok) {
              const headers = new Headers(localAsset.headers);
              headers.set("Cache-Control", isCacheableStaticAsset(assetName) ? LONG_LIVED_STATIC_CACHE_CONTROL : localAsset.headers.get("Cache-Control") || "public, max-age=0, must-revalidate");
              headers.set("X-AonWiki-Asset-Proxy", "1");
              headers.set("X-AonWiki-Asset-Cache", "WORKER-ASSETS");
              return new Response(localAsset.body, { status: localAsset.status, headers });
            }
            if (localAsset.status !== 404) return localAsset;
          } catch (error) {
            console.warn("AonWiki local asset fetch failed; trying Pages compatibility origin:", assetName, error?.message || error);
          }
        }
        const origin = String(env.FRONTEND_ORIGIN || "https://hiakdhs323-cmd.github.io/aon").replace(/\/$/, "");
        const assetCacheVersion = assetName === "style.css" ? "20261115-editor-workbench-v5" : assetName.startsWith("editor-monaco/") ? "20261114-monaco-0570" : "20261115-editor-workbench-v5";
        const assetQuery = url.search ? url.search + "&" : "?";
        const assetUrl = origin + "/" + assetName + assetQuery + "aonwiki_asset=" + assetCacheVersion;
        try {
          const result = await loadFrontendAsset(assetUrl, request.headers.get("Accept") || "*/*");
          if (result.entry) return makeFrontendAssetResponse(result.entry, result.cacheState);
          const status = Number(result.status) || 502;
          const message = status >= 500 ? "\uC815\uC801 \uB9AC\uC18C\uC2A4 \uC11C\uBC84\uAC00 \uC77C\uC2DC\uC801\uC73C\uB85C \uC751\uB2F5\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." : "\uC815\uC801 \uB9AC\uC18C\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.";
          const headers = new Headers(getSecurityHeaders());
          headers.set("Content-Type", "text/plain; charset=utf-8");
          headers.set("Cache-Control", "no-store");
          headers.set("Retry-After", "2");
          headers.set("X-AonWiki-Asset-Proxy", "1");
          return new Response(message, { status, headers });
        } catch (error) {
          console.error("AonWiki static asset proxy failed:", assetName, error?.message || error);
          const headers = new Headers(getSecurityHeaders());
          headers.set("Content-Type", "text/plain; charset=utf-8");
          headers.set("Cache-Control", "no-store");
          headers.set("Retry-After", "2");
          headers.set("X-AonWiki-Asset-Proxy", "1");
          return new Response("\uC815\uC801 \uB9AC\uC18C\uC2A4 \uC11C\uBC84\uC5D0 \uC77C\uC2DC\uC801\uC73C\uB85C \uC5F0\uACB0\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.", { status: 503, headers });
        }
      }
      if (request.method === "GET" && url.pathname.startsWith("/w/")) {
        let title = "";
        try {
          title = decodeURIComponent(url.pathname.slice(3));
        } catch {
          return new Response("\uC798\uBABB\uB41C \uBB38\uC11C \uC8FC\uC18C\uC785\uB2C8\uB2E4.", { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
        }
        title = cleanTitle(title);
        if (!title) return new Response("\uC798\uBABB\uB41C \uBB38\uC11C \uC8FC\uC18C\uC785\uB2C8\uB2E4.", { status: 400 });
        if (await authRateLimited(request, env, "document-ssr", 180, 60 * 1e3)) {
          return new Response("\uBB38\uC11C \uC694\uCCAD\uC774 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694.", {
            status: 429,
            headers: { ...getSecurityHeaders(), "Content-Type": "text/plain; charset=utf-8", "Retry-After": "60" }
          });
        }
        try {
          return await renderFullWikiDocument(request, env, title);
        } catch (error) {
          console.error("AonWiki document SSR failed; serving client-side route fallback", {
            title,
            message: String(error?.message || error || "unknown")
          });
          try {
            const { shell } = await loadFrontendShell(env);
            const headers = new Headers(getSecurityHeaders());
            headers.set("Content-Type", "text/html; charset=utf-8");
            headers.set("Cache-Control", "no-store");
            headers.set("X-AonWiki-Render", "client-fallback");
            headers.set("X-AonWiki-SSR-Fallback", "1");
            return new Response(shell, { status: 200, headers });
          } catch (fallbackError) {
            console.error("AonWiki client-side document fallback failed", {
              title,
              message: String(fallbackError?.message || fallbackError || "unknown")
            });
            const headers = new Headers(getSecurityHeaders());
            headers.set("Content-Type", "text/plain; charset=utf-8");
            headers.set("Cache-Control", "no-store");
            headers.set("Retry-After", "2");
            return new Response("\uBB38\uC11C\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694.", { status: 503, headers });
          }
        }
      }
      if (request.method === "GET" && url.pathname.toLowerCase() === "/search") {
        const { shell } = await loadFrontendShell(env);
        return new Response(shell, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "X-AonWiki-Render": "search-shell"
          }
        });
      }
      if (request.method === "GET" && url.pathname === "/") {
        const { shell } = await loadFrontendShell(env);
        return new Response(shell, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "X-AonWiki-Render": "home-shell"
          }
        });
      }
      if (url.pathname === "/api/logout" && request.method === "POST") {
        const token = readCookie(request, SESSION_COOKIE_NAME);
        if (/^[a-f0-9]{64}$/i.test(token)) {
          await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
        }
        return response({ ok: true }, 200, { ...cors, "Set-Cookie": clearSessionCookie() });
      }
      if (url.pathname === "/api/me" && request.method === "GET") {
        const user = await currentUser(request, env);
        const anonymous = user ? null : anonymousEditorIdentity(request);
        return response({
          authenticated: Boolean(user),
          username: user?.username || null,
          role: user?.role || "anonymous",
          isAdmin: Boolean(user?.isAdmin),
          ip: anonymous?.ip || null
        }, 200, cors);
      }
      if (url.pathname === "/api/admin/bootstrap-account" && request.method === "POST") {
        if (!env.ADMIN_BOOTSTRAP_SECRET || env.ADMIN_BOOTSTRAP_SECRET.length < 32) return response({ error: "\uAD00\uB9AC\uC790 \uCD08\uAE30 \uC124\uC815\uC774 \uC11C\uBC84\uC5D0\uC11C \uD65C\uC131\uD654\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4." }, 503, cors);
        if (await authRateLimited(request, env, "admin-bootstrap", 5, 60 * 60 * 1e3)) return response({ error: "\uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uB098\uC911\uC5D0 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        const supplied = request.headers.get("X-Admin-Bootstrap-Secret") || "";
        if (!constantTimeEqual(supplied, env.ADMIN_BOOTSTRAP_SECRET)) return response({ error: "\uC778\uC99D\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4." }, 403, cors);
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS wiki_admins (user_id TEXT PRIMARY KEY NOT NULL, granted_at TEXT NOT NULL, granted_by TEXT NOT NULL)").run();
        const alreadyGranted = await env.DB.prepare("SELECT user_id FROM wiki_admins LIMIT 1").first();
        if (alreadyGranted) return response({ error: "\uCD5C\uCD08 \uAD00\uB9AC\uC790 \uB4F1\uB85D\uC740 \uC774\uBBF8 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4." }, 409, cors);
        const body = await readJsonBody(request);
        const username = String(body.username || "").trim();
        if (username.toLocaleLowerCase() !== "\uC544\uC628") return response({ error: "\uCD5C\uCD08 \uAD00\uB9AC\uC790 \uB4F1\uB85D \uB300\uC0C1\uC740 \uC544\uC628 \uACC4\uC815\uC73C\uB85C \uC81C\uD55C\uB429\uB2C8\uB2E4." }, 403, cors);
        const target = await env.DB.prepare("SELECT id, username FROM users WHERE username = ? COLLATE NOCASE").bind("\uC544\uC628").first();
        if (!target) return response({ error: "\uD574\uB2F9 \uACC4\uC815\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uBA3C\uC800 \uACC4\uC815\uC744 \uB9CC\uB4E0 \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 404, cors);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const result = await env.DB.prepare("INSERT INTO wiki_admins (user_id, granted_at, granted_by) SELECT ?, ?, 'one-time-bootstrap' WHERE NOT EXISTS (SELECT 1 FROM wiki_admins)").bind(target.id, now).run();
        if (!result.success || Number(result.meta?.changes || 0) !== 1) return response({ error: "\uCD5C\uCD08 \uAD00\uB9AC\uC790 \uB4F1\uB85D\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uC774\uBBF8 \uB4F1\uB85D\uB418\uC5C8\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }, 409, cors);
        return response({ ok: true, username: target.username, role: "admin", message: "\uCD5C\uCD08 \uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uB4F1\uB85D\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uCD08\uAE30 \uC124\uC815 \uBE44\uBC00\uAC12\uC740 \uC989\uC2DC \uD3D0\uAE30\uD558\uC138\uC694." }, 200, cors);
      }
      if (url.pathname === "/api/admin/token/rotate" && request.method === "POST") {
        const adminUser = await currentUser(request, env);
        if (!adminUser || !adminUser.isAdmin) return response({ error: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4." }, 403, cors);
        const token = makeAdminToken();
        await ensureAdminTokenTable(env);
        await env.DB.prepare("INSERT INTO admin_tokens (id, token_hash, updated_at) VALUES ('primary', ?, ?) ON CONFLICT(id) DO UPDATE SET token_hash = excluded.token_hash, updated_at = excluded.updated_at").bind(await sha256(token), (/* @__PURE__ */ new Date()).toISOString()).run();
        return response({ ok: true, token, message: "\uC0C8 \uAD00\uB9AC\uC790 \uD1A0\uD070\uC774 \uBC1C\uAE09\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC774 \uAC12\uC740 \uB2E4\uC2DC \uD45C\uC2DC\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." }, 200, cors);
      }
      if (url.pathname === "/api/home" && request.method === "GET") {
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS wiki_settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL, editor TEXT NOT NULL DEFAULT '')").run();
        const result = await env.DB.prepare("SELECT key, value FROM wiki_settings WHERE key IN ('home_title','home_tagline','home_notice','home_content','home_search_hint','home_list_title','home_bottom_title','home_bottom_text')").all();
        const settings = Object.fromEntries((result.results || []).map((row) => [row.key, row.value]));
        return response({ settings: {
          title: settings.home_title || "AonWiki",
          tagline: settings.home_tagline || "\uD568\uAED8 \uB9CC\uB4DC\uB294 \uC9C0\uC2DD \uBC31\uACFC\uC0AC\uC804",
          notice: settings.home_notice || "",
          content: settings.home_content || "",
          searchHint: settings.home_search_hint || "\uAC80\uC0C9\uCC3D\uC5D0\uC11C \uBB38\uC11C\uB97C \uCC3E\uAC70\uB098 \uC544\uB798 \uBAA9\uB85D\uC5D0\uC11C \uC6D0\uD558\uB294 \uBB38\uC11C\uB97C \uC120\uD0DD\uD558\uC138\uC694.",
          listTitle: settings.home_list_title || "\uCD5C\uADFC \uC218\uC815\uB41C \uBB38\uC11C",
          bottomTitle: settings.home_bottom_title || "\uBB38\uC11C\uAC00 \uC5C6\uB098\uC694?",
          bottomText: settings.home_bottom_text || "\uB85C\uADF8\uC778\uD55C \uB4A4 \uC0C8 \uBB38\uC11C\uB97C \uB9CC\uB4E4\uC5B4 \uC9C0\uC2DD\uC744 \uACF5\uC720\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."
        } }, 200, cors);
      }
      if (url.pathname === "/api/home" && request.method === "PUT") {
        const user = await currentUser(request, env);
        if (!user?.isAdmin) return response({ error: "\uB300\uBB38\uC744 \uC218\uC815\uD558\uB824\uBA74 \uC704\uD0A4 \uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4." }, 403, cors);
        const body = await readJsonBody(request);
        const settings = {
          home_title: String(body.title || "AonWiki").trim().slice(0, 80),
          home_tagline: String(body.tagline || "").trim().slice(0, 200),
          home_notice: String(body.notice || "").trim().slice(0, 2e3),
          home_content: String(body.content || "").slice(0, 2e5),
          home_search_hint: String(body.searchHint || "").trim().slice(0, 300),
          home_list_title: String(body.listTitle || "").trim().slice(0, 80),
          home_bottom_title: String(body.bottomTitle || "").trim().slice(0, 80),
          home_bottom_text: String(body.bottomText || "").trim().slice(0, 500)
        };
        const now = (/* @__PURE__ */ new Date()).toISOString();
        for (const [key, value] of Object.entries(settings)) {
          await env.DB.prepare("INSERT INTO wiki_settings (key, value, updated_at, editor) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, editor = excluded.editor").bind(key, value, now, user.username).run();
        }
        return response({ ok: true, updated_at: now }, 200, cors);
      }
      if (url.pathname === "/api/page/protection" && request.method === "PUT") {
        const user = await currentUser(request, env);
        if (!user?.isAdmin) return response({ error: "\uD3B8\uC9D1 \uBCF4\uD638\uB97C \uC124\uC815\uD558\uB824\uBA74 \uC704\uD0A4 \uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4." }, 403, cors);
        const body = await readJsonBody(request);
        const title = cleanTitle(body.title);
        const level = String(body.level || "none");
        const reason = String(body.reason || "").trim().slice(0, 300);
        if (!title || title === "\uB300\uBB38") return response({ error: "\uBCF4\uD638\uD560 \uC218 \uC5C6\uB294 \uBB38\uC11C\uC785\uB2C8\uB2E4." }, 400, cors);
        if (!["none", "registered", "admin"].includes(level)) return response({ error: "\uC62C\uBC14\uB978 \uBCF4\uD638 \uC218\uC900\uC744 \uC120\uD0DD\uD558\uC138\uC694." }, 400, cors);
        const page = await env.DB.prepare("SELECT title FROM pages WHERE title = ?").bind(title).first();
        if (!page) return response({ error: "\uBB38\uC11C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        await ensurePageProtectionSchema(env);
        if (level === "none") {
          await env.DB.prepare("DELETE FROM page_protections WHERE title = ?").bind(title).run();
          return response({ ok: true, title, protection: { level: "none", reason: "", protectedBy: user.username } }, 200, cors);
        }
        const now = (/* @__PURE__ */ new Date()).toISOString();
        await env.DB.prepare("INSERT INTO page_protections (title, level, reason, protected_by, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(title) DO UPDATE SET level = excluded.level, reason = excluded.reason, protected_by = excluded.protected_by, updated_at = excluded.updated_at").bind(title, level, reason, user.username, now).run();
        return response({ ok: true, title, protection: { level, reason, protectedBy: user.username, updatedAt: now } }, 200, cors);
      }
      if (url.pathname === "/api/page/official" && request.method === "PUT") {
        const user = await currentUser(request, env);
        if (!user?.isAdmin) return response({ error: "\uACF5\uC2DD \uBB38\uC11C\uB97C \uC9C0\uC815\uD558\uAC70\uB098 \uD574\uC81C\uD558\uB824\uBA74 \uC704\uD0A4 \uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4." }, 403, cors);
        const body = await readJsonBody(request);
        const title = cleanTitle(body.title);
        const official = Boolean(body.official);
        if (!title || title === "\uB300\uBB38") return response({ error: "\uACF5\uC2DD \uBB38\uC11C\uB85C \uC9C0\uC815\uD560 \uC218 \uC5C6\uB294 \uBB38\uC11C\uC785\uB2C8\uB2E4." }, 400, cors);
        const page = await env.DB.prepare("SELECT title FROM pages WHERE title = ?").bind(title).first();
        if (!page) return response({ error: "\uBB38\uC11C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        await ensureOfficialDocumentSchema(env);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        if (!official) {
          await env.DB.prepare("DELETE FROM official_documents WHERE title = ?").bind(title).run();
          return response({ ok: true, title, official: false, officialMarkedBy: user.username, officialUpdatedAt: now }, 200, cors);
        }
        await env.DB.prepare("INSERT INTO official_documents (title, marked_by, updated_at) VALUES (?, ?, ?) ON CONFLICT(title) DO UPDATE SET marked_by = excluded.marked_by, updated_at = excluded.updated_at").bind(title, user.username, now).run();
        return response({ ok: true, title, official: true, officialMarkedBy: user.username, officialUpdatedAt: now }, 200, cors);
      }
      if (url.pathname === "/api/page" && request.method === "DELETE") {
        const user = await currentUser(request, env);
        if (!user?.isAdmin) return response({ error: "\uBB38\uC11C\uB97C \uC0AD\uC81C\uD558\uB824\uBA74 \uC704\uD0A4 \uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4." }, 403, cors);
        const title = cleanTitle(url.searchParams.get("title"));
        if (!title || title === "\uB300\uBB38") return response({ error: "\uC0AD\uC81C\uD560 \uC218 \uC5C6\uB294 \uBB38\uC11C\uC785\uB2C8\uB2E4." }, 400, cors);
        await env.DB.prepare("DELETE FROM pages WHERE title = ?").bind(title).run();
        await ensurePageLinkColorsSchema(env);
        await env.DB.prepare("DELETE FROM page_link_colors WHERE title = ?").bind(title).run();
        invalidateNamuServerIndexes();
        await clearPersistentNamuRenderCache(env);
        await env.DB.prepare("DELETE FROM revisions WHERE title = ?").bind(title).run();
        return response({ ok: true, title }, 200, cors);
      }
      if (url.pathname === "/api/health" && request.method === "GET") {
        return response({ ok: true, service: "AonWiki API" }, 200, cors);
      }
      if (url.pathname === "/api/account/password" && request.method === "POST") {
        if (await authRateLimited(request, env, "password-change", 5, 15 * 60 * 1e3)) return response({ error: "\uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD \uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. 15\uBD84 \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        const user = await getSessionUser(request, env, true);
        if (!user) return response({ error: "\uC77C\uBC18 \uACC4\uC815\uC73C\uB85C \uB85C\uADF8\uC778\uD55C \uB4A4 \uBE44\uBC00\uBC88\uD638\uB97C \uBCC0\uACBD\uD558\uC138\uC694." }, 401, cors);
        const body = await readJsonBody(request);
        const currentPassword = String(body.currentPassword || "");
        const newPassword = String(body.newPassword || "");
        if (newPassword.length < 8 || newPassword.length > 200) {
          return response({ error: "\uC0C8 \uBE44\uBC00\uBC88\uD638\uB294 8~200\uC790\uB85C \uC124\uC815\uD558\uC138\uC694." }, 400, cors);
        }
        const currentHash = await passwordHash(currentPassword, user.salt, user.password_iterations || 1e5);
        if (!constantTimeEqual(currentHash, user.password_hash)) {
          return response({ error: "\uD604\uC7AC \uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." }, 403, cors);
        }
        if (constantTimeEqual(await passwordHash(newPassword, user.salt), user.password_hash)) {
          return response({ error: "\uD604\uC7AC\uC640 \uB2E4\uB978 \uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        }
        const newSalt = crypto.randomUUID();
        const newHash = await passwordHash(newPassword, newSalt);
        await env.DB.prepare("UPDATE users SET salt = ?, password_hash = ?, password_iterations = ? WHERE id = ?").bind(newSalt, newHash, PASSWORD_HASH_ITERATIONS, user.id).run();
        await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id).run();
        const session = await createUserSession(env, user.id);
        return response({
          ok: true,
          username: user.username,
          idle_timeout_seconds: SESSION_IDLE_TIMEOUT_MS / 1e3,
          absolute_timeout_seconds: SESSION_ABSOLUTE_TIMEOUT_MS / 1e3,
          message: "\uBE44\uBC00\uBC88\uD638\uAC00 \uBCC0\uACBD\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uB2E4\uB978 \uAE30\uAE30\uC758 \uB85C\uADF8\uC778\uC740 \uBAA8\uB450 \uD574\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4."
        }, 200, { ...cors, "Set-Cookie": makeSessionCookie(session.token, request) });
      }
      if (url.pathname === "/api/register" && request.method === "POST") {
        if (await authRateLimited(request, env, "register", 5, 60 * 60 * 1e3)) return response({ error: "\uAC00\uC785 \uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uD55C \uC2DC\uAC04 \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        await ensureUserSchema(env);
        const body = await readJsonBody(request);
        const username = String(body.username || "").trim();
        const password = String(body.password || "");
        if (!/^[A-Za-z0-9가-힣_-]{2,20}$/.test(username)) return response({ error: "\uC544\uC774\uB514\uB294 \uD55C\uAE00/\uC601\uBB38/\uC22B\uC790/_/- 2~20\uC790\uB85C \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        if (password.length < 8 || password.length > 200) return response({ error: "\uBE44\uBC00\uBC88\uD638\uB294 8~200\uC790\uB85C \uC124\uC815\uD558\uC138\uC694." }, 400, cors);
        const exists = await env.DB.prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE").bind(username).first();
        if (exists) return response({ error: "\uC774\uBBF8 \uC0AC\uC6A9 \uC911\uC778 \uC544\uC774\uB514\uC785\uB2C8\uB2E4." }, 409, cors);
        const id = crypto.randomUUID(), salt = crypto.randomUUID(), now = (/* @__PURE__ */ new Date()).toISOString();
        const hash = await passwordHash(password, salt);
        await env.DB.prepare("INSERT INTO users (id,username,salt,password_hash,created_at,password_iterations) VALUES (?,?,?,?,?,?)").bind(id, username, salt, hash, now, PASSWORD_HASH_ITERATIONS).run();
        return response({ ok: true, message: "\uAC00\uC785 \uC644\uB8CC! \uB85C\uADF8\uC778\uD574 \uC8FC\uC138\uC694." }, 201, cors);
      }
      if (url.pathname === "/api/login" && request.method === "POST") {
        if (await authRateLimited(request, env, "login", 20, 15 * 60 * 1e3)) return response({ error: "\uB85C\uADF8\uC778 \uC2DC\uB3C4\uAC00 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. 15\uBD84 \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        await ensureUserSchema(env);
        const body = await readJsonBody(request);
        const username = String(body.username || "").trim().slice(0, 40);
        const password = String(body.password || "");
        const key = username.toLocaleLowerCase("ko-KR");
        const user = await env.DB.prepare("SELECT id,username,salt,password_hash,password_iterations FROM users WHERE username = ? COLLATE NOCASE").bind(username).first();
        const storedIterations = user ? Math.max(1e5, Math.min(1e6, Number(user.password_iterations) || 1e5)) : 1e5;
        const passwordValid = Boolean(user && constantTimeEqual(
          await passwordHash(password, user.salt, storedIterations),
          user.password_hash
        ));
        if (!passwordValid) return response({ error: "\uC544\uC774\uB514 \uB610\uB294 \uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." }, 401, cors);
        if (storedIterations < PASSWORD_HASH_ITERATIONS) {
          const upgradedSalt = crypto.randomUUID();
          const upgradedHash = await passwordHash(password, upgradedSalt, PASSWORD_HASH_ITERATIONS);
          await env.DB.prepare("UPDATE users SET salt = ?, password_hash = ?, password_iterations = ? WHERE id = ?").bind(upgradedSalt, upgradedHash, PASSWORD_HASH_ITERATIONS, user.id).run();
        }
        const session = await createUserSession(env, user.id);
        return response({
          ok: true,
          username: user.username,
          idle_timeout_seconds: SESSION_IDLE_TIMEOUT_MS / 1e3,
          absolute_timeout_seconds: SESSION_ABSOLUTE_TIMEOUT_MS / 1e3
        }, 200, { ...cors, "Set-Cookie": makeSessionCookie(session.token, request) });
      }
      if (url.pathname === "/api/discussions" && request.method === "GET") {
        await ensureDiscussionSchema(env);
        const pageTitle = cleanTitle(url.searchParams.get("title"));
        const query = String(url.searchParams.get("q") || "").normalize("NFC").trim().slice(0, 80);
        const requestedStatus = String(url.searchParams.get("status") || "all");
        const status = requestedStatus === "open" || requestedStatus === "closed" ? requestedStatus : "all";
        const limit = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "20", 10) || 20));
        const offset = Math.min(1e5, Math.max(0, Number.parseInt(url.searchParams.get("offset") || "0", 10) || 0));
        const conditions = ["deleted_at = ''"];
        const values = [];
        if (pageTitle) {
          conditions.push("page_title = ?");
          values.push(pageTitle);
        }
        if (status !== "all") {
          conditions.push("status = ?");
          values.push(status);
        }
        if (query) {
          const terms = [...new Set(query.split(/\\s+/).filter(Boolean))].slice(0, 6);
          for (const term of terms) {
            const pattern = "%" + term.replace(/[\\\\%_]/g, "") + "%";
            conditions.push("(title LIKE ? OR body LIKE ?)");
            values.push(pattern, pattern);
          }
        }
        const where = conditions.join(" AND ");
        const [items, count] = await Promise.all([
          env.DB.prepare("SELECT id, page_title, title, author, created_at, updated_at, last_post_at, reply_count, status FROM discussions WHERE " + where + " ORDER BY last_post_at DESC, id DESC LIMIT ? OFFSET ?").bind(...values, limit, offset).all(),
          env.DB.prepare("SELECT COUNT(*) AS total FROM discussions WHERE " + where).bind(...values).first()
        ]);
        return response({ discussions: items.results || [], total: Number(count?.total || 0), limit, offset, pageTitle, query, status }, 200, cors);
      }
      if (url.pathname === "/api/discussion" && request.method === "GET") {
        await ensureDiscussionSchema(env);
        const id = Number(url.searchParams.get("id"));
        if (!Number.isSafeInteger(id) || id < 1) return response({ error: "\uC62C\uBC14\uB978 \uD1A0\uB860 \uBC88\uD638\uAC00 \uC544\uB2D9\uB2C8\uB2E4." }, 400, cors);
        const discussion = await env.DB.prepare("SELECT id, page_title, title, body, author, created_at, updated_at, last_post_at, reply_count, status FROM discussions WHERE id = ? AND deleted_at = ''").bind(id).first();
        if (!discussion) return response({ error: "\uD1A0\uB860\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        const posts = await env.DB.prepare("SELECT id, discussion_id, body, author, created_at, edited_at, is_deleted FROM discussion_posts WHERE discussion_id = ? ORDER BY id ASC LIMIT 500").bind(id).all();
        return response({ discussion, posts: posts.results || [] }, 200, cors);
      }
      if (url.pathname === "/api/discussions" && request.method === "POST") {
        const authenticatedUser = await currentUser(request, env);
        const user = authenticatedUser || anonymousEditorIdentity(request);
        if (user.isAnonymous && await authRateLimited(request, env, "anonymous-discussion-create", 5, 10 * 60 * 1e3)) return response({ error: "\uBE44\uB85C\uADF8\uC778 \uD1A0\uB860 \uC0DD\uC131 \uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        if (await authRateLimited(request, env, "discussion-create", 5, 10 * 60 * 1e3)) return response({ error: "\uD1A0\uB860 \uC0DD\uC131 \uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        await ensureDiscussionSchema(env);
        const body = await readJsonBody(request);
        const title = String(body.title || "").trim().replace(/[\x00-\x1f\x7f]/g, "").slice(0, 120);
        const content = String(body.body || "").trim().slice(0, 1e4);
        const pageTitle = cleanTitle(body.pageTitle || "");
        if (title.length < 2) return response({ error: "\uD1A0\uB860 \uC81C\uBAA9\uC740 2\uC790 \uC774\uC0C1 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        if (!content) return response({ error: "\uD1A0\uB860 \uB0B4\uC6A9\uC744 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        if (pageTitle) {
          const page = await env.DB.prepare("SELECT title FROM pages WHERE title = ?").bind(pageTitle).first();
          if (!page) return response({ error: "\uC5F0\uACB0\uD560 \uBB38\uC11C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        }
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const result = await env.DB.prepare("INSERT INTO discussions (page_title, title, body, author, created_at, updated_at, last_post_at, reply_count, status) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'open')").bind(pageTitle, title, content, user.username, now, now, now).run();
        return response({ ok: true, id: Number(result.meta?.last_row_id || 0), created_at: now }, 201, cors);
      }
      if (url.pathname === "/api/discussion/reply" && request.method === "POST") {
        const authenticatedUser = await currentUser(request, env);
        const user = authenticatedUser || anonymousEditorIdentity(request);
        if (user.isAnonymous && await authRateLimited(request, env, "anonymous-discussion-reply", 15, 5 * 60 * 1e3)) return response({ error: "\uBE44\uB85C\uADF8\uC778 \uB2F5\uAE00 \uC791\uC131 \uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        if (await authRateLimited(request, env, "discussion-reply", 15, 5 * 60 * 1e3)) return response({ error: "\uB2F5\uAE00 \uC791\uC131 \uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        await ensureDiscussionSchema(env);
        const body = await readJsonBody(request);
        const id = Number(body.id);
        const content = String(body.body || "").trim().slice(0, 6e3);
        if (!Number.isSafeInteger(id) || id < 1) return response({ error: "\uC62C\uBC14\uB978 \uD1A0\uB860 \uBC88\uD638\uAC00 \uC544\uB2D9\uB2C8\uB2E4." }, 400, cors);
        if (!content) return response({ error: "\uB2F5\uAE00 \uB0B4\uC6A9\uC744 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        const discussion = await env.DB.prepare("SELECT id, status FROM discussions WHERE id = ? AND deleted_at = ''").bind(id).first();
        if (!discussion) return response({ error: "\uD1A0\uB860\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        if (discussion.status !== "open") return response({ error: "\uC885\uB8CC\uB41C \uD1A0\uB860\uC5D0\uB294 \uB2F5\uAE00\uC744 \uC791\uC131\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 409, cors);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const result = await env.DB.prepare("INSERT INTO discussion_posts (discussion_id, body, author, created_at) VALUES (?, ?, ?, ?)").bind(id, content, user.username, now).run();
        await env.DB.prepare("UPDATE discussions SET reply_count = reply_count + 1, updated_at = ?, last_post_at = ? WHERE id = ?").bind(now, now, id).run();
        return response({ ok: true, id: Number(result.meta?.last_row_id || 0), created_at: now }, 201, cors);
      }
      if (url.pathname === "/api/discussion" && request.method === "PATCH") {
        const authenticatedUser = await currentUser(request, env);
        if (!authenticatedUser) return response({ error: "\uBE44\uB85C\uADF8\uC778 \uD1A0\uB860\uC740 \uC218\uC815\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uB85C\uADF8\uC778 \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 401, cors);
        const user = authenticatedUser;
        if (user.isAnonymous && await authRateLimited(request, env, "anonymous-discussion-edit", 10, 10 * 60 * 1e3)) return response({ error: "\uBE44\uB85C\uADF8\uC778 \uD1A0\uB860 \uBCC0\uACBD \uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        await ensureDiscussionSchema(env);
        const body = await readJsonBody(request);
        const id = Number(body.id);
        const action = String(body.action || "");
        if (!Number.isSafeInteger(id) || id < 1 || !["close", "reopen", "edit"].includes(action)) return response({ error: "\uC62C\uBC14\uB978 \uD1A0\uB860 \uBCC0\uACBD \uC694\uCCAD\uC774 \uC544\uB2D9\uB2C8\uB2E4." }, 400, cors);
        const discussion = await env.DB.prepare("SELECT id, author, status FROM discussions WHERE id = ? AND deleted_at = ''").bind(id).first();
        if (!discussion) return response({ error: "\uD1A0\uB860\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        if (!user.isAdmin && discussion.author !== user.username) return response({ error: "\uD1A0\uB860 \uC791\uC131\uC790 \uB610\uB294 \uC704\uD0A4 \uAD00\uB9AC\uC790\uB9CC \uBCC0\uACBD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }, 403, cors);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        if (action === "edit") {
          const title = String(body.title || "").trim().replace(/[\x00-\x1f\x7f]/g, "").slice(0, 120);
          const content = String(body.body || "").trim().slice(0, 1e4);
          if (title.length < 2) return response({ error: "\uD1A0\uB860 \uC81C\uBAA9\uC740 2\uC790 \uC774\uC0C1 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
          if (!content) return response({ error: "\uD1A0\uB860 \uB0B4\uC6A9\uC744 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
          if (!user.isAdmin && discussion.status !== "open") return response({ error: "\uC885\uB8CC\uB41C \uD1A0\uB860\uC740 \uAD00\uB9AC\uC790\uB9CC \uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }, 403, cors);
          await env.DB.prepare("UPDATE discussions SET title = ?, body = ?, updated_at = ? WHERE id = ?").bind(title, content, now, id).run();
          return response({ ok: true, id, title, updated_at: now }, 200, cors);
        }
        const status = action === "close" ? "closed" : "open";
        await env.DB.prepare("UPDATE discussions SET status = ?, updated_at = ? WHERE id = ?").bind(status, now, id).run();
        return response({ ok: true, id, status }, 200, cors);
      }
      if (url.pathname === "/api/discussion/post" && request.method === "PATCH") {
        const authenticatedUser = await currentUser(request, env);
        if (!authenticatedUser) return response({ error: "\uBE44\uB85C\uADF8\uC778 \uB2F5\uAE00\uC740 \uC218\uC815\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uB85C\uADF8\uC778 \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 401, cors);
        const user = authenticatedUser;
        if (user.isAnonymous && await authRateLimited(request, env, "anonymous-discussion-post-edit", 10, 10 * 60 * 1e3)) return response({ error: "\uBE44\uB85C\uADF8\uC778 \uB2F5\uAE00 \uC218\uC815 \uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        await ensureDiscussionSchema(env);
        const body = await readJsonBody(request);
        const id = Number(body.id);
        const content = String(body.body || "").trim().slice(0, 6e3);
        if (!Number.isSafeInteger(id) || id < 1 || !content) return response({ error: "\uC62C\uBC14\uB978 \uB2F5\uAE00 \uC218\uC815 \uC694\uCCAD\uC774 \uC544\uB2D9\uB2C8\uB2E4." }, 400, cors);
        const post = await env.DB.prepare("SELECT id, discussion_id, author, created_at, is_deleted FROM discussion_posts WHERE id = ?").bind(id).first();
        if (!post || Number(post.is_deleted)) return response({ error: "\uC218\uC815\uD560 \uB2F5\uAE00\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        if (!user.isAdmin && post.author !== user.username) return response({ error: "\uBCF8\uC778\uC774 \uC791\uC131\uD55C \uB2F5\uAE00\uB9CC \uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }, 403, cors);
        const age = Date.now() - Date.parse(post.created_at);
        if (!user.isAdmin && (age < 0 || age > 30 * 60 * 1e3)) return response({ error: "\uC77C\uBC18 \uD68C\uC6D0\uC740 \uC791\uC131 \uD6C4 30\uBD84 \uC774\uB0B4\uC758 \uB2F5\uAE00\uB9CC \uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }, 403, cors);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        await env.DB.prepare("UPDATE discussion_posts SET body = ?, edited_at = ? WHERE id = ?").bind(content, now, id).run();
        await env.DB.prepare("UPDATE discussions SET updated_at = ? WHERE id = ?").bind(now, post.discussion_id).run();
        return response({ ok: true, id, edited_at: now }, 200, cors);
      }
      if (url.pathname === "/api/discussion/post" && request.method === "DELETE") {
        const authenticatedUser = await currentUser(request, env);
        if (!authenticatedUser) return response({ error: "\uBE44\uB85C\uADF8\uC778 \uB2F5\uAE00\uC740 \uC0AD\uC81C\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uB85C\uADF8\uC778 \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 401, cors);
        const user = authenticatedUser;
        if (user.isAnonymous && await authRateLimited(request, env, "anonymous-discussion-post-delete", 10, 10 * 60 * 1e3)) return response({ error: "\uBE44\uB85C\uADF8\uC778 \uB2F5\uAE00 \uC0AD\uC81C \uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        await ensureDiscussionSchema(env);
        const id = Number(url.searchParams.get("id"));
        if (!Number.isSafeInteger(id) || id < 1) return response({ error: "\uC62C\uBC14\uB978 \uB2F5\uAE00 \uBC88\uD638\uAC00 \uC544\uB2D9\uB2C8\uB2E4." }, 400, cors);
        const post = await env.DB.prepare("SELECT id, discussion_id, author, is_deleted FROM discussion_posts WHERE id = ?").bind(id).first();
        if (!post || Number(post.is_deleted)) return response({ error: "\uC0AD\uC81C\uD560 \uB2F5\uAE00\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        if (!user.isAdmin && post.author !== user.username) return response({ error: "\uBCF8\uC778\uC774 \uC791\uC131\uD55C \uB2F5\uAE00\uB9CC \uC0AD\uC81C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }, 403, cors);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        await env.DB.prepare("UPDATE discussion_posts SET body = '', is_deleted = 1, edited_at = ? WHERE id = ?").bind(now, id).run();
        await env.DB.prepare("UPDATE discussions SET reply_count = MAX(0, reply_count - 1), updated_at = ?, last_post_at = COALESCE((SELECT MAX(created_at) FROM discussion_posts WHERE discussion_id = ? AND is_deleted = 0), created_at) WHERE id = ?").bind(now, post.discussion_id, post.discussion_id).run();
        return response({ ok: true, id }, 200, cors);
      }
      if (url.pathname === "/api/discussions" && request.method === "DELETE") {
        const authenticatedUser = await currentUser(request, env);
        if (!authenticatedUser) return response({ error: "\uBE44\uB85C\uADF8\uC778 \uD1A0\uB860\uC740 \uC0AD\uC81C\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uB85C\uADF8\uC778 \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 401, cors);
        const user = authenticatedUser;
        if (user.isAnonymous && await authRateLimited(request, env, "anonymous-discussion-delete", 5, 10 * 60 * 1e3)) return response({ error: "\uBE44\uB85C\uADF8\uC778 \uD1A0\uB860 \uC0AD\uC81C \uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        await ensureDiscussionSchema(env);
        const id = Number(url.searchParams.get("id"));
        if (!Number.isSafeInteger(id) || id < 1) return response({ error: "\uC62C\uBC14\uB978 \uD1A0\uB860 \uBC88\uD638\uAC00 \uC544\uB2D9\uB2C8\uB2E4." }, 400, cors);
        const discussion = await env.DB.prepare("SELECT id, author, reply_count FROM discussions WHERE id = ? AND deleted_at = ''").bind(id).first();
        if (!discussion) return response({ error: "\uD1A0\uB860\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        if (!user.isAdmin && discussion.author !== user.username) return response({ error: "\uD1A0\uB860 \uC791\uC131\uC790 \uB610\uB294 \uC704\uD0A4 \uAD00\uB9AC\uC790\uB9CC \uC0AD\uC81C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }, 403, cors);
        if (!user.isAdmin && Number(discussion.reply_count) > 0) return response({ error: "\uB2F5\uAE00\uC774 \uC788\uB294 \uD1A0\uB860\uC740 \uAD00\uB9AC\uC790\uB9CC \uC0AD\uC81C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uD1A0\uB860\uC744 \uC885\uB8CC\uD574 \uC8FC\uC138\uC694." }, 403, cors);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        await env.DB.prepare("UPDATE discussions SET deleted_at = ?, deleted_by = ?, status = 'closed', updated_at = ? WHERE id = ?").bind(now, user.username, now, id).run();
        return response({ ok: true, id }, 200, cors);
      }
      if (url.pathname === "/api/special-pages" && request.method === "GET") {
        const type = String(url.searchParams.get("type") || "").trim();
        const supported = /* @__PURE__ */ new Set(["missing", "orphan", "orphan-categories", "uncategorized", "old", "short", "long", "blocked"]);
        if (!supported.has(type)) return response({ error: "\uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uD2B9\uC218 \uBB38\uC11C\uC785\uB2C8\uB2E4." }, 400, cors);
        if (type === "blocked") return response({ type, available: false, items: [], total: 0, message: "\uD604\uC7AC AonWiki\uC5D0\uB294 \uD68C\uC6D0 \uCC28\uB2E8 \uC774\uB825\uC744 \uAE30\uB85D\uD558\uB294 \uAE30\uB2A5\uC774 \uC5F0\uACB0\uB418\uC5B4 \uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." }, 200, cors);
        const result = await env.DB.prepare("SELECT title, content, updated_at FROM pages ORDER BY title COLLATE NOCASE LIMIT 10000").all();
        const pages = (result.results || []).map((page) => ({
          title: String(page.title || ""),
          content: String(page.content || ""),
          updated_at: String(page.updated_at || "")
        }));
        const pageByKey = new Map(pages.map((page) => [page.title.toLocaleLowerCase(), page]));
        const inbound = /* @__PURE__ */ new Map();
        const missing = /* @__PURE__ */ new Map();
        const categoryReferences = /* @__PURE__ */ new Set();
        const categoryPattern = /\[\[(?:분류|category):([^\]|#]+)(?:\|[^\]]*)?\]\]/gi;
        for (const page of pages) {
          for (const match of page.content.matchAll(/\[\[([^\]]+)\]\]/g)) {
            const target = String(match[1] || "").split("|")[0].split("#")[0].trim();
            if (!target) continue;
            const key = target.toLocaleLowerCase();
            inbound.set(key, (inbound.get(key) || 0) + 1);
            if (/^(?:분류|category):/i.test(target)) {
              const category = target.replace(/^(?:분류|category):/i, "").trim().toLocaleLowerCase();
              if (category) categoryReferences.add(category);
            } else if (!pageByKey.has(key) && !/^(?:파일|file):/i.test(target) && target !== page.title) {
              const item = missing.get(key) || { title: target, count: 0, source: page.title };
              item.count++;
              missing.set(key, item);
            }
          }
          for (const match of page.content.matchAll(categoryPattern)) {
            const category = String(match[1] || "").trim().toLocaleLowerCase();
            if (category) categoryReferences.add(category);
          }
        }
        const regular = pages.filter((page) => page.title !== "\uB300\uBB38" && !/^(?:분류|category):/i.test(page.title));
        let items = [];
        let description = "";
        if (type === "missing") {
          description = "\uB2E4\uB978 \uBB38\uC11C\uC5D0\uC11C \uB9C1\uD06C\uD558\uACE0 \uC788\uC9C0\uB9CC \uC544\uC9C1 \uC791\uC131\uB418\uC9C0 \uC54A\uC740 \uBB38\uC11C\uC785\uB2C8\uB2E4.";
          items = [...missing.values()].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, "ko"));
        } else if (type === "orphan") {
          description = "\uB2E4\uB978 \uBB38\uC11C\uC5D0\uC11C \uB0B4\uBD80 \uB9C1\uD06C\uB85C \uCC38\uC870\uB418\uC9C0 \uC54A\uB294 \uBB38\uC11C\uC785\uB2C8\uB2E4.";
          items = regular.filter((page) => !inbound.has(page.title.toLocaleLowerCase())).map((page) => ({ title: page.title, updated_at: page.updated_at }));
        } else if (type === "orphan-categories") {
          description = "\uC5B4\uB5A4 \uBB38\uC11C\uC5D0\uC11C\uB3C4 \uBD84\uB958 \uB9C1\uD06C\uB85C \uCC38\uC870\uD558\uC9C0 \uC54A\uB294 \uBD84\uB958\uC785\uB2C8\uB2E4.";
          items = pages.filter((page) => /^(?:분류|category):/i.test(page.title)).filter((page) => {
            const name = page.title.replace(/^(?:분류|category):/i, "").toLocaleLowerCase();
            return !categoryReferences.has(name);
          }).map((page) => ({ title: page.title, updated_at: page.updated_at }));
        } else if (type === "uncategorized") {
          description = "\uBD84\uB958 \uB9C1\uD06C\uAC00 \uD558\uB098\uB3C4 \uB4F1\uB85D\uB418\uC9C0 \uC54A\uC740 \uBB38\uC11C\uC785\uB2C8\uB2E4.";
          items = regular.filter((page) => !/\[\[(?:분류|category):/i.test(page.content)).map((page) => ({ title: page.title, updated_at: page.updated_at }));
        } else if (type === "old") {
          description = "\uCD5C\uADFC \uC218\uC815 \uC2DC\uAC01\uC774 \uC624\uB798\uB41C \uBB38\uC11C\uBD80\uD130 \uD45C\uC2DC\uD569\uB2C8\uB2E4.";
          items = [...regular].sort((a, b) => (Date.parse(a.updated_at) || 0) - (Date.parse(b.updated_at) || 0)).map((page) => ({ title: page.title, updated_at: page.updated_at }));
        } else if (type === "short") {
          description = "\uBCF8\uBB38 \uC6D0\uBB38\uC774 200\uC790 \uC774\uD558\uC778 \uBB38\uC11C\uC785\uB2C8\uB2E4. \uB098\uBB34\uB9C8\uD06C \uAE30\uD638\uC640 \uACF5\uBC31\uB3C4 \uAE00\uC790 \uC218\uC5D0 \uD3EC\uD568\uB429\uB2C8\uB2E4.";
          items = regular.filter((page) => page.content.trim().length <= 200).map((page) => ({ title: page.title, characters: page.content.length, updated_at: page.updated_at })).sort((a, b) => a.characters - b.characters);
        } else if (type === "long") {
          description = "\uBCF8\uBB38 \uC6D0\uBB38\uC774 10,000\uC790 \uC774\uC0C1\uC778 \uBB38\uC11C\uC785\uB2C8\uB2E4. \uB098\uBB34\uB9C8\uD06C \uAE30\uD638\uC640 \uACF5\uBC31\uB3C4 \uAE00\uC790 \uC218\uC5D0 \uD3EC\uD568\uB429\uB2C8\uB2E4.";
          items = regular.filter((page) => page.content.length >= 1e4).map((page) => ({ title: page.title, characters: page.content.length, updated_at: page.updated_at })).sort((a, b) => b.characters - a.characters);
        }
        const total = items.length;
        return response({ type, available: true, description, total, items: items.slice(0, 500) }, 200, cors);
      }
      if (url.pathname === "/api/page-index" && request.method === "GET") {
        const result = await env.DB.prepare("SELECT title FROM pages ORDER BY title COLLATE NOCASE LIMIT 10000").all();
        return response({ pages: result.results || [] }, 200, cors);
      }
      if (url.pathname === "/api/pages" && request.method === "GET") {
        const q = String(url.searchParams.get("q") || "").normalize("NFC").trim().slice(0, 100);
        const requestedScope = url.searchParams.get("scope");
        const scope = requestedScope === "title" || requestedScope === "files" ? requestedScope : "all";
        const createdAfter = String(url.searchParams.get("created_after") || "").slice(0, 40);
        const limit = Math.min(50, Math.max(5, Number.parseInt(url.searchParams.get("limit") || "25", 10) || 25));
        const pageOffset = Math.min(1e5, Math.max(0, Number.parseInt(url.searchParams.get("page_offset") || "0", 10) || 0));
        const fileOffset = Math.min(1e5, Math.max(0, Number.parseInt(url.searchParams.get("file_offset") || "0", 10) || 0));
        let result;
        if (q) {
          const terms = [...new Set(q.split(/\s+/).map((value) => value.trim()).filter(Boolean))].slice(0, 6);
          const escapeLike = (value) => String(value).replace(/[!%_]/g, (character) => "!" + character);
          const patterns = terms.map((term) => "%" + escapeLike(term) + "%");
          const phrasePattern = "%" + escapeLike(q) + "%";
          const prefixPattern = escapeLike(terms[0] || q) + "%";
          const shouldSearchPages = scope !== "files";
          const shouldSearchFiles = scope !== "title";
          const pageCondition = terms.map(
            () => scope === "title" ? "title LIKE ? ESCAPE '!'" : "(title LIKE ? ESCAPE '!' OR content LIKE ? ESCAPE '!')"
          ).join(" AND ");
          const pageParameters = terms.flatMap((term, index) => {
            const pattern = patterns[index];
            return scope === "title" ? [pattern] : [pattern, pattern];
          });
          const fileCondition = terms.map(
            () => "(filename LIKE ? ESCAPE '!' OR EXISTS (SELECT 1 FROM image_aliases WHERE image_aliases.image_id = images.id AND image_aliases.alias LIKE ? ESCAPE '!'))"
          ).join(" AND ");
          const fileParameters = terms.flatMap((term, index) => [patterns[index], patterns[index]]);
          const makeSnippet = (source) => {
            let plain = String(source || "").replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2").replace(/\[\[([^\]]+)\]\]/g, "$1").replace(/\[https?:\/\/\S+\s+([^\]]+)\]/gi, "$1").replace(/<[^>]*>/g, " ").replace(/'{2,5}/g, "").replace(/^\s*=+.*?=+\s*$/gm, " ").replace(/[|{}\[\]#]/g, " ").replace(/\s+/g, " ").trim();
            if (!plain) return "";
            const lower = plain.toLocaleLowerCase("ko-KR");
            const positions = terms.map((term) => lower.indexOf(term.toLocaleLowerCase("ko-KR"))).filter((index) => index >= 0);
            const matchAt = positions.length ? Math.min(...positions) : 0;
            const start = Math.max(0, matchAt - 78);
            const end = Math.min(plain.length, start + 230);
            return (start > 0 ? "\u2026" : "") + plain.slice(start, end) + (end < plain.length ? "\u2026" : "");
          };
          let pageTotal = 0;
          let pages = [];
          if (shouldSearchPages) {
            const [count, rows] = await Promise.all([
              env.DB.prepare("SELECT COUNT(*) AS total FROM pages WHERE " + pageCondition).bind(...pageParameters).first(),
              env.DB.prepare(
                "SELECT title, content, created_at, updated_at FROM pages WHERE " + pageCondition + " ORDER BY CASE WHEN lower(title) = lower(?) THEN 0 WHEN lower(title) LIKE lower(?) ESCAPE '!' THEN 1 WHEN lower(title) LIKE lower(?) ESCAPE '!' THEN 2 ELSE 3 END, updated_at DESC, title COLLATE NOCASE ASC LIMIT ? OFFSET ?"
              ).bind(...pageParameters, q, prefixPattern, phrasePattern, limit, pageOffset).all()
            ]);
            pageTotal = Number(count?.total || 0);
            pages = (rows.results || []).map((page) => {
              const title = String(page.title || "");
              const titleLower = title.toLocaleLowerCase("ko-KR");
              const titleMatch = terms.every((term) => titleLower.includes(term.toLocaleLowerCase("ko-KR")));
              return {
                title,
                created_at: page.created_at,
                updated_at: page.updated_at,
                match_type: titleMatch ? "title" : "content",
                snippet: titleMatch ? "" : makeSnippet(page.content)
              };
            });
          }
          let fileTotal = 0;
          let files = [];
          if (shouldSearchFiles) {
            await ensureImageSchema(env);
            const [count, rows] = await Promise.all([
              env.DB.prepare("SELECT COUNT(*) AS total FROM images WHERE " + fileCondition).bind(...fileParameters).first(),
              env.DB.prepare(
                "SELECT id, filename, content_type, created_at, (SELECT GROUP_CONCAT(alias, ' \xB7 ') FROM image_aliases WHERE image_aliases.image_id = images.id) AS aliases FROM images WHERE " + fileCondition + " ORDER BY CASE WHEN lower(filename) = lower(?) THEN 0 WHEN lower(filename) LIKE lower(?) ESCAPE '!' THEN 1 WHEN lower(filename) LIKE lower(?) ESCAPE '!' THEN 2 ELSE 3 END, created_at DESC, filename COLLATE NOCASE ASC LIMIT ? OFFSET ?"
              ).bind(...fileParameters, q, prefixPattern, phrasePattern, limit, fileOffset).all()
            ]);
            fileTotal = Number(count?.total || 0);
            files = rows.results || [];
          }
          const total = pageTotal + fileTotal;
          const pagesHasMore = pageTotal > pageOffset + pages.length;
          const filesHasMore = fileTotal > fileOffset + files.length;
          return response({
            pages,
            files,
            total,
            page_total: pageTotal,
            file_total: fileTotal,
            scope,
            limit,
            page_offset: pageOffset,
            file_offset: fileOffset,
            pages_has_more: pagesHasMore,
            files_has_more: filesHasMore,
            has_more: pagesHasMore || filesHasMore
          }, 200, cors);
        } else if (createdAfter && !Number.isNaN(Date.parse(createdAfter))) {
          result = await env.DB.prepare("SELECT title, created_at, updated_at FROM pages WHERE created_at > ? ORDER BY created_at DESC LIMIT 100").bind(createdAfter).all();
        } else {
          result = await env.DB.prepare("SELECT title, created_at, updated_at FROM pages ORDER BY updated_at DESC LIMIT 100").all();
        }
        return response({ pages: result.results || [] }, 200, cors);
      }
      if (url.pathname === "/api/recent" && request.method === "GET") {
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT NOT NULL, editor TEXT NOT NULL, created_at TEXT NOT NULL)").run();
        const columns = await env.DB.prepare("PRAGMA table_info(revisions)").all();
        if (!(columns.results || []).some((column) => column.name === "summary")) {
          await env.DB.prepare("ALTER TABLE revisions ADD COLUMN summary TEXT NOT NULL DEFAULT ''").run();
        }
        const result = await env.DB.prepare("SELECT id, title, editor, created_at, summary FROM revisions ORDER BY id DESC LIMIT 200").all();
        return response({ changes: result.results || [] }, 200, cors);
      }
      if (url.pathname === "/api/backlinks" && request.method === "GET") {
        const title = cleanTitle(url.searchParams.get("title"));
        if (!title) return response({ error: "\uBB38\uC11C \uC81C\uBAA9\uC744 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        const candidate = await env.DB.prepare("SELECT title, content, updated_at FROM pages WHERE content LIKE ? ORDER BY updated_at DESC LIMIT 1000").bind("%[[" + title + "%").all();
        const backlinks = [];
        for (const page of candidate.results || []) {
          if (page.title === title) continue;
          let count = 0;
          const links = String(page.content || "").matchAll(/\[\[([^\]]+)\]\]/g);
          for (const link of links) {
            const target = String(link[1] || "").split("|")[0].split("#")[0].trim();
            if (target.toLocaleLowerCase() === title.toLocaleLowerCase()) count++;
          }
          if (count) backlinks.push({ title: page.title, updated_at: page.updated_at, count });
        }
        return response({ title, backlinks }, 200, cors);
      }
      if (url.pathname === "/api/categories" && request.method === "GET") {
        const result = await env.DB.prepare("SELECT title, content FROM pages ORDER BY title COLLATE NOCASE LIMIT 10000").all();
        const categories = /* @__PURE__ */ new Map();
        const normalizeCategoryName = (value) => {
          let name = String(value || "").trim();
          while (/^(?:\uBD84\uB958|category):/i.test(name)) name = name.replace(/^(?:\uBD84\uB958|category):/i, "").trim();
          return name;
        };
        for (const page of result.results || []) {
          const content = String(page.content || "");
          const isCategoryPage = /^(?:분류|category):/i.test(String(page.title || ""));
          const matches = content.matchAll(/\[\[(?:분류|category):([^\]|#]+)(?:\|[^\]]*)?\]\]/gi);
          for (const match of matches) {
            const name = normalizeCategoryName(match[1]);
            if (!name) continue;
            const key = name.toLocaleLowerCase();
            const item = categories.get(key) || { name, count: 0, subcategoryCount: 0 };
            if (isCategoryPage) item.subcategoryCount++;
            else if (page.title !== "\uB300\uBB38") item.count++;
            categories.set(key, item);
          }
        }
        const values = [...categories.values()].sort((a, b) => a.name.localeCompare(b.name, "ko"));
        return response({ categories: values, total: values.length }, 200, cors);
      }
      if (url.pathname === "/api/category" && request.method === "GET") {
        const name = String(url.searchParams.get("name") || "").trim().replace(/^(?:분류|category):/i, "").slice(0, 120);
        if (!name) return response({ error: "\uBD84\uB958 \uC774\uB984\uC744 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "100", 10) || 100));
        const offset = Math.min(1e6, Math.max(0, Number.parseInt(url.searchParams.get("offset") || "0", 10) || 0));
        const markers = [
          "[[\uBD84\uB958:" + name + "]]",
          "[[\uBD84\uB958:" + name + "|",
          "[[category:" + name + "]]",
          "[[category:" + name + "|"
        ];
        const membershipSql = "instr(lower(content), lower(?)) > 0 OR instr(lower(content), lower(?)) > 0 OR instr(lower(content), lower(?)) > 0 OR instr(lower(content), lower(?)) > 0";
        const [categoryPage, subcategories, countRow, pages] = await Promise.all([
          env.DB.prepare("SELECT title, content, updated_at FROM pages WHERE title = ? COLLATE NOCASE OR title = ? COLLATE NOCASE LIMIT 1").bind("\uBD84\uB958:" + name, "category:" + name).first(),
          env.DB.prepare("SELECT title, updated_at FROM pages WHERE (" + membershipSql + ") AND (lower(title) LIKE '\uBD84\uB958:%' OR lower(title) LIKE 'category:%') ORDER BY title COLLATE NOCASE ASC LIMIT 1000").bind(...markers).all(),
          env.DB.prepare("SELECT COUNT(*) AS total FROM pages WHERE (" + membershipSql + ") AND title <> '\uB300\uBB38' AND lower(title) NOT LIKE '\uBD84\uB958:%' AND lower(title) NOT LIKE 'category:%'").bind(...markers).first(),
          env.DB.prepare("SELECT title, updated_at FROM pages WHERE (" + membershipSql + ") AND title <> '\uB300\uBB38' AND lower(title) NOT LIKE '\uBD84\uB958:%' AND lower(title) NOT LIKE 'category:%' ORDER BY title COLLATE NOCASE ASC LIMIT ? OFFSET ?").bind(...markers, limit, offset).all()
        ]);
        const source = String(categoryPage?.content || "");
        const parentCategories = [...source.matchAll(/\[\[(?:분류|category):([^\]|#]+)(?:\|[^\]]*)?\]\]/gi)].map((match) => String(match[1] || "").trim()).filter(Boolean);
        const description = source.replace(/^\s*\[\[(?:분류|category):[^\]]+\]\]\s*$/gim, "").trim();
        const childItems = (subcategories.results || []).map((page) => ({
          title: page.title,
          name: String(page.title || "").replace(/^(?:분류|category):/i, ""),
          updated_at: page.updated_at
        }));
        return response({
          name,
          description,
          categoryUpdatedAt: categoryPage?.updated_at || "",
          parentCategories: [...new Set(parentCategories)],
          subcategories: childItems,
          pages: pages.results || [],
          total: Number(countRow?.total || 0),
          limit,
          offset
        }, 200, cors);
      }
      if (url.pathname === "/api/category" && request.method === "GET") {
        const name = String(url.searchParams.get("name") || "").trim().slice(0, 160);
        if (!name) return response({ error: "\uBD84\uB958 \uC774\uB984\uC744 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        const patterns = [
          "%[[\uBD84\uB958:" + name + "]]%",
          "%[[\uBD84\uB958:" + name + "|%",
          "%[[category:" + name + "]]%",
          "%[[category:" + name + "|%"
        ];
        const result = await env.DB.prepare("SELECT title, updated_at FROM pages WHERE content LIKE ? OR content LIKE ? OR content LIKE ? OR content LIKE ? ORDER BY updated_at DESC LIMIT 500").bind(...patterns).all();
        return response({ name, pages: result.results || [] }, 200, cors);
      }
      if (url.pathname === "/api/render" && request.method === "GET") {
        const title = cleanTitle(url.searchParams.get("title"));
        if (!title) return response({ error: "\uBB38\uC11C \uC81C\uBAA9\uC744 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        const cached = namuPageResponseCache.get(title);
        if (cached && cached.expiresAt > Date.now()) {
          return response(cached.value, 200, { ...cors, "X-AonWiki-Render": "namumark-worker", "X-AonWiki-Cache": "HIT" });
        }
        if (namuPageResponsePending.has(title)) {
          const value2 = await namuPageResponsePending.get(title);
          return response(value2, 200, { ...cors, "X-AonWiki-Render": "namumark-worker", "X-AonWiki-Cache": "COALESCED" });
        }
        if (await authRateLimited(request, env, "document-render", 180, 60 * 1e3)) {
          return response({ error: "\uBB38\uC11C \uB80C\uB354\uB9C1 \uC694\uCCAD\uC774 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        }
        const pending = (async () => {
          await ensurePageProtectionSchema(env);
          const selectPage = async (pageTitle) => env.DB.prepare(
            "SELECT p.title, p.content, p.created_at, p.updated_at, pp.level AS protectionLevel, pp.reason AS protectionReason, pp.protected_by AS protectedBy, pp.updated_at AS protectionUpdatedAt FROM pages p LEFT JOIN page_protections pp ON pp.title = p.title WHERE p.title = ?"
          ).bind(pageTitle).first();
          let page = await selectPage(title);
          if (!page) {
            await ensurePageAliasSchema(env);
            const alias = await env.DB.prepare("SELECT title FROM page_aliases WHERE alias = ? COLLATE NOCASE").bind(title).first();
            if (alias) page = await selectPage(alias.title);
          }
          if (!page) return { page: null, html: "", engine: "namumark-worker" };
          const linkColors = await getPageLinkColors(env, page.title);
          const sourceText = String(page.content || "");
          const largeDocument = sourceText.length > 6e3;
          let clientRender = null;
          if (largeDocument) {
            const payload = await buildAonClientRenderPayload(env, page.title, sourceText, linkColors);
            clientRender = {
              linkColors: payload.linkColors || linkColors || {},
              records: payload.records || [],
              pageCount: payload.pageCount || 0,
              imageMap: payload.imageMap || {},
              source: payload.source || ""
            };
          } else if (page.title === "\uC544\uC628") {
            clientRender = await buildAonClientRenderPayload(env, page.title, sourceText, linkColors);
          }
          let rendered = { html: "", metadata: {} };
          if (!clientRender) {
            try {
              rendered = await renderNamuMarkupOnWorker(env, page.title, sourceText, linkColors);
            } catch (error) {
              console.warn("AonWiki API render switched to browser WASM:", page.title, error?.message || error);
              const payload = await buildAonClientRenderPayload(env, page.title, sourceText, linkColors);
              clientRender = {
                linkColors: payload.linkColors || linkColors || {},
                records: payload.records || [],
                pageCount: payload.pageCount || 0,
                imageMap: payload.imageMap || {},
                source: payload.source || ""
              };
            }
          }
          return {
            page: {
              title: page.title,
              content: largeDocument ? "" : sourceText,
              contentLength: sourceText.length,
              created_at: page.created_at,
              updated_at: page.updated_at,
              protectionLevel: page.protectionLevel || "none",
              protectionReason: page.protectionReason || "",
              protectedBy: page.protectedBy || "",
              protectionUpdatedAt: page.protectionUpdatedAt || ""
            },
            html: rendered.html,
            metadata: mergeNamuRenderMetadata(rendered.metadata, sourceText),
            imageMap: rendered.imageMap || {},
            clientRender,
            engine: clientRender ? "namumark-client" : "namumark-worker"
          };
        })().then((value2) => {
          namuPageResponseCache.set(title, { value: value2, expiresAt: Date.now() + 60 * 1e3 });
          if (namuPageResponseCache.size > 200) namuPageResponseCache.delete(namuPageResponseCache.keys().next().value);
          return value2;
        }).finally(() => namuPageResponsePending.delete(title));
        namuPageResponsePending.set(title, pending);
        const value = await pending;
        return response(value, 200, { ...cors, "X-AonWiki-Render": "namumark-worker", "X-AonWiki-Cache": "MISS" });
      }
      if (url.pathname === "/api/render" && request.method === "POST") {
        if (await authRateLimited(request, env, "namumark-preview", 240, 60 * 1e3)) {
          return response({ error: "\uBBF8\uB9AC\uBCF4\uAE30 \uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        }
        const body = await readJsonBody(request);
        const title = cleanTitle(body.title || "\uBBF8\uB9AC\uBCF4\uAE30") || "\uBBF8\uB9AC\uBCF4\uAE30";
        const content = String(body.content || "");
        if (content.length > 2e5) return response({ error: "\uBBF8\uB9AC\uBCF4\uAE30 \uBB38\uC11C\uB294 200,000\uC790 \uC774\uD558\uB9CC \uC9C0\uC6D0\uD569\uB2C8\uB2E4." }, 413, cors);
        const previewUser = await currentUser(request, env);
        let linkColors = {};
        if (previewUser?.isAdmin) {
          const extractedColors = extractAdminLinkColors(content);
          if (extractedColors.errors.length) return response({ error: extractedColors.errors[0] }, 400, cors);
          linkColors = extractedColors.colors;
        } else {
          const existingPage = await findWikiPage(env, title);
          if (existingPage) linkColors = await getPageLinkColors(env, existingPage.title);
        }
        let rendered = { html: "", metadata: {}, imageMap: {} };
        let clientRender = null;
        if (content.length > 6e3) {
          const payload = await buildAonClientRenderPayload(env, title, content, linkColors);
          clientRender = {
            linkColors: payload.linkColors || linkColors || {},
            records: payload.records || [],
            pageCount: payload.pageCount || 0,
            imageMap: payload.imageMap || {},
            source: payload.source || ""
          };
        } else {
          try {
            rendered = await renderNamuMarkupOnWorker(env, title, content, linkColors);
          } catch (error) {
            console.warn("AonWiki editor preview switched to browser WASM:", title, error?.message || error);
            const payload = await buildAonClientRenderPayload(env, title, content, linkColors);
            clientRender = {
              linkColors: payload.linkColors || linkColors || {},
              records: payload.records || [],
              pageCount: payload.pageCount || 0,
              imageMap: payload.imageMap || {},
              source: payload.source || ""
            };
          }
        }
        const engine = clientRender ? "namumark-client" : "namumark-worker";
        return response({
          html: rendered.html || "",
          metadata: rendered.metadata || {},
          imageMap: rendered.imageMap || {},
          clientRender,
          engine,
          title
        }, 200, {
          ...cors,
          "X-AonWiki-Render": engine
        });
      }
      if (url.pathname === "/api/page" && request.method === "GET") {
        const title = cleanTitle(url.searchParams.get("title"));
        if (!title) return response({ error: "\uBB38\uC11C \uC81C\uBAA9\uC744 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        let page = await env.DB.prepare("SELECT title, content, created_at, updated_at FROM pages WHERE title = ?").bind(title).first();
        if (!page) {
          await ensurePageAliasSchema(env);
          const alias = await env.DB.prepare("SELECT title FROM page_aliases WHERE alias = ? COLLATE NOCASE").bind(title).first();
          if (alias) page = await env.DB.prepare("SELECT title, content, created_at, updated_at FROM pages WHERE title = ?").bind(alias.title).first();
        }
        await ensurePageProtectionSchema(env);
        await ensureOfficialDocumentSchema(env);
        const protection = page ? await env.DB.prepare("SELECT level, reason, protected_by, updated_at FROM page_protections WHERE title = ?").bind(page.title).first() : null;
        const official = page ? await env.DB.prepare("SELECT marked_by, updated_at FROM official_documents WHERE title = ?").bind(page.title).first() : null;
        const authenticatedUser = await currentUser(request, env);
        const user = authenticatedUser || anonymousEditorIdentity(request);
        const editPermission = page ? await checkPageEditPermission(env, user, page.title) : null;
        return response({ page: page ? { ...page, protectionLevel: protection?.level || "none", protectionReason: protection?.reason || "", protectedBy: protection?.protected_by || "", protectionUpdatedAt: protection?.updated_at || "", canEdit: !editPermission, editDeniedReason: editPermission?.error || "", official: Boolean(official), officialMarkedBy: official?.marked_by || "", officialUpdatedAt: official?.updated_at || "" } : null }, 200, cors);
      }
      if (url.pathname === "/api/history" && request.method === "GET") {
        const title = cleanTitle(url.searchParams.get("title"));
        if (!title) return response({ error: "\uBB38\uC11C \uC81C\uBAA9\uC744 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT NOT NULL, editor TEXT NOT NULL, created_at TEXT NOT NULL)").run();
        const columns = await env.DB.prepare("PRAGMA table_info(revisions)").all();
        if (!(columns.results || []).some((column) => column.name === "summary")) {
          await env.DB.prepare("ALTER TABLE revisions ADD COLUMN summary TEXT NOT NULL DEFAULT ''").run();
        }
        const result = await env.DB.prepare("SELECT id, title, editor, created_at, summary FROM revisions WHERE title = ? ORDER BY id DESC LIMIT 50").bind(title).all();
        return response({ revisions: result.results || [] }, 200, cors);
      }
      if (url.pathname === "/api/revision" && request.method === "GET") {
        const id = Number(url.searchParams.get("id"));
        const title = cleanTitle(url.searchParams.get("title"));
        if (!Number.isSafeInteger(id) || id < 1) return response({ error: "\uC62C\uBC14\uB978 \uBC84\uC804 ID\uAC00 \uC544\uB2D9\uB2C8\uB2E4." }, 400, cors);
        if (!title) return response({ error: "\uBB38\uC11C \uC81C\uBAA9\uC744 \uC9C0\uC815\uD574\uC57C \uD569\uB2C8\uB2E4." }, 400, cors);
        const revision = await env.DB.prepare(
          "SELECT id, title, content, editor, created_at, summary FROM revisions WHERE id = ? AND title = ?"
        ).bind(id, title).first();
        if (!revision) return response({ error: "\uD574\uB2F9 \uBB38\uC11C\uC5D0 \uC18D\uD55C \uBC84\uC804\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        return response({ revision }, 200, cors);
      }
      if (url.pathname === "/api/revision/restore" && request.method === "POST") {
        const user = await currentUser(request, env);
        if (!user) return response({ error: "\uBC84\uC804\uC744 \uBCF5\uC6D0\uD558\uB824\uBA74 \uB85C\uADF8\uC778\uD558\uC138\uC694." }, 401, cors);
        if (await authRateLimited(request, env, "revision-restore", 20, 60 * 1e3)) return response({ error: "\uBCF5\uC6D0 \uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        const body = await readJsonBody(request), id = Number(body.id), title = cleanTitle(body.title);
        if (!title || !Number.isSafeInteger(id) || id < 1) return response({ error: "\uBB38\uC11C \uC81C\uBAA9 \uB610\uB294 \uBC84\uC804 \uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." }, 400, cors);
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT NOT NULL, editor TEXT NOT NULL, created_at TEXT NOT NULL)").run();
        const columns = await env.DB.prepare("PRAGMA table_info(revisions)").all();
        if (!(columns.results || []).some((column) => column.name === "summary")) await env.DB.prepare("ALTER TABLE revisions ADD COLUMN summary TEXT NOT NULL DEFAULT ''").run();
        const revision = await env.DB.prepare("SELECT id, title, content FROM revisions WHERE id = ? AND title = ?").bind(id, title).first();
        if (!revision) return response({ error: "\uD574\uB2F9 \uBB38\uC11C\uC5D0 \uC18D\uD55C \uBC84\uC804\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        const editPermission = await checkPageEditPermission(env, user, title);
        if (editPermission) return response({ error: editPermission.error }, editPermission.status, cors);
        const page = await env.DB.prepare("SELECT title, content FROM pages WHERE title = ?").bind(title).first();
        if (!page) return response({ error: "\uD604\uC7AC \uBB38\uC11C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        const now = (/* @__PURE__ */ new Date()).toISOString(), content = String(revision.content || "");
        const currentContent = String(page.content || "");
        if (currentContent !== content) {
          await env.DB.prepare("INSERT INTO revisions (title, content, editor, created_at, summary) VALUES (?, ?, ?, ?, ?)").bind(title, currentContent, user.username, now, "\uBC84\uC804 \uBCF5\uC6D0 \uC9C1\uC804 \uC790\uB3D9 \uBCF4\uC874").run();
        }
        await env.DB.prepare("UPDATE pages SET content = ?, updated_at = ? WHERE title = ?").bind(content, now, title).run();
        await env.DB.prepare("INSERT INTO revisions (title, content, editor, created_at, summary) VALUES (?, ?, ?, ?, ?)").bind(title, content, user.username, now, "\uC774\uC804 \uBC84\uC804 #" + id + " \uBCF5\uC6D0").run();
        invalidateNamuServerIndexes();
        await clearPersistentNamuRenderCache(env);
        return response({ ok: true, title, restored_revision: id, updated_at: now }, 200, cors);
      }
      if (url.pathname === "/api/page" && request.method === "PUT") {
        const authenticatedUser = await currentUser(request, env);
        const user = authenticatedUser || anonymousEditorIdentity(request);
        if (user.isAnonymous && await authRateLimited(request, env, "anonymous-page-edit", 20, 10 * 60 * 1e3)) {
          return response({ error: "\uBE44\uB85C\uADF8\uC778 \uD3B8\uC9D1 \uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. 10\uBD84 \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        }
        const body = await readJsonBody(request);
        if (body.consent !== true) return response({ error: "\uBB38\uC11C \uACF5\uAC1C \uBC0F \uD3B8\uC9D1 \uAE30\uB85D\uC5D0 \uAD00\uD55C \uB3D9\uC758\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4." }, 400, cors);
        const title = cleanTitle(body.title);
        const originalTitle = body.createOnly ? "" : cleanTitle(body.originalTitle || "");
        const content = String(body.content || "");
        if (!title) return response({ error: "\uBB38\uC11C \uC81C\uBAA9\uC744 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        if (user.isAnonymous && originalTitle && originalTitle !== title) {
          return response({ error: "\uBE44\uB85C\uADF8\uC778 \uD3B8\uC9D1\uC5D0\uC11C\uB294 \uBB38\uC11C \uC81C\uBAA9\uC744 \uBCC0\uACBD\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 403, cors);
        }
        const protectionTitle = cleanTitle(body.originalTitle || title);
        const editPermission = await checkPageEditPermission(env, user, title, protectionTitle);
        if (editPermission) return response({ error: editPermission.error }, editPermission.status, cors);
        if (content.length > 2e5) return response({ error: "\uBB38\uC11C\uB294 200,000\uC790 \uC774\uD558\uB85C \uC791\uC131\uD574 \uC8FC\uC138\uC694." }, 413, cors);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const summary = String(body.summary || "").trim().slice(0, 200);
        const extractedLinkColors = extractAdminLinkColors(content);
        if (user.isAdmin && extractedLinkColors.errors.length) return response({ error: extractedLinkColors.errors[0] }, 400, cors);
        const columns = await env.DB.prepare("PRAGMA table_info(revisions)").all();
        if (!(columns.results || []).some((column) => column.name === "summary")) {
          await env.DB.prepare("ALTER TABLE revisions ADD COLUMN summary TEXT NOT NULL DEFAULT ''").run();
        }
        let previous = null;
        if (body.createOnly) {
          previous = await env.DB.prepare("SELECT created_at FROM pages WHERE title = ?").bind(title).first();
          if (previous) return response({ error: "\uAC19\uC740 \uC81C\uBAA9\uC758 \uBB38\uC11C\uAC00 \uC774\uBBF8 \uC788\uC2B5\uB2C8\uB2E4." }, 409, cors);
          await env.DB.prepare("INSERT INTO pages (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)").bind(title, content, now, now).run();
        } else if (originalTitle && originalTitle !== title) {
          await ensurePageAliasSchema(env);
          previous = await env.DB.prepare("SELECT created_at FROM pages WHERE title = ?").bind(originalTitle).first();
          if (!previous) return response({ error: "\uC774\uC804 \uBB38\uC11C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC0C8\uB85C\uACE0\uCE68 \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 404, cors);
          const occupied = await env.DB.prepare("SELECT title FROM pages WHERE title = ? COLLATE NOCASE").bind(title).first();
          if (occupied) return response({ error: "\uBCC0\uACBD\uD560 \uC81C\uBAA9\uC774 \uC774\uBBF8 \uC0AC\uC6A9 \uC911\uC785\uB2C8\uB2E4." }, 409, cors);
          const aliasCollision = await env.DB.prepare("SELECT title FROM page_aliases WHERE alias = ? COLLATE NOCASE").bind(title).first();
          if (aliasCollision && aliasCollision.title !== originalTitle) {
            return response({ error: "\uBCC0\uACBD\uD560 \uC81C\uBAA9\uC774 \uB2E4\uB978 \uBB38\uC11C\uC758 \uC774\uC804 \uC81C\uBAA9\uC73C\uB85C \uC0AC\uC6A9 \uC911\uC785\uB2C8\uB2E4." }, 409, cors);
          }
          await env.DB.prepare("UPDATE pages SET title = ?, content = ?, updated_at = ? WHERE title = ?").bind(title, content, now, originalTitle).run();
          await env.DB.prepare("UPDATE revisions SET title = ? WHERE title = ?").bind(title, originalTitle).run();
          await env.DB.prepare("UPDATE page_aliases SET title = ? WHERE title = ?").bind(title, originalTitle).run();
          await env.DB.prepare("INSERT INTO page_aliases (alias, title, created_at) VALUES (?, ?, ?) ON CONFLICT(alias) DO UPDATE SET title = excluded.title, created_at = excluded.created_at").bind(originalTitle, title, now).run();
          await ensurePageLinkColorsSchema(env);
          await env.DB.prepare("UPDATE page_link_colors SET title = ? WHERE title = ?").bind(title, originalTitle).run();
        } else {
          previous = await env.DB.prepare("SELECT created_at FROM pages WHERE title = ?").bind(title).first();
          if (!previous) return response({ error: "\uC218\uC815\uD560 \uBB38\uC11C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
          await env.DB.prepare("UPDATE pages SET content = ?, updated_at = ? WHERE title = ?").bind(content, now, title).run();
        }
        invalidateNamuServerIndexes();
        await clearPersistentNamuRenderCache(env);
        await env.DB.prepare("INSERT INTO revisions (title, content, editor, created_at, summary) VALUES (?, ?, ?, ?, ?)").bind(title, content, user.username, now, summary).run();
        if (user.isAdmin) await savePageLinkColors(env, title, extractedLinkColors, user.username);
        return response({ ok: true, title, previous_title: originalTitle && originalTitle !== title ? originalTitle : null, updated_at: now }, 200, cors);
      }
      if (url.pathname === "/api/edit-request" && request.method === "POST") {
        const authenticatedUser = await currentUser(request, env);
        const user = authenticatedUser || anonymousEditorIdentity(request);
        if (user.isAnonymous && await authRateLimited(request, env, "anonymous-edit-request", 8, 10 * 60 * 1e3)) {
          return response({ error: "\uBE44\uB85C\uADF8\uC778 \uD3B8\uC9D1 \uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        }
        const body = await readJsonBody(request);
        if (body.consent !== true) return response({ error: "\uD3B8\uC9D1 \uC694\uCCAD \uBC0F \uAE30\uB85D\uC5D0 \uAD00\uD55C \uB3D9\uC758\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4." }, 400, cors);
        const title = cleanTitle(body.title);
        const content = String(body.content || "");
        const summary = String(body.summary || "").trim().slice(0, 200);
        if (!title) return response({ error: "\uD3B8\uC9D1 \uC694\uCCAD \uB300\uC0C1 \uBB38\uC11C\uB97C \uC9C0\uC815\uD558\uC138\uC694." }, 400, cors);
        if (content.length > 2e5) return response({ error: "\uC81C\uC548 \uBB38\uC11C\uB294 200,000\uC790 \uC774\uD558\uB85C \uC791\uC131\uD574 \uC8FC\uC138\uC694." }, 413, cors);
        if (!content.trim()) return response({ error: "\uC81C\uC548\uD560 \uBB38\uC11C \uB0B4\uC6A9\uC744 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        const page = await env.DB.prepare("SELECT title, updated_at FROM pages WHERE title = ?").bind(title).first();
        if (!page) return response({ error: "\uD3B8\uC9D1 \uC694\uCCAD \uB300\uC0C1 \uBB38\uC11C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        const permission = await checkPageEditPermission(env, user, title);
        if (!permission) return response({ error: "\uC774 \uBB38\uC11C\uB294 \uC9C1\uC811 \uD3B8\uC9D1\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uD3B8\uC9D1 \uD654\uBA74\uC744 \uC0C8\uB85C\uACE0\uCE68\uD558\uC138\uC694." }, 409, cors);
        await ensureEditRequestSchema(env);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const result = await env.DB.prepare(
          "INSERT INTO edit_requests (page_title, requester, proposed_content, summary, base_updated_at, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?)"
        ).bind(title, user.username, content, summary, page.updated_at, now).run();
        return response({ ok: true, id: Number(result.meta?.last_row_id || 0), title, created_at: now }, 201, cors);
      }
      if (url.pathname === "/api/edit-requests" && request.method === "GET") {
        const user = await currentUser(request, env);
        if (!user?.isAdmin) return response({ error: "\uD3B8\uC9D1 \uC694\uCCAD\uC744 \uD655\uC778\uD558\uB824\uBA74 \uC704\uD0A4 \uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4." }, 403, cors);
        await ensureEditRequestSchema(env);
        const title = cleanTitle(url.searchParams.get("title"));
        const rows = await env.DB.prepare(
          "SELECT id, page_title, requester, proposed_content, summary, base_updated_at, created_at FROM edit_requests WHERE status = 'pending' AND (? = '' OR page_title = ?) ORDER BY created_at ASC, id ASC LIMIT 100"
        ).bind(title, title).all();
        return response({ requests: rows.results || [] }, 200, cors);
      }
      if (url.pathname === "/api/edit-request" && request.method === "PATCH") {
        const user = await currentUser(request, env);
        if (!user?.isAdmin) return response({ error: "\uD3B8\uC9D1 \uC694\uCCAD\uC744 \uCC98\uB9AC\uD558\uB824\uBA74 \uC704\uD0A4 \uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4." }, 403, cors);
        await ensureEditRequestSchema(env);
        const body = await readJsonBody(request);
        const id = Number(body.id);
        const action = String(body.action || "");
        if (!Number.isSafeInteger(id) || id < 1 || !["accept", "reject"].includes(action)) {
          return response({ error: "\uC62C\uBC14\uB978 \uD3B8\uC9D1 \uC694\uCCAD \uCC98\uB9AC \uAC12\uC774 \uC544\uB2D9\uB2C8\uB2E4." }, 400, cors);
        }
        const editRequest = await env.DB.prepare(
          "SELECT id, page_title, requester, proposed_content, summary, base_updated_at, status FROM edit_requests WHERE id = ?"
        ).bind(id).first();
        if (!editRequest || editRequest.status !== "pending") return response({ error: "\uB300\uAE30 \uC911\uC778 \uD3B8\uC9D1 \uC694\uCCAD\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        if (action === "reject") {
          await env.DB.prepare("UPDATE edit_requests SET status = 'rejected', reviewed_by = ?, reviewed_at = ? WHERE id = ?").bind(user.username, now, id).run();
          return response({ ok: true, id, status: "rejected" }, 200, cors);
        }
        const page = await env.DB.prepare("SELECT title, updated_at FROM pages WHERE title = ?").bind(editRequest.page_title).first();
        if (!page) return response({ error: "\uC694\uCCAD \uB300\uC0C1 \uBB38\uC11C\uAC00 \uC0AD\uC81C\uB418\uC5B4 \uC2B9\uC778\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        if (String(page.updated_at || "") !== String(editRequest.base_updated_at || "")) {
          return response({ error: "\uC694\uCCAD\uC744 \uC81C\uCD9C\uD55C \uB4A4 \uBB38\uC11C\uAC00 \uBCC0\uACBD\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uCD5C\uC2E0 \uBB38\uC11C \uAE30\uC900\uC73C\uB85C \uD3B8\uC9D1 \uC694\uCCAD\uC744 \uB2E4\uC2DC \uC81C\uCD9C\uD574\uC57C \uD569\uB2C8\uB2E4." }, 409, cors);
        }
        const columns = await env.DB.prepare("PRAGMA table_info(revisions)").all();
        if (!(columns.results || []).some((column) => column.name === "summary")) {
          await env.DB.prepare("ALTER TABLE revisions ADD COLUMN summary TEXT NOT NULL DEFAULT ''").run();
        }
        await env.DB.prepare("UPDATE pages SET content = ?, updated_at = ? WHERE title = ?").bind(editRequest.proposed_content, now, editRequest.page_title).run();
        await env.DB.prepare("INSERT INTO revisions (title, content, editor, created_at, summary) VALUES (?, ?, ?, ?, ?)").bind(editRequest.page_title, editRequest.proposed_content, user.username, now, "\uD3B8\uC9D1 \uC694\uCCAD #" + id + " \uC2B9\uC778: " + String(editRequest.summary || "").slice(0, 150)).run();
        await env.DB.prepare("UPDATE edit_requests SET status = 'accepted', reviewed_by = ?, reviewed_at = ? WHERE id = ?").bind(user.username, now, id).run();
        invalidateNamuServerIndexes();
        await clearPersistentNamuRenderCache(env);
        return response({ ok: true, id, title: editRequest.page_title, status: "accepted", updated_at: now }, 200, cors);
      }
      if (url.pathname === "/api/upload" && request.method === "POST") {
        const authenticatedUser = await currentUser(request, env);
        const user = authenticatedUser || anonymousEditorIdentity(request);
        const uploadLimit = user.isAnonymous ? 5 : 20;
        if (await authRateLimited(request, env, "image-upload", uploadLimit, 10 * 60 * 1e3)) {
          return response({ error: user.isAnonymous ? "\uBE44\uB85C\uADF8\uC778 \uC774\uBBF8\uC9C0 \uC5C5\uB85C\uB4DC\uB294 10\uBD84\uC5D0 5\uD68C\uAE4C\uC9C0 \uAC00\uB2A5\uD569\uB2C8\uB2E4." : "\uC774\uBBF8\uC9C0 \uC5C5\uB85C\uB4DC \uC694\uCCAD\uC774 \uB9CE\uC2B5\uB2C8\uB2E4. 10\uBD84 \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        }
        const form = await request.formData();
        const file = form.get("file");
        if (!file || typeof file.arrayBuffer !== "function") return response({ error: "\uC774\uBBF8\uC9C0 \uD30C\uC77C\uC744 \uC120\uD0DD\uD558\uC138\uC694." }, 400, cors);
        const allowedTypes = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];
        if (!allowedTypes.includes(file.type)) return response({ error: "PNG, JPG, GIF, WebP, SVG \uD30C\uC77C\uB9CC \uC9C0\uC6D0\uD569\uB2C8\uB2E4." }, 415, cors);
        if (file.size < 1 || file.size > 1 * 1024 * 1024) return response({ error: "\uC774\uBBF8\uC9C0 \uD30C\uC77C\uC740 1MB \uC774\uD558\uB9CC \uC9C0\uC6D0\uD569\uB2C8\uB2E4." }, 413, cors);
        await ensureImageSchema(env);
        let bytes;
        if (file.type === "image/svg+xml") {
          try {
            const svg = validateSvgUpload(await file.text());
            bytes = new TextEncoder().encode(svg);
          } catch (error) {
            return response({ error: error.message || "SVG \uD30C\uC77C\uC744 \uD655\uC778\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 400, cors);
          }
        } else {
          bytes = new Uint8Array(await file.arrayBuffer());
          if (bytes.byteLength !== file.size || !hasValidRasterImageSignature(bytes, file.type)) {
            return response({ error: "\uD30C\uC77C \uB0B4\uC6A9\uACFC \uC774\uBBF8\uC9C0 \uD615\uC2DD\uC774 \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." }, 415, cors);
          }
        }
        let binary = "";
        for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
        const encoded = btoa(binary);
        const usage = await env.DB.prepare(
          "SELECT COALESCE(SUM(length(data_base64)), 0) AS bytes FROM images WHERE owner = ?"
        ).bind(user.username).first();
        const ownerLimit = user.isAnonymous ? 5 * 1024 * 1024 : 50 * 1024 * 1024;
        if (Number(usage?.bytes || 0) + encoded.length > ownerLimit) {
          return response({ error: user.isAnonymous ? "\uBE44\uB85C\uADF8\uC778 \uC5C5\uB85C\uB4DC \uB204\uC801 \uC6A9\uB7C9\uC740 5MB\uAE4C\uC9C0 \uAC00\uB2A5\uD569\uB2C8\uB2E4." : "\uACC4\uC815\uBCC4 \uC774\uBBF8\uC9C0 \uC800\uC7A5 \uC6A9\uB7C9\uC740 50MB\uAE4C\uC9C0 \uAC00\uB2A5\uD569\uB2C8\uB2E4." }, 413, cors);
        }
        const key = crypto.randomUUID();
        const requestedName = cleanImageName(form.get("filename") || file.name || "image", file.type);
        const dot = requestedName.lastIndexOf(".");
        const base = requestedName.slice(0, dot), extension = requestedName.slice(dot);
        let storedFilename = requestedName;
        let suffix = 2;
        while (await env.DB.prepare("SELECT id FROM images WHERE filename = ? COLLATE NOCASE").bind(storedFilename).first() || await env.DB.prepare("SELECT image_id FROM image_aliases WHERE alias = ? COLLATE NOCASE").bind(storedFilename).first()) {
          storedFilename = base + " (" + suffix++ + ")" + extension;
        }
        const now = (/* @__PURE__ */ new Date()).toISOString();
        await env.DB.prepare("INSERT INTO images (id, content_type, data_base64, filename, created_at, owner) VALUES (?, ?, ?, ?, ?, ?)").bind(key, file.type, encoded, storedFilename, now, user.username).run();
        return response({ ok: true, key, filename: storedFilename, url: new URL("/media/" + key, url.origin).href }, 201, cors);
      }
      if (url.pathname === "/api/file" && request.method === "GET") {
        await ensureImageSchema(env);
        const name = String(url.searchParams.get("name") || "").trim().slice(0, 160);
        if (!name) return response({ error: "\uD30C\uC77C \uC774\uB984\uC744 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        let image;
        if (/^[a-f0-9-]{36}$/i.test(name)) {
          image = await env.DB.prepare("SELECT id, filename, content_type, owner FROM images WHERE id = ?").bind(name).first();
        } else {
          image = await env.DB.prepare("SELECT id, filename, content_type, owner FROM images WHERE filename = ? COLLATE NOCASE ORDER BY created_at DESC LIMIT 1").bind(name).first();
          if (!image) {
            image = await env.DB.prepare("SELECT images.id, images.filename, images.content_type, images.owner FROM image_aliases JOIN images ON images.id = image_aliases.image_id WHERE image_aliases.alias = ? COLLATE NOCASE LIMIT 1").bind(name).first();
          }
        }
        if (!image) return response({ error: "\uD30C\uC77C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        return response({ image: { key: image.id, filename: image.filename, content_type: image.content_type, url: new URL("/media/" + image.id, url.origin).href } }, 200, cors);
      }
      if (url.pathname === "/api/file" && request.method === "PATCH") {
        const user = await currentUser(request, env);
        if (!user) return response({ error: "\uD30C\uC77C \uC774\uB984\uC744 \uBCC0\uACBD\uD558\uB824\uBA74 \uB85C\uADF8\uC778\uD558\uC138\uC694." }, 401, cors);
        await ensureImageSchema(env);
        const body = await readJsonBody(request);
        const id = String(body.id || "");
        if (!/^[a-f0-9-]{36}$/i.test(id)) return response({ error: "\uC798\uBABB\uB41C \uD30C\uC77C \uC2DD\uBCC4\uC790\uC785\uB2C8\uB2E4." }, 400, cors);
        const image = await env.DB.prepare("SELECT id, filename, content_type, owner FROM images WHERE id = ?").bind(id).first();
        if (!image) return response({ error: "\uD30C\uC77C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        if (!user.isAdmin && image.owner !== user.username) return response({ error: "\uBCF8\uC778\uC774 \uC62C\uB9B0 \uD30C\uC77C\uB9CC \uC774\uB984\uC744 \uBCC0\uACBD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }, 403, cors);
        if (!String(body.filename || "").trim()) return response({ error: "\uC0C8 \uD30C\uC77C \uC774\uB984\uC744 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        const newFilename = cleanImageName(body.filename, image.content_type);
        const collision = await env.DB.prepare("SELECT id FROM images WHERE filename = ? COLLATE NOCASE AND id <> ?").bind(newFilename, id).first();
        const previousAliasCollision = await env.DB.prepare("SELECT image_id FROM image_aliases WHERE alias = ? COLLATE NOCASE AND image_id <> ?").bind(image.filename, id).first();
        if (previousAliasCollision) return response({ error: "\uC774\uC804 \uC774\uB984\uC774 \uB2E4\uB978 \uD30C\uC77C\uC5D0\uC11C \uC0AC\uC6A9 \uC911\uC774\uC5B4\uC11C \uC548\uC804\uD558\uAC8C \uBCC0\uACBD\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 409, cors);
        const aliasCollision = await env.DB.prepare("SELECT image_id FROM image_aliases WHERE alias = ? COLLATE NOCASE AND image_id <> ?").bind(newFilename, id).first();
        if (collision || aliasCollision) return response({ error: "\uC774\uBBF8 \uC0AC\uC6A9 \uC911\uC774\uAC70\uB098 \uC774\uC804 \uC774\uB984\uC73C\uB85C \uC608\uC57D\uB41C \uD30C\uC77C \uC774\uB984\uC785\uB2C8\uB2E4." }, 409, cors);
        if (newFilename !== image.filename) {
          await env.DB.prepare("INSERT INTO image_aliases (alias, image_id, created_at) VALUES (?, ?, ?) ON CONFLICT(alias) DO NOTHING").bind(image.filename, id, (/* @__PURE__ */ new Date()).toISOString()).run();
          await env.DB.prepare("UPDATE images SET filename = ? WHERE id = ?").bind(newFilename, id).run();
          await env.DB.prepare("DELETE FROM image_aliases WHERE alias = ? COLLATE NOCASE AND image_id = ?").bind(newFilename, id).run();
        }
        return response({ ok: true, id, filename: newFilename, previous_filename: image.filename }, 200, cors);
      }
      if (url.pathname === "/api/files" && request.method === "GET") {
        await ensureImageSchema(env);
        const manage = url.searchParams.get("manage") === "1";
        if (manage) {
          const user = await currentUser(request, env);
          if (!user) return response({ error: "\uD30C\uC77C \uAD00\uB9AC\uC5D0\uB294 \uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4." }, 401, cors);
          const result2 = user.isAdmin ? await env.DB.prepare("SELECT id, filename, content_type, created_at, owner FROM images ORDER BY created_at DESC LIMIT 500").all() : await env.DB.prepare("SELECT id, filename, content_type, created_at, owner FROM images WHERE owner = ? ORDER BY created_at DESC LIMIT 500").bind(user.username).all();
          return response({ files: result2.results || [], isAdmin: Boolean(user.isAdmin) }, 200, cors);
        }
        const result = await env.DB.prepare("SELECT id, filename, content_type, created_at FROM images ORDER BY created_at DESC LIMIT 500").all();
        const aliases = await env.DB.prepare("SELECT alias FROM image_aliases ORDER BY created_at DESC LIMIT 1000").all();
        return response({ files: result.results || [], aliases: aliases.results || [] }, 200, cors);
      }
      if (url.pathname.startsWith("/image/") && request.method === "GET") {
        await ensureImageSchema(env);
        const match = url.pathname.match(/^\/image\/([a-f0-9]{56})\.([a-z0-9]+)\.cache_v[0-9]+$/i);
        if (!match) return new Response("Not found", { status: 404 });
        const candidates = await env.DB.prepare("SELECT id, filename FROM images").all();
        let imageId = (candidates.results || []).find((item) => imageNameMatches(item.filename, match[1], match[2]))?.id;
        if (!imageId) {
          const aliases = await env.DB.prepare("SELECT alias, image_id FROM image_aliases").all();
          imageId = (aliases.results || []).find((item) => imageNameMatches(item.alias, match[1], match[2]))?.image_id;
        }
        if (!imageId) return new Response("Not found", { status: 404 });
        const image = await env.DB.prepare("SELECT content_type, data_base64 FROM images WHERE id = ?").bind(imageId).first();
        if (!image) return new Response("Not found", { status: 404 });
        const binary = atob(image.data_base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const headers = new Headers(cors);
        headers.set("Content-Type", image.content_type);
        headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
        headers.set("Pragma", "no-cache");
        headers.set("Expires", "0");
        const etag = '"' + match[1] + "." + match[2] + '"';
        headers.set("ETag", etag);
        if (request.headers.get("If-None-Match") === etag) return new Response(null, { status: 304, headers });
        headers.set("X-Content-Type-Options", "nosniff");
        if (image.content_type === "image/svg+xml") headers.set("Content-Security-Policy", "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox");
        return new Response(bytes, { headers });
      }
      if (url.pathname.startsWith("/files/") && request.method === "GET") {
        await ensureImageSchema(env);
        let filename = url.pathname.slice("/files/".length);
        try {
          for (let pass = 0; pass < 2; pass++) {
            const decoded = decodeURIComponent(filename);
            if (decoded === filename) break;
            filename = decoded;
          }
        } catch {
        }
        filename = filename.replace(/\+/g, " ");
        filename = filename.trim().slice(0, 160);
        if (!filename || filename.includes("/")) return new Response("Not found", { status: 404 });
        let image = await env.DB.prepare("SELECT id, content_type, data_base64 FROM images WHERE filename = ? COLLATE NOCASE LIMIT 1").bind(filename).first();
        if (!image) {
          image = await env.DB.prepare("SELECT images.id, images.content_type, images.data_base64 FROM image_aliases JOIN images ON images.id = image_aliases.image_id WHERE image_aliases.alias = ? COLLATE NOCASE LIMIT 1").bind(filename).first();
        }
        if (!image) return new Response("Not found", { status: 404 });
        const binary = atob(image.data_base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const headers = new Headers(cors);
        headers.set("Content-Type", image.content_type);
        headers.set("Content-Length", String(bytes.byteLength));
        headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
        headers.set("Pragma", "no-cache");
        headers.set("Expires", "0");
        headers.set("ETag", '"' + image.id + '"');
        headers.set("X-Content-Type-Options", "nosniff");
        if (request.headers.get("If-None-Match") === '"' + image.id + '"') return new Response(null, { status: 304, headers });
        if (image.content_type === "image/svg+xml") headers.set("Content-Security-Policy", "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox");
        return new Response(bytes, { headers });
      }
      if (url.pathname.startsWith("/media/") && request.method === "GET") {
        const key = url.pathname.slice("/media/".length);
        if (!/^[a-f0-9-]{36}$/i.test(key)) return new Response("Not found", { status: 404 });
        const image = await env.DB.prepare("SELECT content_type, data_base64 FROM images WHERE id = ?").bind(key).first();
        if (!image) return new Response("Not found", { status: 404 });
        const binary = atob(image.data_base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const headers = new Headers(cors);
        headers.set("Content-Type", image.content_type);
        headers.set("Content-Length", String(bytes.byteLength));
        headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
        headers.set("Pragma", "no-cache");
        headers.set("Expires", "0");
        headers.set("ETag", '"' + key + '"');
        headers.set("X-Content-Type-Options", "nosniff");
        if (request.headers.get("If-None-Match") === '"' + key + '"') return new Response(null, { status: 304, headers });
        if (image.content_type === "image/svg+xml") headers.set("Content-Security-Policy", "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox");
        return new Response(bytes, { headers });
      }
      return response({ error: "\uC694\uCCAD\uD55C \uACBD\uB85C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
    } catch (error) {
      const status = Number(error?.status);
      console.error("AonWiki request failed", {
        method: request.method,
        path: url.pathname,
        status: status || 500,
        message: String(error?.message || error || "unknown")
      });
      if (status >= 400 && status < 500) return response({ error: String(error?.message || "\uC798\uBABB\uB41C \uC694\uCCAD\uC785\uB2C8\uB2E4.") }, status, cors);
      if (status >= 500) return response({ error: "\uD504\uB7F0\uD2B8\uC5D4\uB4DC \uB9AC\uC18C\uC2A4\uB97C \uC77C\uC2DC\uC801\uC73C\uB85C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 503, cors);
      return response({ error: "\uC11C\uBC84 \uB0B4\uBD80 \uC624\uB958" }, 500, cors);
    }
  }
};
export {
  index_default as default
};
