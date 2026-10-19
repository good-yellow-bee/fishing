import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { Hono } from "hono";
import { serveClient } from "./client.ts";

const dist = mkdtempSync(join(tmpdir(), "stillwater-dist-"));
mkdirSync(join(dist, "assets"));
writeFileSync(join(dist, "index.html"), "<!doctype html><title>Stillwater</title>");
writeFileSync(join(dist, "assets", "app-abc.js"), `console.log("${"x".repeat(2000)}")`);
writeFileSync(join(dist, "manifest.webmanifest"), "{}");

const app = new Hono();
app.get("/api/health", (c) => c.json({ ok: true }));
serveClient(app, dist);

const page = (path: string) => app.request(path, { headers: { Accept: "text/html,application/xhtml+xml" } });

afterAll(() => rmSync(dist, { recursive: true, force: true }));

describe("serveClient", () => {
  it("serves the page at / and at client routes, a dot in the route included", async () => {
    for (const path of ["/", "/play", "/catches/abc/edit", "/species/Bass%20sp."]) {
      const res = await page(path);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");
      expect(await res.text()).toContain("<title>Stillwater</title>");
    }
  });

  it("serves hashed builds gzipped and cached for good, other files without the long cache", async () => {
    const res = await app.request("/assets/app-abc.js", { headers: { "Accept-Encoding": "gzip" } });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("javascript");
    expect(res.headers.get("content-encoding")).toBe("gzip");
    expect(res.headers.get("cache-control")).toContain("immutable");
    expect((await app.request("/manifest.webmanifest")).headers.get("cache-control")).toBeNull();
  });

  it("leaves a missing script and unknown API paths as 404", async () => {
    expect((await app.request("/assets/app-old.js")).status).toBe(404);
    expect((await page("/api/nope")).status).toBe(404);
    expect((await app.request("/api/health")).status).toBe(200);
  });
});
