import { Hono } from "hono";
import { anglerLevel, huntClues, rumorFor, weekDays, weekFishFor, weeklyChallengesFor, weeklyProgress, weekOf } from "@stillwater/shared";
import { claimWeeklyChallenge, getProfile, listCatchesOnDays, listWeeklyClaims } from "../db.ts";
import type { SessionUser } from "../session.ts";

export const weeklyChallengeRoutes = new Hono();

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

/** The angler's local week from their local day, which must be within a day of the server's. */
function localWeek(day: string | undefined): string | null {
  if (!day || !dayPattern.test(day)) return null;
  const at = Date.parse(`${day}T00:00:00.000Z`);
  if (Number.isNaN(at) || new Date(at).toISOString().slice(0, 10) !== day) return null;
  const today = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  if (Math.abs(at - today) > 86_400_000) return null;
  return weekOf(day);
}

/** The week's catches, saved from the day before its Monday on (a day's grace covers zones ahead of UTC). */
function weekCatches(userId: string, week: string) {
  const savedFrom = new Date(Date.parse(`${week}T00:00:00.000Z`) - 86_400_000).toISOString();
  return listCatchesOnDays(userId, weekDays(week), savedFrom);
}

function weekBoard(userId: string, week: string, lifetimePoints: number, rows = weekCatches(userId, week)) {
  const catches = rows.map((row) => ({ speciesId: row.species_id, spot: row.spot, weight: row.weight, clean: row.clean === 1 }));
  const claimed = new Set(listWeeklyClaims(userId, week));
  return weeklyChallengesFor(week, anglerLevel(lifetimePoints)).map((challenge) => ({ ...challenge, progress: weeklyProgress(challenge, catches, week), claimed: claimed.has(challenge.id) }));
}

weeklyChallengeRoutes.get("/weekly-challenges", (c) => {
  const user = c.get("user") as SessionUser;
  const week = localWeek(c.req.query("day"));
  if (!week) return c.json({ error: "invalid day" }, 400);
  const profile = getProfile(user.id);
  if (!profile) return c.json({ error: "profile missing" }, 404);
  const rows = weekCatches(user.id, week);
  const rumor = rumorFor(week);
  const clues = huntClues(rumor, rows.map((row) => ({ speciesId: row.species_id, spot: row.spot, hour: row.hour, weight: row.weight })));
  return c.json({ week, weekFish: weekFishFor(week).id, challenges: weekBoard(user.id, week, profile.lifetime_points, rows), rumor: { ...rumor, clues } });
});

weeklyChallengeRoutes.post("/weekly-challenges/:id/claim", (c) => {
  const user = c.get("user") as SessionUser;
  const week = localWeek(c.req.query("day"));
  if (!week) return c.json({ error: "invalid day" }, 400);
  const profile = getProfile(user.id);
  if (!profile) return c.json({ error: "profile missing" }, 404);
  const challenge = weekBoard(user.id, week, profile.lifetime_points).find((row) => row.id === c.req.param("id"));
  if (!challenge) return c.json({ error: "unknown weekly challenge" }, 404);
  if (challenge.progress < challenge.goal) return c.json({ error: "challenge incomplete" }, 409);
  if (!claimWeeklyChallenge(user.id, week, challenge.id, challenge.reward)) return c.json({ error: "challenge already claimed" }, 409);
  return c.json({ reward: challenge.reward });
});
