export const urlPas = (data: string) => {
  return encodeURIComponent(data.replace(/^\./g, "\\\\.")).replaceAll("/", "%2F");
};
export function sha224Replace(data: string) {
  let hash = 2166136261;
  for (let i = 0; i < data.length; i++) {
    hash ^= data.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const parts: string[] = [];
  for (let i = 0; i < 7; i++) {
    const value = Math.imul(hash ^ (0x9e3779b9 * (i + 1)), 0x85ebca6b);
    parts.push((value >>> 0).toString(16).padStart(8, "0"));
  }
  return parts.join("").slice(0, 56);
}
export function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}
export function unescapeHtml(html: string) {
  return html.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
}
export const globalRegExp = (regexp: RegExp) => new RegExp(regexp, "g");
