import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Hono } from "hono";
import { dailyRequestsForDay, type DailyRequest } from "@stillwater/shared";
import type { SessionUser } from "../session.ts";

const testDir = mkdtempSync(join(tmpdir(), "stillwater-daily-"));
process.env.STILLWATER_DB_PATH = join(testDir, "stillwater.sqlite");

const user: SessionUser = { id: "angler-1", name: "Angler", email: "angler@example.test" };
const session = vi.hoisted(() => ({ user: null as SessionUser | null }));

vi.mock("../auth.ts", () => ({
  auth: {
    handler: () => new Response(null, { status: 404 }),
    api: { getSession: async () => (session.user ? { user: session.user } : null) },
  },
}));

const days = Array.from({ length: 60 }, (_, index) => new Date(Date.UTC(2026, 9, 8 + index)).toISOString().slice(0, 10));
const isBankRequest = (request: DailyRequest) => request.spot !== undefined && request.minWeight === undefined && request.count >= 3;
// The first day with a bank request for three fish and a weight request, so the tests never depend on one board.
const day = days.find((candidate) => {
  const requests = dailyRequestsForDay(candidate);
  return requests.some(isBankRequest) && requests.some((request) => request.minWeight !== undefined);
})!;
const board = dailyRequestsForDay(day);
const bankRequest = board.find(isBankRequest)!;
const weightRequest = board.find((request) => request.minWeight !== undefined)!;
// UTC-5: the local day runs from 05:00Z to 05:00Z the next morning.
const offset = 300;
const localStart = Date.parse(`${day}T05:00:00.000Z`);
const at = (ms: number) => new Date(ms).toISOString();

let app: Hono;
let db: typeof import("../db.ts").db;

beforeAll(async () => {
  app = (await import("../app.ts")).app;
  const database = await import("../db.ts");
  db = database.db;
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${day}T12:00:00.000Z`));
  session.user = user;
  db.exec(`DELETE FROM daily_request_claim; DELETE FROM catch; DELETE FROM profile; DELETE FROM "user";`);
  db.prepare(
    `INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 0, ?, ?)`,
  ).run(user.id, user.name, user.email, at(Date.now()), at(Date.now()));
  db.prepare(`INSERT INTO profile (user_id, display_name, points, lifetime_points) VALUES (?, ?, 10, 60)`).run(user.id, user.name);
});

afterEach(() => vi.useRealTimers());

afterAll(() => {
  db.close();
  rmSync(testDir, { recursive: true, force: true });
});

function addCatch(createdAt: string, speciesId: string, spot: string, weight: number) {
  db.prepare(
    `INSERT INTO catch (id, user_id, species_id, weight, points, spot, request_id, clean, created_at)
     VALUES (?, ?, ?, ?, 1, ?, ?, 0, ?)`,
  ).run(randomUUID(), user.id, speciesId, weight, spot, randomUUID(), createdAt);
}

function complete(request: DailyRequest, createdAt = at(localStart + 3_600_000)) {
  for (let index = 0; index < request.count; index++) {
    addCatch(createdAt, request.speciesId, request.spot ?? "dock", (request.minWeight ?? 0) + 0.5);
  }
}

const query = (dayParam = day, offsetParam: number | string = offset) => `day=${dayParam}&offset=${offsetParam}`;

async function getBoard(search = query()) {
  const response = await app.request(`http://test/api/daily-requests?${search}`);
  return { status: response.status, body: (await response.json()) as { day: string; requests: (DailyRequest & { progress: number; claimed: boolean })[] } };
}

function claim(id: string, search = query()) {
  return app.request(`http://test/api/daily-requests/${id}/claim?${search}`, { method: "POST" });
}

function profile() {
  return db.prepare(`SELECT points, lifetime_points FROM profile WHERE user_id = ?`).get(user.id);
}

describe("daily requests auth", () => {
  it("lets a signed-in angler claim and turns everyone else away", async () => {
    complete(bankRequest);
    expect((await claim(bankRequest.id)).status).toBe(200);

    session.user = null;
    expect((await app.request(`http://test/api/daily-requests?${query()}`)).status).toBe(401);
    expect((await claim(bankRequest.id)).status).toBe(401);
  });
});

describe("GET /api/daily-requests", () => {
  it("counts only that local day's catches of the species at the bank", async () => {
    const { speciesId, spot } = bankRequest;
    addCatch(at(localStart), speciesId, spot!, 0.5);
    addCatch(at(localStart + 86_400_000 - 1), speciesId, spot!, 0.5);
    // Same UTC date as the angler's day, but before their midnight; then their next day.
    addCatch(at(localStart - 1), speciesId, spot!, 0.5);
    addCatch(at(localStart - 7_200_000), speciesId, spot!, 0.5);
    addCatch(at(localStart + 86_400_000), speciesId, spot!, 0.5);
    addCatch(at(localStart + 60_000), speciesId, spot === "reeds" ? "dock" : "reeds", 0.5);
    addCatch(at(localStart + 60_000), speciesId === "bluegill" ? "perch" : "bluegill", spot!, 0.5);

    const { status, body } = await getBoard();

    expect(status).toBe(200);
    expect(body.day).toBe(day);
    expect(body.requests.map((request) => request.id)).toEqual(board.map((request) => request.id));
    expect(body.requests.find((request) => request.id === bankRequest.id)).toMatchObject({ progress: 2, claimed: false });
  });

  it("counts a weight request only over the threshold and caps progress at the count", async () => {
    const { speciesId, minWeight } = weightRequest;
    addCatch(at(localStart + 60_000), speciesId, "dock", minWeight!);
    expect((await getBoard()).body.requests.find((request) => request.id === weightRequest.id)?.progress).toBe(0);

    for (let index = 0; index <= weightRequest.count; index++) addCatch(at(localStart + 60_000), speciesId, "dock", minWeight! + 0.1);
    expect((await getBoard()).body.requests.find((request) => request.id === weightRequest.id)?.progress).toBe(weightRequest.count);
  });

  it("marks claimed requests", async () => {
    complete(weightRequest);
    await claim(weightRequest.id);

    const { body } = await getBoard();
    expect(body.requests.map((request) => request.claimed)).toEqual(board.map((request) => request.id === weightRequest.id));
  });

  it("rejects a malformed day, a day far from the server's, and an impossible offset", async () => {
    const twoDaysOn = new Date(Date.parse(`${day}T00:00:00.000Z`) + 2 * 86_400_000).toISOString().slice(0, 10);
    const tomorrow = new Date(Date.parse(`${day}T00:00:00.000Z`) + 86_400_000).toISOString().slice(0, 10);
    for (const search of [query("2026-13-01"), query(day.replaceAll("-", "/")), query(twoDaysOn), query(day, 900), query(day, "1.5"), `day=${day}`]) {
      expect((await getBoard(search)).status).toBe(400);
    }
    expect((await getBoard(query(tomorrow, -600))).status).toBe(200);
  });
});

describe("POST /api/daily-requests/:id/claim", () => {
  it("pays the reward into points and lifetime points once", async () => {
    complete(bankRequest);

    const first = await claim(bankRequest.id);
    const second = await claim(bankRequest.id);

    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toEqual({ reward: bankRequest.reward });
    expect(profile()).toEqual({ points: 10 + bankRequest.reward, lifetime_points: 60 + bankRequest.reward });
    expect(second.status).toBe(409);
    await expect(second.json()).resolves.toEqual({ error: "request already claimed" });
    expect(profile()).toEqual({ points: 10 + bankRequest.reward, lifetime_points: 60 + bankRequest.reward });
  });

  it("refuses an incomplete request", async () => {
    complete(bankRequest, at(localStart - 1));

    const response = await claim(bankRequest.id);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "request incomplete" });
    expect(profile()).toEqual({ points: 10, lifetime_points: 60 });
  });

  it("returns 404 for a request not on that day's board", async () => {
    const offBoard = days.flatMap(dailyRequestsForDay).find((request) => !board.some((row) => row.id === request.id))!;
    const response = await claim(offBoard.id);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "unknown daily request" });
  });
});
