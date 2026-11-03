import type { RequestHandler } from "./$types";
import { proxyApi } from "$lib/server/api";

// Keep the two high-frequency identity/list endpoints explicit. This avoids
// relying on the catch-all API route for the shell's startup requests.
export const GET: RequestHandler = (event) => proxyApi(event);
