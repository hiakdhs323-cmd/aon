import type { RequestEvent } from "@sveltejs/kit";
export const DEFAULT_API_ORIGIN = "https://aon.hiakdhs323.workers.dev";
export function apiOrigin(event: RequestEvent): string {
  return String(event.platform?.env?.API_ORIGIN || DEFAULT_API_ORIGIN).replace(/\/$/, "");
}
export async function fetchApi(event: RequestEvent, path: string, init: RequestInit = {}): Promise<Response> {
  const target = new URL(path.replace(/^\//, ""), apiOrigin(event) + "/");
  const headers = new Headers(init.headers || {});
  headers.delete("host");
  headers.delete("origin");
  return fetch(target, { ...init, headers, redirect: "manual" });
}
export async function proxyApi(event: RequestEvent): Promise<Response> {
  const incoming = new URL(event.request.url);
  const target = new URL(incoming.pathname.replace(/^\/api\//, "") + incoming.search, apiOrigin(event) + "/api/");
  const headers = new Headers(event.request.headers);
  headers.delete("host");
  headers.delete("origin");
  headers.delete("content-length");
  const upstream = await fetch(target, {
    method: event.request.method,
    headers,
    body: ["GET", "HEAD"].includes(event.request.method) ? undefined : event.request.body,
    redirect: "manual"
  });
  const outHeaders = new Headers(upstream.headers);
  outHeaders.set("X-AonWiki-API-Proxy", "sveltekit");
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: outHeaders });
}
