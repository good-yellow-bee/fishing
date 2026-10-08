import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Hono } from "hono";

const testDir = mkdtempSync(join(tmpdir(), "stillwater-api-"));
process.env.STILLWATER_DB_PATH = join(testDir, "stillwater.sqlite");

const user = { id: "angler-1", name: "Angler", email: "angler@example.test" };
const requestId = "1e0a0c08-7e6d-4ee2-8718-4a938773b7e1";

let app: Hono;
let db: typeof import("../db.ts").db;
let createProfile: typeof import("../db.ts").createProfile;

beforeAll(async () => {
  const routes = await import("./catches.ts");
  const upgrades = await import("./upgrades.ts");
  const database = await import("../db.ts");
  db = database.db;
  createProfile = database.createProfile;
  app = new Hono();
  app.use("*", async (c, next) => {
    c.set("user", user);
    await next();
  });
  app.route("/", routes.catchRoutes);
  app.route("/", upgrades.upgradeRoutes);
});

beforeEach(() => {
  db.exec(`DELETE FROM catch; DELETE FROM profile; DELETE FROM "user";`);
  db.prepare(
    `INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 0, ?, ?)`,
  ).run(user.id, user.name, user.email, new Date().toISOString(), new Date().toISOString());
  createProfile(user.id, user.name);
});

afterAll(() => {
  db.close();
  rmSync(testDir, { recursive: true, force: true });
});

describe("POST /catches", () => {
  it("returns 400 for malformed JSON", async () => {
    const response = await app.request("http://test/catches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid JSON" });
  });

  it("returns the original result when a request is retried", async () => {
    const payload = { requestId, speciesId: "golden-shiner", weight: 0.3, spot: "dock" };
    const first = await app.request("http://test/catches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const second = await app.request("http://test/catches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toEqual(await first.json());
    expect(db.prepare(`SELECT COUNT(*) as count FROM catch`).get()).toEqual({ count: 1 });
    expect(db.prepare(`SELECT points, lifetime_points FROM profile WHERE user_id = ?`).get(user.id)).toEqual({
      points: 8,
      lifetime_points: 8,
    });
  });

  it("rejects a request ID reused for a different catch", async () => {
    const first = await app.request("http://test/catches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, speciesId: "golden-shiner", weight: 0.3, spot: "dock" }),
    });
    const conflict = await app.request("http://test/catches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, speciesId: "golden-shiner", weight: 0.2, spot: "dock" }),
    });

    expect(first.status).toBe(200);
    expect(conflict.status).toBe(409);
    await expect(conflict.json()).resolves.toEqual({ error: "request ID conflicts with an existing catch" });
  });

  it("limits successful catch submissions per minute", async () => {
    const results = await Promise.all(
      Array.from({ length: 13 }, (_, index) =>
        app.request("http://test/catches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: `1e0a0c08-7e6d-4ee2-8718-${String(index).padStart(12, "0")}`,
            speciesId: "golden-shiner",
            weight: 0.3,
            spot: "dock",
          }),
        }),
      ),
    );

    expect(results.filter((response) => response.status === 200)).toHaveLength(12);
    expect(results.filter((response) => response.status === 429)).toHaveLength(1);
  });

  it("returns 400 for malformed upgrade JSON", async () => {
    const response = await app.request("http://test/upgrades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid JSON" });
  });
});
