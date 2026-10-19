import { join } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import type { Hono } from "hono";

const isApi = (path: string) => path === "/api" || path.startsWith("/api/");
// A missing file (an old hashed chunk after a release) stays a 404 rather than turning into the page.
const isFile = (path: string) => /\.[^/]*$/.test(path);

/** Serves the built web client; any other page path gets index.html so the client router takes it. */
export function serveClient(app: Hono, distDir: string) {
  const files = serveStatic({ root: distDir });
  const shell = serveStatic({ path: join(distDir, "index.html") });
  app.get("*", (c, next) => (isApi(c.req.path) ? next() : files(c, next)));
  app.get("*", (c, next) => (isApi(c.req.path) || isFile(c.req.path) ? next() : shell(c, next)));
}
