import type { RequestHandler } from "./$types";
import { proxyApi } from "$lib/server/api";
const proxy: RequestHandler = (event) => proxyApi(event);
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
