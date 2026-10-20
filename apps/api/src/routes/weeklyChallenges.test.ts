import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Hono } from "hono";
import { fishById, rumorFor, trophyWeight, weekDays, weekFishFor, weeklyChallengesFor, type WeeklyChallenge } from "@stillwater/shared";
import type { SessionUser } from "../session.ts";

const testDir = mkdtempSync(join(tmpdir(), "stillwater-weekly-"));
process.env.STILLWATER_DB_PATH = join(testDir, "stillwater.sqlite");

const user: SessionUser = { id: "angler-1", name: "Angler", email: "angler@example.test" };
const session = vi.hoisted(() => ({ user: null as SessionUser | null }));

vi.mock("../auth.ts", () => ({
  auth: {
    handler: () => new Response(null, { status: 404 }),
    api: { getSession: async () => (session.user ? { user: session.user } : null) },
  },
  trustedOrigins: ["http://localhost:5173"],
}));

// A week whose goals include the trophy, so a single heavy fish can finish one.
const mondays = Array.from({ length: 10 }, (_, index) => new Date(Date.UTC(2026, 9, 19 + index * 7)).toISOString().slice(0, 10));
const week = mondays.find((monday) => weeklyChallengesFor(monday).some((row) => row.kind === "trophy"))!;
const trophy = weeklyChallengesFor(week).find((row) => row.kind === "trophy")! as WeeklyChallenge;
const [, tuesday, wednesday] = weekDays(week);

let app: Hono;
let db: typeof import("../db.ts").db;

beforeAll(async () => {
  app = (await import("../app.ts")).app;
  db = (await import("../db.ts")).db;
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${wednesday}T12:00:00.000Z`));
  session.user = user;
  db.exec(`DELETE FROM weekly_challenge_claim; DELETE FROM catch; DELETE FROM profile; DELETE FROM "user";`);
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 0, ?, ?)`).run(user.id, user.name, user.email, now, now);
  db.prepare(`INSERT INTO profile (user_id, display_name, points, lifetime_points) VALUES (?, ?, 10, 60)`).run(user.id, user.name);
});

afterEach(() => vi.useRealTimers());

afterAll(() => {
  db.close();
  rmSync(testDir, { recursive: true, force: true });
});

function addCatch(day: string, speciesId: string, weight: number) {
  db.prepare(`INSERT INTO catch (id, user_id, species_id, weight, points, spot, request_id, clean, day, created_at) VALUES (?, ?, ?, ?, 1, 'dropoff', ?, 1, ?, ?)`).run(
    randomUUID(), user.id, speciesId, weight, randomUUID(), day, `${day}T12:00:00.000Z`,
  );
}

const board = async (day = wednesday) => {
  const response = await app.request(`http://test/api/weekly-challenges?day=${day}`);
  return { status: response.status, body: (await response.json()) as { week: string; weekFish: string; challenges: (WeeklyChallenge & { progress: number; claimed: boolean })[] } };
};
const claim = (id: string, day = wednesday) => app.request(`http://test/api/weekly-challenges/${id}/claim?day=${day}`, { method: "POST" });
const points = () => db.prepare(`SELECT points, lifetime_points FROM profile WHERE user_id = ?`).get(user.id);

describe("weekly challenges", () => {
  it("shows the week's three goals with the week's catches counted, and only this week's", async () => {
    const pike = fishById("pike")!;
    addCatch(tuesday!, "pike", trophyWeight(pike));
    addCatch(weekDays(mondays[mondays.indexOf(week) - 1] ?? "2026-10-12")[2]!, "pike", trophyWeight(pike));
    const { status, body } = await board();
    expect(status).toBe(200);
    expect(body.week).toBe(week);
    expect(body.weekFish).toBe(weekFishFor(week).id);
    expect(body.challenges.map((row) => row.id)).toEqual(weeklyChallengesFor(week).map((row) => row.id));
    expect(body.challenges.find((row) => row.id === trophy.id)).toMatchObject({ progress: 1, claimed: false });
    // The trophy is also the hunt's third clue; the rumor is the week's own.
    expect((body as unknown as { rumor: { legendId: string; clues: boolean[] } }).rumor).toMatchObject({ ...rumorFor(week), clues: [expect.any(Boolean), expect.any(Boolean), true] });
  });

  it("pays a finished goal once and refuses an unfinished one", async () => {
    const unfinished = weeklyChallengesFor(week).find((row) => row.kind !== "trophy")!;
    expect((await claim(unfinished.id)).status).toBe(409);
    addCatch(tuesday!, "pike", trophyWeight(fishById("pike")!));
    const first = await claim(trophy.id);
    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toEqual({ reward: trophy.reward });
    expect(points()).toEqual({ points: 10 + trophy.reward, lifetime_points: 60 + trophy.reward });
    expect((await claim(trophy.id)).status).toBe(409);
    expect(points()).toEqual({ points: 10 + trophy.reward, lifetime_points: 60 + trophy.reward });
    expect((await board()).body.challenges.find((row) => row.id === trophy.id)?.claimed).toBe(true);
  });

  it("refuses a day far from the server's, and a signed-out angler", async () => {
    expect((await board("2020-01-01")).status).toBe(400);
    session.user = null;
    expect((await app.request(`http://test/api/weekly-challenges?day=${wednesday}`)).status).toBe(401);
  });
});
