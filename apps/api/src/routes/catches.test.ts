import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { catchPoints, CLEAN_RUN_BONUS, DAY_RUN_BONUS, fishById, GOLDEN_BONUS, GROUNDBAIT_PRICE, isGolden, LODGE_RECORD_BONUS, MASTER_BONUS, PB_BONUS, SHINER_PRICE, GIANT_BONUS, giantAt, TAG_FINDER_BONUS, TAG_RETURN_BONUS, weeklyBonus } from "@stillwater/shared";

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
  db.exec(`DELETE FROM lost_fish; DELETE FROM giant_landed; DELETE FROM catch; DELETE FROM profile; DELETE FROM "user";`);
  db.prepare(
    `INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 0, ?, ?)`,
  ).run(user.id, user.name, user.email, new Date().toISOString(), new Date().toISOString());
  createProfile(user.id, user.name);
});

afterAll(() => {
  db.close();
  rmSync(testDir, { recursive: true, force: true });
});

function post(body: unknown) {
  return app.request("http://test/catches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

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

  it("stores a clean fight and returns its bonused points", async () => {
    const points = catchPoints(fishById("golden-shiner")!, 0.3, true);
    const response = await post({ requestId, speciesId: "golden-shiner", weight: 0.3, spot: "dock", clean: true });

    expect(response.status).toBe(200);
    expect(points).toBeGreaterThan(catchPoints(fishById("golden-shiner")!, 0.3));
    await expect(response.json()).resolves.toMatchObject({ points });
    expect(db.prepare(`SELECT clean, points FROM catch`).get()).toEqual({ clean: 1, points });
    expect(db.prepare(`SELECT points FROM profile WHERE user_id = ?`).get(user.id)).toEqual({ points });
  });

  it("adds the clean-run bonus to the third clean fight in a row", async () => {
    const points = catchPoints(fishById("golden-shiner")!, 0.3, true, CLEAN_RUN_BONUS);
    const response = await post({ requestId, speciesId: "golden-shiner", weight: 0.3, spot: "dock", clean: true, cleanRun: 3 });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ points });
    expect(db.prepare(`SELECT points FROM catch`).get()).toEqual({ points });
  });

  it("adds the lodge record bonus to a fish that takes the record from another angler, and only the personal best one after", async () => {
    const shiner = fishById("golden-shiner")!;
    db.prepare(`INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 0, ?, ?)`).run("mara", "Mara", "mara@example.test", new Date().toISOString(), new Date().toISOString());
    createProfile("mara", "Mara");
    db.prepare(`INSERT INTO catch (id, user_id, species_id, weight, points, spot, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run("mara-shiner", "mara", "golden-shiner", 0.3, 3, "dock", new Date(Date.now() - 60_000).toISOString());
    const bonus = (id: string) => weeklyBonus(shiner.id) * (isGolden(id) ? GOLDEN_BONUS : 1);
    const taken = await post({ requestId, speciesId: "golden-shiner", weight: 0.35, spot: "dock" });
    await expect(taken.json()).resolves.toMatchObject({ points: catchPoints(shiner, 0.35, false, LODGE_RECORD_BONUS * bonus(requestId)) });
    const nextId = "2e0a0c08-7e6d-4ee2-8718-4a938773b7e2";
    const beaten = await post({ requestId: nextId, speciesId: "golden-shiner", weight: 0.4, spot: "dock" });
    await expect(beaten.json()).resolves.toMatchObject({ points: catchPoints(shiner, 0.4, false, PB_BONUS * bonus(nextId)) });
  });

  it("pays the master bonus on a kind the angler has landed forty of", async () => {
    const shiner = fishById("golden-shiner")!;
    const insert = db.prepare(`INSERT INTO catch (id, user_id, species_id, weight, points, spot, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    for (let i = 0; i < 40; i++) insert.run(`old-${i}`, user.id, "golden-shiner", 0.4, 3, "dock", new Date(Date.now() - 60_000).toISOString());
    const response = await post({ requestId, speciesId: "golden-shiner", weight: 0.3, spot: "dock" });
    const bonus = weeklyBonus(shiner.id) * (isGolden(requestId) ? GOLDEN_BONUS : 1);
    await expect(response.json()).resolves.toMatchObject({ points: catchPoints(shiner, 0.3, false, MASTER_BONUS * bonus) });
  });

  it("adds the day-run bonus to the first fish of the third day in a row, and not to the day's next", async () => {
    const bluegill = fishById("bluegill")!;
    const bonus = (id: string) => weeklyBonus(bluegill.id) * (isGolden(id) ? GOLDEN_BONUS : 1);
    await post({ requestId, speciesId: "golden-shiner", weight: 0.3, spot: "dock", day: "2026-07-13" });
    await post({ requestId: "2e0a0c08-7e6d-4ee2-8718-4a938773b7e2", speciesId: "golden-shiner", weight: 0.3, spot: "dock", day: "2026-07-14" });
    const firstId = "3e0a0c08-7e6d-4ee2-8718-4a938773b7e3";
    const first = await post({ requestId: firstId, speciesId: "bluegill", weight: 0.5, spot: "point", day: "2026-07-15" });
    await expect(first.json()).resolves.toMatchObject({ points: catchPoints(bluegill, 0.5, false, DAY_RUN_BONUS * bonus(firstId)) });
    const nextId = "4e0a0c08-7e6d-4ee2-8718-4a938773b7e4";
    const next = await post({ requestId: nextId, speciesId: "bluegill", weight: 0.5, spot: "point", day: "2026-07-15" });
    await expect(next.json()).resolves.toMatchObject({ points: catchPoints(bluegill, 0.5, false, bonus(nextId)) });
  });

  it("adds the personal best bonus to a fish heavier than the angler's best of its kind", async () => {
    const shiner = fishById("golden-shiner")!;
    const first = await post({ requestId, speciesId: "golden-shiner", weight: 0.3, spot: "dock" });
    expect(first.status).toBe(200);
    const secondId = "2e0a0c08-7e6d-4ee2-8718-4a938773b7e2";
    const second = await post({ requestId: secondId, speciesId: "golden-shiner", weight: 0.4, spot: "dock" });
    const weekly = weeklyBonus(shiner.id) * (isGolden(secondId) ? GOLDEN_BONUS : 1);
    await expect(second.json()).resolves.toMatchObject({ points: catchPoints(shiner, 0.4, false, PB_BONUS * weekly) });
    const third = await post({ requestId: "3e0a0c08-7e6d-4ee2-8718-4a938773b7e3", speciesId: "golden-shiner", weight: 0.4, spot: "dock" });
    const plain = weeklyBonus(shiner.id) * (isGolden("3e0a0c08-7e6d-4ee2-8718-4a938773b7e3") ? GOLDEN_BONUS : 1);
    await expect(third.json()).resolves.toMatchObject({ points: catchPoints(shiner, 0.4, false, plain) });
  });

  it("rejects a clean run that is not a whole number", async () => {
    for (const cleanRun of [-1, 1.5, "3"]) {
      const response = await post({ requestId, speciesId: "golden-shiner", weight: 0.3, spot: "dock", clean: true, cleanRun });
      expect(response.status).toBe(400);
    }
    expect(db.prepare(`SELECT COUNT(*) as count FROM catch`).get()).toEqual({ count: 0 });
  });

  it("rejects a retry that changes the clean flag", async () => {
    const payload = { requestId, speciesId: "golden-shiner", weight: 0.3, spot: "dock" };
    expect((await post(payload)).status).toBe(200);
    const conflict = await post({ ...payload, clean: true });

    expect(conflict.status).toBe(409);
    expect((await post({ ...payload, clean: false })).status).toBe(200);
  });

  it("rejects a clean flag that is not a boolean", async () => {
    const response = await post({ requestId, speciesId: "golden-shiner", weight: 0.3, spot: "dock", clean: "yes" });

    expect(response.status).toBe(400);
    expect(db.prepare(`SELECT COUNT(*) as count FROM catch`).get()).toEqual({ count: 0 });
  });

  it("stores the hour and sky the fish came in under", async () => {
    const response = await post({ requestId, speciesId: "golden-shiner", weight: 0.3, spot: "dock", hour: "dusk", sky: "rain" });

    expect(response.status).toBe(200);
    expect(db.prepare(`SELECT hour, sky FROM catch`).get()).toEqual({ hour: "dusk", sky: "rain" });
  });

  it("keeps posting a catch queued before conditions were sent, with none recorded", async () => {
    expect((await post({ requestId, speciesId: "golden-shiner", weight: 0.3, spot: "dock" })).status).toBe(200);
    expect(db.prepare(`SELECT hour, sky FROM catch`).get()).toEqual({ hour: null, sky: null });
  });

  it("rejects an unknown hour or sky", async () => {
    const payload = { requestId, speciesId: "golden-shiner", weight: 0.3, spot: "dock" };
    expect((await post({ ...payload, hour: "noon", sky: "rain" })).status).toBe(400);
    expect((await post({ ...payload, hour: "dusk", sky: "hail" })).status).toBe(400);
    expect((await post({ ...payload, hour: 3 })).status).toBe(400);
    expect(db.prepare(`SELECT COUNT(*) as count FROM catch`).get()).toEqual({ count: 0 });
  });

  it("stores the season the fish came in, and rejects an unknown one", async () => {
    const payload = { requestId, speciesId: "golden-shiner", weight: 0.3, spot: "dock", hour: "dusk", sky: "rain" };
    expect((await post({ ...payload, season: "monsoon" })).status).toBe(400);
    expect((await post({ ...payload, season: "winter" })).status).toBe(200);
    expect(db.prepare(`SELECT season FROM catch`).get()).toEqual({ season: "winter" });
    expect((await post({ ...payload, season: "spring" })).status).toBe(409);
  });

  it("rejects a retry that changes the conditions", async () => {
    const payload = { requestId, speciesId: "golden-shiner", weight: 0.3, spot: "dock", hour: "night", sky: "fog" };
    expect((await post(payload)).status).toBe(200);
    expect((await post({ ...payload, sky: "clear" })).status).toBe(409);
    expect((await post(payload)).status).toBe(200);
  });

  it("groups the whole history into badge facts, and the lodge reads badges from them", async () => {
    const { listBadgeFacts } = await import("../db.ts");
    const { badgeProgress } = await import("@stillwater/shared");
    const ids = ["1e0a0c08-7e6d-4ee2-8718-4a938773b7e3", "1e0a0c08-7e6d-4ee2-8718-4a938773b7e4", "1e0a0c08-7e6d-4ee2-8718-4a938773b7e5"];
    await post({ requestId: ids[0], speciesId: "golden-shiner", weight: 0.3, spot: "dock", hour: "night", sky: "rain", season: "fall", clean: true });
    await post({ requestId: ids[1], speciesId: "golden-shiner", weight: 0.4, spot: "dock", hour: "night", sky: "rain", season: "fall", clean: true });
    await post({ requestId: ids[2], speciesId: "golden-shiner", weight: 0.2, spot: "dock" });

    const facts = listBadgeFacts(user.id);
    expect(facts).toHaveLength(2);
    expect(facts).toContainEqual({ speciesId: "golden-shiner", spot: "dock", hour: "night", sky: "rain", season: "fall", clean: true, golden: false, released: false, count: 2, heaviest: 0.4 });
    expect(facts).toContainEqual({ speciesId: "golden-shiner", spot: "dock", hour: null, sky: null, season: null, clean: false, golden: false, released: false, count: 1, heaviest: 0.2 });
    expect(badgeProgress(facts).find((badge) => badge.id === "night-owl")).toMatchObject({ have: 2, earned: false });
    expect(badgeProgress(facts).find((badge) => badge.id === "four-seasons")).toMatchObject({ have: 1, earned: false });
  });

  it("rolls a golden fish from the request ID, pays it double and counts it for the Gold badge", async () => {
    const { listBadgeFacts } = await import("../db.ts");
    const { badgeProgress, isGolden, weeklyBonus, GOLDEN_BONUS } = await import("@stillwater/shared");
    const ids = Array.from({ length: 400 }, (_, i) => `1e0a0c08-7e6d-4ee2-8718-${i.toString(16).padStart(12, "0")}`);
    const golden = ids.find(isGolden)!;
    const plain = ids.find((id) => !isGolden(id))!;
    const fish = fishById("golden-shiner")!;
    const paid = await (await post({ requestId: golden, speciesId: fish.id, weight: 0.3, spot: "dock" })).json();
    expect(paid.points).toBe(catchPoints(fish, 0.3, false, GOLDEN_BONUS * weeklyBonus(fish.id)));
    await post({ requestId: plain, speciesId: fish.id, weight: 0.3, spot: "dock" });
    expect(db.prepare(`SELECT request_id, golden FROM catch ORDER BY golden DESC`).all()).toEqual([
      { request_id: golden, golden: 1 },
      { request_id: plain, golden: 0 },
    ]);
    expect(badgeProgress(listBadgeFacts(user.id)).find((badge) => badge.id === "gold")).toMatchObject({ have: 1, earned: true });
  });

  it("releases a saved catch once, keeping its points, and counts it for Steward", async () => {
    const { listBadgeFacts, getProfile } = await import("../db.ts");
    const { badgeProgress } = await import("@stillwater/shared");
    await post({ requestId, speciesId: "golden-shiner", weight: 0.3, spot: "dock" });
    const points = getProfile(user.id)!.points;
    const release = () => app.request(`http://test/catches/${requestId}/release`, { method: "POST" });
    const first = await release();
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ released: true, bonus: 0 });
    expect((await release()).status).toBe(200);
    expect(getProfile(user.id)!.points).toBe(points);
    expect(badgeProgress(listBadgeFacts(user.id)).find((badge) => badge.id === "steward")).toMatchObject({ have: 1, earned: false });
  });

  it("pays the trophy release bonus once, for a trophy-weight fish let go", async () => {
    const { getProfile } = await import("../db.ts");
    const { TROPHY_RELEASE_BONUS } = await import("@stillwater/shared");
    await post({ requestId, speciesId: "golden-shiner", weight: 0.4, spot: "dock" });
    const before = getProfile(user.id)!;
    const release = () => app.request(`http://test/catches/${requestId}/release`, { method: "POST" });
    expect(await (await release()).json()).toMatchObject({ released: true, bonus: TROPHY_RELEASE_BONUS });
    expect(await (await release()).json()).toMatchObject({ released: true, bonus: 0 });
    const after = getProfile(user.id)!;
    expect(after.points).toBe(before.points + TROPHY_RELEASE_BONUS);
    expect(after.lifetime_points).toBe(before.lifetime_points + TROPHY_RELEASE_BONUS);
  });

  it("pays a nest guarder's release bonus for one saved off its spring nest, by the server's season, not the client's", async () => {
    const { NEST_RELEASE_BONUS } = await import("@stillwater/shared");
    db.prepare(`UPDATE profile SET strength = 10, accuracy = 10 WHERE user_id = ?`).run(user.id);
    const release = (id: string) => app.request(`http://test/catches/${id}/release`, { method: "POST" });
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date(2026, 3, 20, 12));
      await post({ requestId, speciesId: "smallmouth-bass", weight: 3.5, spot: "dock", season: "spring" });
      expect(await (await release(requestId)).json()).toMatchObject({ released: true, bonus: NEST_RELEASE_BONUS });
      // Saved in the fall, a catch that says spring pays nothing extra.
      vi.setSystemTime(new Date(2026, 9, 20, 12));
      const fall = "6a5b4c3d-2e1f-4a0b-9c8d-7e6f5a4b3c2d";
      await post({ requestId: fall, speciesId: "smallmouth-bass", weight: 3.5, spot: "dock", season: "spring" });
      expect(await (await release(fall)).json()).toMatchObject({ released: true, bonus: 0 });
    } finally {
      vi.useRealTimers();
    }
  });

  it("refuses to release a catch that is not saved, or a malformed ID", async () => {
    expect((await app.request(`http://test/catches/${requestId}/release`, { method: "POST" })).status).toBe(404);
    expect((await app.request("http://test/catches/nope/release", { method: "POST" })).status).toBe(400);
  });

  it("files each catch under the angler's local day, and turns away a day that isn't one or is ahead of every time zone", async () => {
    const { listCatchDays } = await import("../db.ts");
    const id = (n: number) => `1e0a0c08-7e6d-4ee2-8718-${String(n).padStart(12, "0")}`;
    const fish = { speciesId: "golden-shiner", weight: 0.3, spot: "dock" };
    for (const [n, day] of [[1, "2026-10-11"], [2, "2026-10-10"], [3, "2026-10-11"]] as const) {
      expect((await post({ ...fish, requestId: id(n), day })).status).toBe(200);
    }
    expect((await post({ ...fish, requestId: id(4) })).status).toBe(200);
    expect(listCatchDays(user.id)).toEqual(["2026-10-10", "2026-10-11"]);
    expect((await post({ ...fish, requestId: id(5), day: "2026-02-30" })).status).toBe(400);
    expect((await post({ ...fish, requestId: id(6), day: "2999-01-01" })).status).toBe(400);
    expect((await post({ ...fish, requestId: id(1), day: "2026-10-12" })).status).toBe(409);
  });

  describe("another angler's let-go fish", () => {
    const tagId = "2b1c0d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e";
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    function letGo(id: string, at: string, owner = "other", spot = "dock", weight = 2) {
      db.prepare(`INSERT INTO catch (id, user_id, species_id, weight, points, spot, request_id, clean, released, created_at) VALUES (?, ?, 'smallmouth-bass', ?, 10, ?, ?, 0, 1, ?)`).run(id, owner, weight, spot, `r-${id}`, at);
    }
    beforeEach(() => {
      db.prepare(`INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES ('other', 'Mara', 'mara@example.test', 0, ?, ?)`).run(yesterday, yesterday);
      createProfile("other", "Mara");
      db.prepare(`UPDATE profile SET strength = 2 WHERE user_id = ?`).run(user.id);
    });
    const points = (id: string) => (db.prepare(`SELECT points FROM profile WHERE user_id = ?`).get(id) as { points: number }).points;
    const landTag = (weight = 2.2, extra: Record<string, unknown> = {}) => post({ requestId, speciesId: "smallmouth-bass", weight, spot: "dock", taggedFrom: tagId, ...extra });

    it("pays the finder and the angler who let it go, once", async () => {
      letGo(tagId, yesterday);
      // A heavier bass of Mara's keeps the lodge record out of the sum.
      db.prepare(`INSERT INTO catch (id, user_id, species_id, weight, points, spot, request_id, clean, created_at) VALUES ('big', 'other', 'smallmouth-bass', 3.5, 0, 'dock', 'r-big', 0, ?)`).run(yesterday);
      const plain = catchPoints(fishById("smallmouth-bass")!, 2.2, false, weeklyBonus("smallmouth-bass", new Date().toISOString().slice(0, 10)) * (isGolden(requestId) ? GOLDEN_BONUS : 1));
      const response = await landTag();
      expect(response.status).toBe(200);
      expect((await response.json()).points).toBe(plain + TAG_FINDER_BONUS);
      expect(points("other")).toBe(TAG_RETURN_BONUS);
      expect((db.prepare(`SELECT bonuses FROM catch WHERE request_id = ?`).get(requestId) as { bonuses: string }).bonuses.split(",")).toContain("tag");
      // Landed, it is out of the lake for everyone: a second claim saves a plain catch.
      const again = await landTag(2.2, { requestId: "3c2d1e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f" });
      expect(again.status).toBe(200);
      expect(points("other")).toBe(TAG_RETURN_BONUS);
    });

    it("pays no tag for the angler's own fish, one let go today, at another bank, or grown past what it could, but keeps the catch", async () => {
      const tagged = () => (db.prepare(`SELECT COUNT(*) as n FROM catch WHERE tagged_from IS NOT NULL`).get() as { n: number }).n;
      const claims: [string, string, string, number][] = [[user.id, yesterday, "dock", 2.2], ["other", new Date().toISOString(), "dock", 2.2], ["other", yesterday, "reeds", 2.2], ["other", yesterday, "dock", 2.7], ["other", yesterday, "dock", 1.9]];
      for (const [owner, at, spot, weight] of claims) {
        db.exec(`DELETE FROM catch`);
        letGo(tagId, at, owner, spot);
        expect((await landTag(weight)).status).toBe(200);
        expect(tagged()).toBe(0);
      }
      expect(points("other")).toBe(0);
      expect((await post({ requestId, speciesId: "smallmouth-bass", weight: 2.2, spot: "dock", taggedFrom: "not-an-id" })).status).toBe(400);
    });
  });

  it("pays the week's giant to the first angler who lands it, and a plain catch after", async () => {
    db.prepare(`UPDATE profile SET strength = 10, accuracy = 10, lifetime_points = 0 WHERE user_id = ?`).run(user.id);
    const giant = giantAt("dock")!;
    const first = await post({ requestId, speciesId: giant.speciesId, weight: giant.weight, spot: "dock", giant: true });
    const firstBody = (await first.json()) as { points: number };
    const again = await post({ requestId: "4d3e2f1a-6b7c-4d8e-9f0a-1b2c3d4e5f60", speciesId: giant.speciesId, weight: giant.weight, spot: "dock", giant: true });
    const againBody = (await again.json()) as { points: number };
    expect(firstBody.points - againBody.points).toBeGreaterThanOrEqual(GIANT_BONUS - 1);
    const bonuses = (id: string) => (db.prepare(`SELECT bonuses FROM catch WHERE request_id = ?`).get(id) as { bonuses: string }).bonuses.split(",");
    expect(bonuses(requestId)).toContain("giant");
    const { countGiantsLanded } = await import("../db.ts");
    expect(countGiantsLanded(user.id)).toBe(1);
    expect(bonuses("4d3e2f1a-6b7c-4d8e-9f0a-1b2c3d4e5f60")).not.toContain("giant");
    // A wrong weight claims nothing.
    db.exec(`DELETE FROM giant_landed`);
    const off = await post({ requestId: "5e4f3a2b-7c8d-4e9f-8a1b-2c3d4e5f6a70", speciesId: giant.speciesId, weight: Math.max(0.1, giant.weight - 0.5), spot: "dock", giant: true });
    expect(off.status).toBe(200);
    expect((db.prepare(`SELECT COUNT(*) as n FROM giant_landed`).get() as { n: number }).n).toBe(0);
  });

  it("pays the finder of another angler's lost trophy once, on a catch that matches it", async () => {
    const { reportLost } = await import("../db.ts");
    const { LOST_FINDER_BONUS } = await import("@stillwater/shared");
    db.prepare(`UPDATE profile SET strength = 10, accuracy = 10 WHERE user_id = ?`).run(user.id);
    const at = new Date().toISOString();
    db.prepare(`INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES ('mara', 'Mara', 'mara@x.test', 0, ?, ?)`).run(at, at);
    db.prepare(`INSERT INTO profile (user_id, display_name) VALUES ('mara', 'Mara')`).run();
    const lostFrom = reportLost("mara", { speciesId: "pike", weight: 14.5, spot: "reeds", lure: null });
    await post({ requestId, speciesId: "pike", weight: 14.5, spot: "reeds", lostFrom });
    const second = "7b6c5d4e-3f2a-4b1c-8d9e-0f1a2b3c4d5e";
    await post({ requestId: second, speciesId: "pike", weight: 14.5, spot: "reeds", lostFrom });
    const bonuses = (id: string) => (db.prepare(`SELECT bonuses FROM catch WHERE request_id = ?`).get(id) as { bonuses: string }).bonuses.split(",");
    expect(bonuses(requestId)).toContain("found");
    expect(bonuses(second)).not.toContain("found");
    const pts = (id: string) => (db.prepare(`SELECT points FROM catch WHERE request_id = ?`).get(id) as { points: number }).points;
    expect(pts(requestId) - pts(second)).toBeGreaterThanOrEqual(LOST_FINDER_BONUS - 1);
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

  it("sells a handful of groundbait for its points, and refuses an angler short of them", async () => {
    db.prepare(`UPDATE profile SET points = ? WHERE user_id = ?`).run(GROUNDBAIT_PRICE + 10, user.id);
    const buy = () => app.request("http://test/groundbait", { method: "POST" });
    const first = await buy();
    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toMatchObject({ profile: { points: 10 } });
    const second = await buy();
    expect(second.status).toBe(409);
    await expect(second.json()).resolves.toEqual({ error: "not enough points" });
    expect(db.prepare(`SELECT points FROM profile WHERE user_id = ?`).get(user.id)).toEqual({ points: 10 });
  });

  it("sells a live shiner for its points, and refuses an angler short of them", async () => {
    db.prepare(`UPDATE profile SET points = ? WHERE user_id = ?`).run(SHINER_PRICE + 10, user.id);
    const buy = () => app.request("http://test/shiner", { method: "POST" });
    const first = await buy();
    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toMatchObject({ profile: { points: 10 } });
    const second = await buy();
    expect(second.status).toBe(409);
    await expect(second.json()).resolves.toEqual({ error: "not enough points" });
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
