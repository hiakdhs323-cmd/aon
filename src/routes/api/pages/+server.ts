import type { RequestHandler } from "./$types";
import { proxyApi } from "$lib/server/api";

export const GET: RequestHandler = (event) => proxyApi(event);
