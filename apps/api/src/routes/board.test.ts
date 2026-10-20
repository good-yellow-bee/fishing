import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { derbyOn, pastDerbies, weekStart, type BoardView, type SpeciesRecord } from "@stillwater/shared";

const testDir = mkdtempSync(join(tmpdir(), "stillwater-board-"));
process.env.STILLWATER_DB_PATH = join(testDir, "stillwater.sqlite");

let app: Hono;
let db: typeof import("../db.ts").db;

const viewer = { id: "ash", name: "Ash", email: "ash@example.test" };

beforeAll(async () => {
  const routes = await import("./board.ts");
  db = (await import("../db.ts")).db;
  app = new Hono();
  app.use("*", async (c, next) => {
    c.set("user", viewer);
    await next();
  });
  app.route("/", routes.boardRoutes);
});

afterAll(() => {
  db.close();
  rmSync(testDir, { recursive: true, force: true });
});

const now = Date.now();
const thisWeek = new Date(Math.max(weekStart().getTime(), now - 60_000)).toISOString();
const lastWeek = new Date(weekStart().getTime() - 86_400_000).toISOString();

function angler(id: string, name: string, lifetime: number) {
  const at = new Date().toISOString();
  db.prepare(`INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 0, ?, ?)`).run(id, name, `${id}@x.test`, at, at);
  db.prepare(`INSERT INTO profile (user_id, display_name, points, lifetime_points) VALUES (?, ?, ?, ?)`).run(id, name, lifetime, lifetime);
}

let n = 0;
function landed(userId: string, speciesId: string, weight: number, points: number, at: string) {
  n += 1;
  db.prepare(
    `INSERT INTO catch (id, user_id, species_id, weight, points, spot, request_id, clean, created_at) VALUES (?, ?, ?, ?, ?, 'dock', ?, 0, ?)`,
  ).run(`c${n}`, userId, speciesId, weight, points, `r${n}`, at);
}

beforeEach(() => {
  db.exec(`DELETE FROM catch; DELETE FROM profile; DELETE FROM "user";`);
  angler("ash", "Ash", 40);
  angler("mara", "Mara", 900);
  angler("idle", "Idle", 300);
  landed("mara", "pike", 12.3, 500, lastWeek);
  landed("mara", "perch", 0.5, 4, thisWeek);
  landed("ash", "pike", 6, 30, thisWeek);
  landed("ash", "perch", 0.5, 10, thisWeek);
});

async function get<T>(path: string) {
  const response = await app.request(`http://test${path}`);
  expect(response.status).toBe(200);
  return (await response.json()) as T;
}

describe("GET /board", () => {
  it("ranks all time on lifetime points", async () => {
    const board = await get<BoardView>("/board");
    expect(board.period).toBe("all");
    expect(board.entries.map((row) => row.userId)).toEqual(["mara", "idle", "ash"]);
  });

  it("ranks the week on points landed since Monday, leaving out anglers with no catch this week", async () => {
    const board = await get<BoardView>("/board?period=week");
    expect(board.period).toBe("week");
    expect(board.entries.map((row) => [row.userId, row.score, row.catches])).toEqual([
      ["ash", 40, 2],
      ["mara", 4, 1],
    ]);
    expect(board.entries[1]?.heaviest).toBe(0.5);
    expect(board.you?.rank).toBe(1);
  });

  it("falls back to all time for an unknown period", async () => {
    expect((await get<BoardView>("/board?period=year")).period).toBe("all");
  });
});

describe("GET /board/records", () => {
  it("holds the heaviest of each species with its holder, the earlier catch keeping a tie", async () => {
    const { records } = await get<{ records: SpeciesRecord[] }>("/board/records");
    const bySpecies = Object.fromEntries(records.map((row) => [row.speciesId, row]));
    expect(bySpecies.pike).toMatchObject({ weight: 12.3, userId: "mara", holder: "Mara" });
    expect(bySpecies.perch).toMatchObject({ weight: 0.5, userId: "mara" });
    expect(records).toHaveLength(2);
  });
});

describe("GET /board/bag", () => {
  afterEach(() => vi.useRealTimers());

  it("ranks today's bags (UTC) by their five heaviest fish, and puts the angler in it", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(Date.UTC(2026, 10, 7, 15)) });
    for (const weight of [1, 1, 1, 1, 1, 0.2]) landed("mara", "perch", weight, 1, "2026-11-07T09:00:00.000Z");
    landed("ash", "pike", 4, 1, "2026-11-07T10:00:00.000Z");
    landed("ash", "perch", 0.5, 1, "2026-11-07T11:00:00.000Z");
    // Yesterday's and tomorrow's fish make no bag today.
    landed("idle", "pike", 9, 1, "2026-11-06T23:59:00.000Z");
    landed("idle", "pike", 9, 1, "2026-11-08T00:00:00.000Z");
    const body = await get<{ day: string; entries: { userId: string; total: number; count: number }[]; you: { rank: number; total: number; count: number } | null }>("/board/bag");
    expect(body.day).toBe("2026-11-07T00:00:00.000Z");
    expect(body.entries.map((row) => [row.userId, row.total, row.count])).toEqual([["mara", 5, 5], ["ash", 4.5, 2]]);
    expect(body.you).toEqual({ rank: 2, total: 4.5, count: 2 });
  });

  it("lists the angler's own bag weights, heaviest first", async () => {
    landed("ash", "pike", 4, 1, "2026-11-07T10:00:00.000Z");
    for (const weight of [0.1, 0.2, 0.3, 0.4, 0.5]) landed("ash", "perch", weight, 1, "2026-11-07T11:00:00.000Z");
    const { listBagWeights } = await import("../db.ts");
    expect(listBagWeights("ash", "2026-11-07T00:00:00.000Z", "2026-11-08T00:00:00.000Z")).toEqual([4, 0.5, 0.4, 0.3, 0.2]);
  });
});

describe("GET /board/stewards", () => {
  it("ranks this week's anglers by the fish they let go, and puts the angler in it", async () => {
    const { releaseCatch } = await import("../db.ts");
    const letGo = (userId: string, at: string) => {
      landed(userId, "perch", 1, 1, at);
      db.prepare(`UPDATE catch SET released = 1, released_at = ? WHERE id = ?`).run(at, `c${n}`);
    };
    letGo("mara", thisWeek);
    letGo("mara", thisWeek);
    letGo("ash", thisWeek);
    letGo("idle", lastWeek);
    // Landed last week, let go now: it counts this week.
    landed("idle", "perch", 1, 1, lastWeek);
    releaseCatch("idle", `r${n}`);
    const body = await get<{ entries: { userId: string; count: number }[]; you: { rank: number; count: number } | null }>("/board/stewards");
    expect(body.entries.map((row) => [row.userId, row.count])).toEqual([["mara", 2], ["ash", 1], ["idle", 1]]);
    expect(body.you).toEqual({ rank: 2, count: 1 });
  });
});

describe("GET /board/derby", () => {
  const saturday = new Date(Date.UTC(2026, 10, 7, 15));
  afterEach(() => vi.useRealTimers());

  it("ranks the heaviest of the weekend's derby fish, puts the angler in it, and names last weekend's champion", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: saturday });
    const derby = derbyOn(saturday)!;
    const last = pastDerbies(new Date(saturday.getTime() - 8 * 86_400_000), saturday)[0]!;
    landed("mara", derby.fishId, 3, 1, "2026-11-07T12:00:00.000Z");
    landed("ash", derby.fishId, 3, 1, "2026-11-07T10:00:00.000Z");
    landed("ash", derby.fishId, 1, 1, "2026-11-07T11:00:00.000Z");
    landed("idle", derby.fishId, 9, 1, "2026-11-06T10:00:00.000Z");
    landed("mara", last.fishId, 4, 1, "2026-11-01T10:00:00.000Z");
    // A tie at 3 lb: Ash's came first, though Mara's first derby fish of any size came earlier still.
    landed("mara", derby.fishId, 0.5, 1, "2026-11-07T08:00:00.000Z");
    const body = await get<{ derby: { fishId: string }; running: boolean; entries: { userId: string; weight: number }[]; you: { rank: number; weight: number } | null; lastChampion: { displayName: string } | null }>("/board/derby");
    expect(body.running).toBe(true);
    expect(body.derby.fishId).toBe(derby.fishId);
    expect(body.entries.map((row) => [row.userId, row.weight])).toEqual([["ash", 3], ["mara", 3]]);
    expect(body.you).toEqual({ rank: 1, weight: 3 });
    expect(body.lastChampion?.displayName).toBe("Mara");
  });

  it("counts the derbies an angler held the top spot of when they ended", async () => {
    const last = pastDerbies(new Date(saturday.getTime() - 8 * 86_400_000), saturday)[0]!;
    landed("mara", last.fishId, 4, 1, "2026-11-01T10:00:00.000Z");
    landed("ash", last.fishId, 3, 1, "2026-11-01T09:00:00.000Z");
    const { countDerbyWins } = await import("../db.ts");
    expect(countDerbyWins("mara", [last])).toBe(1);
    expect(countDerbyWins("ash", [last])).toBe(0);
  });
});
