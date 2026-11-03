import type { Handle } from "@sveltejs/kit";
export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("X-AonWiki-Render", "sveltekit-ssr");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};
