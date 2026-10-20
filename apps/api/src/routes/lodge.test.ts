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
  db.exec(`DELETE FROM lost_fish; DELETE FROM giant_landed; DELETE FROM catch; DELETE FROM profile; DELETE FROM "user";`);
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

describe("GET /lodge/released", () => {
  it("lists other anglers' let-go fish from earlier days that nobody has landed again, leaving out small common ones", async () => {
    const letGo = (id: string, userId: string, speciesId: string, daysAgo: number) =>
      db.prepare(`INSERT INTO catch (id, user_id, species_id, weight, points, spot, request_id, clean, released, created_at) VALUES (?, ?, ?, 2, 1, 'dock', ?, 0, 1, ?)`).run(id, userId, speciesId, `r-${id}`, new Date(Date.now() - daysAgo * 86_400_000).toISOString());
    letGo("bass", "mara", "smallmouth-bass", 2);
    letGo("carp", "mara", "carp", 1);
    letGo("perch", "mara", "perch", 2);
    letGo("mine", "ash", "carp", 2);
    letGo("stale", "mara", "carp", 40);
    letGo("taken", "mara", "carp", 3);
    db.prepare(`INSERT INTO catch (id, user_id, species_id, weight, points, spot, request_id, clean, tagged_from, created_at) VALUES ('again', 'ash', 'carp', 2.1, 1, 'dock', 'r-again', 0, 'taken', ?)`).run(new Date().toISOString());
    const response = await app.request("http://test/lodge/released");
    const { released } = (await response.json()) as { released: { catchId: string; by: string }[] };
    expect(released.map((row) => row.catchId)).toEqual(["carp", "bass"]);
    expect(released[0]!.by).toBe("Mara");
  });
});

describe("listTagReturns", () => {
  it("tells the angler who let a fish go which of them other anglers landed again lately, newest first", async () => {
    const { listTagReturns } = await import("../db.ts");
    const at = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();
    const row = (id: string, userId: string, weight: number, created: string, released: 0 | 1, taggedFrom: string | null) =>
      db.prepare(`INSERT INTO catch (id, user_id, species_id, weight, points, spot, request_id, clean, released, tagged_from, created_at) VALUES (?, ?, 'carp', ?, 1, 'dock', ?, 0, ?, ?, ?)`).run(id, userId, weight, `r-${id}`, released, taggedFrom, created);
    row("let1", "ash", 6, at(10), 1, null);
    row("let2", "ash", 5, at(4), 1, null);
    row("old", "mara", 6.5, at(9), 0, "let1");
    row("new", "mara", 5.2, at(1), 0, "let2");
    expect(listTagReturns("ash", at(7), 5)).toEqual([{ catchId: "new", speciesId: "carp", weight: 5.2, was: 5, by: "Mara", at: expect.any(String) }]);
    expect(listTagReturns("mara", at(30), 5)).toEqual([]);
  });
});

describe("listSlamDays", () => {
  it("lists each day's slam kinds the angler landed, once each, leaving out other kinds and catches without a day", async () => {
    const { listSlamDays } = await import("../db.ts");
    const row = (id: string, speciesId: string, day: string | null) =>
      db.prepare(`INSERT INTO catch (id, user_id, species_id, weight, points, spot, request_id, clean, day, created_at) VALUES (?, 'ash', ?, 2, 1, 'dock', ?, 0, ?, ?)`).run(id, speciesId, `r-${id}`, day, new Date().toISOString());
    row("a", "smallmouth-bass", "2026-10-20");
    row("b", "smallmouth-bass", "2026-10-20");
    row("c", "largemouth-bass", "2026-10-20");
    row("d", "perch", "2026-10-20");
    row("e", "salmon", null);
    const rows = listSlamDays("ash").sort((x, y) => x.speciesId.localeCompare(y.speciesId));
    expect(rows).toEqual([{ day: "2026-10-20", speciesId: "largemouth-bass" }, { day: "2026-10-20", speciesId: "smallmouth-bass" }]);
  });
});

describe("GET /lodge/bank-week", () => {
  it("counts the angler's own kept fish at each bank over the last week, not ones let go", async () => {
    const at = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();
    const row = (id: string, userId: string, spot: string, daysAgo: number) =>
      db.prepare(`INSERT INTO catch (id, user_id, species_id, weight, points, spot, request_id, clean, created_at) VALUES (?, ?, 'perch', 1, 1, ?, ?, 0, ?)`).run(id, userId, spot, `r-${id}`, at(daysAgo));
    row("a", "ash", "dock", 1);
    row("b", "ash", "dock", 6);
    row("c", "ash", "reeds", 2);
    row("d", "ash", "dock", 8);
    row("e", "mara", "dock", 1);
    db.prepare(`INSERT INTO catch (id, user_id, species_id, weight, points, spot, request_id, clean, released, created_at) VALUES ('f', 'ash', 'perch', 1, 1, 'dock', 'r-f', 0, 1, ?)`).run(at(1));
    const response = await app.request("http://test/lodge/bank-week");
    expect(await response.json()).toEqual({ counts: { dock: 2, reeds: 1 } });
  });
});

describe("GET /lodge/giants", () => {
  it("lists the week's giants and names who landed one", async () => {
    const { claimGiant } = await import("../db.ts");
    const { giantWeek, GIANT_BANKS } = await import("@stillwater/shared");
    claimGiant(giantWeek(), "reeds", "mara");
    const { giants } = (await (await app.request("http://test/lodge/giants")).json()) as { giants: { spot: string; landedBy: string | null }[] };
    expect(giants.map((giant) => giant.spot)).toEqual(GIANT_BANKS);
    expect(giants.find((giant) => giant.spot === "reeds")?.landedBy).toBe("Mara");
    expect(giants.find((giant) => giant.spot === "dock")?.landedBy).toBeNull();
  });

  it("shows a giant let go back as out again, for half, until another angler lands it", async () => {
    const { claimGiant, releaseGiant, claimAndPayGiant } = await import("../db.ts");
    const { giantWeek, GIANT_AGAIN_BONUS } = await import("@stillwater/shared");
    claimGiant(giantWeek(), "reeds", "ash");
    releaseGiant(giantWeek(), "reeds", "ash");
    const reeds = async () => ((await (await app.request("http://test/lodge/giants")).json()) as { giants: { spot: string; landedBy: string | null; letGoBy: string | null; letGoByYou: boolean; bonus: number }[] }).giants.find((giant) => giant.spot === "reeds")!;
    // Out again for the lodge, though not for Ash, who let it go.
    expect(await reeds()).toMatchObject({ landedBy: null, letGoBy: "Ash", letGoByYou: true, bonus: GIANT_AGAIN_BONUS });
    claimAndPayGiant(giantWeek(), "reeds", "mara", "none");
    expect(await reeds()).toMatchObject({ landedBy: "Mara", letGoBy: "Ash", bonus: 0 });
  });
});

describe("the lodge's lost trophies", () => {
  const pike = { speciesId: "pike", weight: 14.5, spot: "reeds" };
  const report = (body: object) => app.request("http://test/lodge/lost", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

  it("files only a trophy at a bank its kind lives at, and keeps an angler to a few a week, landed since or not", async () => {
    expect((await report({ ...pike, weight: 2 })).status).toBe(400);
    expect((await report({ ...pike, spot: "inlet" })).status).toBe(400);
    expect((await report({ ...pike, speciesId: "golden-shiner", weight: 0.5 })).status).toBe(400);
    expect((await report({ ...pike, id: "not-a-uuid" })).status).toBe(400);
    // The client's id files it once, however often it is sent.
    const id = "c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f";
    for (let i = 0; i < 3; i++) expect(await (await report({ ...pike, id })).json()).toEqual({ id });
    expect((db.prepare(`SELECT COUNT(*) as n FROM lost_fish`).get() as { n: number }).n).toBe(1);
    for (let i = 0; i < 2; i++) expect((await report(pike)).status).toBe(200);
    db.exec(`DELETE FROM lost_fish WHERE id != '${id}'`);
    // Another angler's report id is not this one's to file under.
    db.prepare(`UPDATE lost_fish SET user_id = 'mara' WHERE id = ?`).run(id);
    expect((await report({ ...pike, id: id.toUpperCase() })).status).toBe(409);
    db.prepare(`UPDATE lost_fish SET user_id = 'ash' WHERE id = ?`).run(id);
    db.exec(`DELETE FROM lost_fish WHERE id != '${id}'`);
    for (let i = 0; i < 2; i++) expect((await report(pike)).status).toBe(200);
    db.exec(`UPDATE lost_fish SET found_by = 'mara'`);
    expect((await report(pike)).status).toBe(429);
  });

  it("lists other anglers' lost trophies, and tells the angler which of their own someone landed", async () => {
    const { reportLost, claimAndPayLost } = await import("../db.ts");
    const { lostSince } = await import("@stillwater/shared");
    const maras = reportLost("mara", pike)!;
    reportLost("ash", { ...pike, weight: 14.8 });
    const read = async () => (await (await app.request("http://test/lodge/lost")).json()) as { lost: { id: string; by: string }[]; mineFound: { weight: number }[] };
    expect((await read()).lost.map((row) => [row.id, row.by])).toEqual([[maras, "Mara"]]);
    landed("c1", "ash", "pike", "reeds", 1);
    expect(claimAndPayLost(maras, { ...pike, weight: 14 }, lostSince(), "ash", "c1", 30)).toBe(false);
    expect(claimAndPayLost(maras, pike, lostSince(), "ash", "c1", 30)).toBe(true);
    expect(claimAndPayLost(maras, pike, lostSince(), "ash", "c1", 30)).toBe(false);
    expect((await read()).lost).toEqual([]);
    // Landing one's own lost trophy pays nothing, and closes it for everyone.
    const ashLost = db.prepare(`SELECT id FROM lost_fish WHERE user_id = 'ash'`).get() as { id: string };
    expect(claimAndPayLost(ashLost.id, { ...pike, weight: 14.8 }, lostSince(), "ash", "c1", 30)).toBe(false);
    expect((db.prepare(`SELECT found_by FROM lost_fish WHERE id = ?`).get(ashLost.id) as { found_by: string }).found_by).toBe("ash");
    db.prepare(`UPDATE lost_fish SET found_by = 'mara' WHERE id = ?`).run(ashLost.id);
    expect((await read()).mineFound.map((row) => row.weight)).toEqual([14.8]);
  });
});
