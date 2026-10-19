import { join } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import type { Hono } from "hono";
import { compress } from "hono/compress";

const isApi = (path: string) => path === "/api" || path.startsWith("/api/");

/** Serves the built web client; a page load anywhere else gets index.html so the client router takes it. */
export function serveClient(app: Hono, distDir: string) {
  const files = serveStatic({ root: distDir });
  const shell = serveStatic({ path: join(distDir, "index.html") });
  app.use("*", compress());
  // Vite puts a content hash in every name under /assets, so a release never changes one in place.
  app.use("/assets/*", async (c, next) => {
    await next();
    if (c.res.ok) c.res.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  });
  app.get("*", (c, next) => (isApi(c.req.path) ? next() : files(c, next)));
  // Only page loads fall back: a missing script or model (an old chunk after a release) stays a 404.
  app.get("*", (c, next) =>
    isApi(c.req.path) || !c.req.header("Accept")?.includes("text/html") ? next() : shell(c, next),
  );
}
