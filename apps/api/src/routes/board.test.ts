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

describe("GET /board/derby", () => {
  const saturday = new Date(Date.UTC(2026, 9, 24, 15));
  afterEach(() => vi.useRealTimers());

  it("ranks the heaviest of the weekend's derby fish, puts the angler in it, and names last weekend's champion", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: saturday });
    const derby = derbyOn(saturday)!;
    const last = pastDerbies(new Date(saturday.getTime() - 8 * 86_400_000), saturday)[0]!;
    landed("mara", derby.fishId, 2, 1, "2026-10-24T09:00:00.000Z");
    landed("ash", derby.fishId, 3, 1, "2026-10-24T10:00:00.000Z");
    landed("ash", derby.fishId, 1, 1, "2026-10-24T11:00:00.000Z");
    landed("idle", derby.fishId, 9, 1, "2026-10-23T10:00:00.000Z");
    landed("mara", last.fishId, 4, 1, "2026-10-18T10:00:00.000Z");
    const body = await get<{ derby: { fishId: string }; running: boolean; entries: { userId: string; weight: number }[]; you: { rank: number; weight: number } | null; lastChampion: { displayName: string } | null }>("/board/derby");
    expect(body.running).toBe(true);
    expect(body.derby.fishId).toBe(derby.fishId);
    expect(body.entries.map((row) => [row.userId, row.weight])).toEqual([["ash", 3], ["mara", 2]]);
    expect(body.you).toEqual({ rank: 1, weight: 3 });
    expect(body.lastChampion?.displayName).toBe("Mara");
  });

  it("counts the derbies an angler held the top spot of when they ended", async () => {
    const last = pastDerbies(new Date(saturday.getTime() - 8 * 86_400_000), saturday)[0]!;
    landed("mara", last.fishId, 4, 1, "2026-10-18T10:00:00.000Z");
    landed("ash", last.fishId, 3, 1, "2026-10-18T09:00:00.000Z");
    const { countDerbyWins } = await import("../db.ts");
    expect(countDerbyWins("mara", [last])).toBe(1);
    expect(countDerbyWins("ash", [last])).toBe(0);
  });
});
