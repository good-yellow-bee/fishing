import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Hono } from "hono";
import type { LodgeTrack } from "@stillwater/shared";

const testDir = mkdtempSync(join(tmpdir(), "stillwater-lodge-"));
process.env.STILLWATER_DB_PATH = join(testDir, "stillwater.sqlite");

let app: Hono;
let db: typeof import("../db.ts").db;
let clearLodgeCache: () => void;

beforeAll(async () => {
  const routes = await import("./lodge.ts");
  clearLodgeCache = routes.clearLodgeCache;
  db = (await import("../db.ts")).db;
  app = new Hono();
  app.use("*", async (c, next) => {
    c.set("user", { id: "ash", name: "Ash", email: "ash@x.test" });
    await next();
  });
  app.route("/", routes.lodgeRoutes);
});

afterAll(() => {
  db.close();
  rmSync(testDir, { recursive: true, force: true });
});

function angler(id: string, name: string) {
  const at = new Date().toISOString();
  db.prepare(`INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 0, ?, ?)`).run(id, name, `${id}@x.test`, at, at);
  db.prepare(`INSERT INTO profile (user_id, display_name) VALUES (?, ?)`).run(id, name);
}

function landed(id: string, userId: string, speciesId: string, spot: string, minutesAgo: number) {
  db.prepare(
    `INSERT INTO catch (id, user_id, species_id, weight, points, spot, request_id, clean, created_at) VALUES (?, ?, ?, 1, 1, ?, ?, 0, ?)`,
  ).run(id, userId, speciesId, spot, `r-${id}`, new Date(Date.now() - minutesAgo * 60_000).toISOString());
}

async function tracks() {
  const response = await app.request("http://test/lodge/recent");
  expect(response.status).toBe(200);
  return ((await response.json()) as { tracks: LodgeTrack[] }).tracks;
}

beforeEach(() => {
  clearLodgeCache();
  db.exec(`DELETE FROM catch; DELETE FROM profile; DELETE FROM "user";`);
  angler("ash", "Ash");
  angler("mara", "Mara");
});

describe("GET /lodge/recent", () => {
  it("lists other anglers' catches from the last hour, newest first, without the viewer's own", async () => {
    landed("old", "mara", "carp", "dock", 61);
    landed("pike", "mara", "pike", "reeds", 12);
    landed("perch", "mara", "perch", "dock", 3);
    landed("mine", "ash", "bluegill", "dock", 1);

    const rows = await tracks();
    expect(rows.map((row) => row.id)).toEqual(["perch", "pike"]);
    expect(rows[1]).toEqual({ id: "pike", displayName: "Mara", speciesId: "pike", spot: "reeds", createdAt: expect.any(String) });
    expect(rows[1]).not.toHaveProperty("userId");
  });

  it("serves the same read for a minute", async () => {
    landed("pike", "mara", "pike", "reeds", 5);
    expect(await tracks()).toHaveLength(1);
    landed("perch", "mara", "perch", "dock", 1);
    expect(await tracks()).toHaveLength(1);
    clearLodgeCache();
    expect(await tracks()).toHaveLength(2);
  });
});
