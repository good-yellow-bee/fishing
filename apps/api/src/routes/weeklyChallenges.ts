import { Hono } from "hono";
import { weekDays, weekFishFor, weeklyChallengesFor, weeklyProgress, weekOf } from "@stillwater/shared";
import { claimWeeklyChallenge, listCatchesOnDays, listWeeklyClaims } from "../db.ts";
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

function weekBoard(userId: string, week: string) {
  const catches = listCatchesOnDays(userId, weekDays(week)).map((row) => ({ speciesId: row.species_id, spot: row.spot, weight: row.weight, clean: row.clean === 1 }));
  const claimed = new Set(listWeeklyClaims(userId, week));
  return weeklyChallengesFor(week).map((challenge) => ({ ...challenge, progress: weeklyProgress(challenge, catches, week), claimed: claimed.has(challenge.id) }));
}

weeklyChallengeRoutes.get("/weekly-challenges", (c) => {
  const user = c.get("user") as SessionUser;
  const week = localWeek(c.req.query("day"));
  if (!week) return c.json({ error: "invalid day" }, 400);
  return c.json({ week, weekFish: weekFishFor(week).id, challenges: weekBoard(user.id, week) });
});

weeklyChallengeRoutes.post("/weekly-challenges/:id/claim", (c) => {
  const user = c.get("user") as SessionUser;
  const week = localWeek(c.req.query("day"));
  if (!week) return c.json({ error: "invalid day" }, 400);
  const challenge = weekBoard(user.id, week).find((row) => row.id === c.req.param("id"));
  if (!challenge) return c.json({ error: "unknown weekly challenge" }, 404);
  if (challenge.progress < challenge.goal) return c.json({ error: "challenge incomplete" }, 409);
  if (!claimWeeklyChallenge(user.id, week, challenge.id, challenge.reward)) return c.json({ error: "challenge already claimed" }, 409);
  return c.json({ reward: challenge.reward });
});
