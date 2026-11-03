declare global {
  namespace App {
    interface Platform {
      env: {
        API_ORIGIN?: string;
        ASSETS?: { fetch: typeof fetch };
        DB?: unknown;
      };
      context: { waitUntil(promise: Promise<unknown>): void };
      caches: CacheStorage;
    }
  }
}
declare module "*.html?raw" {
  const content: string;
  export default content;
}
export {};
