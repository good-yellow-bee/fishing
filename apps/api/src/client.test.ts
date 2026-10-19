import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { Hono } from "hono";
import { serveClient } from "./client.ts";

const dist = mkdtempSync(join(tmpdir(), "stillwater-dist-"));
mkdirSync(join(dist, "assets"));
writeFileSync(join(dist, "index.html"), "<!doctype html><title>Stillwater</title>");
writeFileSync(join(dist, "assets", "app-abc.js"), "console.log(1)");

const app = new Hono();
app.get("/api/health", (c) => c.json({ ok: true }));
serveClient(app, dist);

afterAll(() => rmSync(dist, { recursive: true, force: true }));

describe("serveClient", () => {
  it("serves the page at / and at client routes", async () => {
    for (const path of ["/", "/play", "/catches/abc/edit"]) {
      const res = await app.request(path);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");
      expect(await res.text()).toContain("<title>Stillwater</title>");
    }
  });

  it("serves built files with their type", async () => {
    const res = await app.request("/assets/app-abc.js");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("javascript");
  });

  it("leaves a missing file and unknown API paths as 404", async () => {
    expect((await app.request("/assets/app-old.js")).status).toBe(404);
    expect((await app.request("/api/nope")).status).toBe(404);
    expect((await app.request("/api/health")).status).toBe(200);
  });
});
