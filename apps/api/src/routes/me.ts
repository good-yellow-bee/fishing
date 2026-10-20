import { Hono } from "hono";
import { anglerLevel, bagDay, badgeProgress, canUseSpot, pastDerbies, streakDays } from "@stillwater/shared";
import { countDerbyWins, firstCatchAt, getProfile, listBadgeFacts, listBagWeights, listCatchDays, listCatches, listSpeciesStats, toCatch, toProfile } from "../db.ts";
import type { SessionUser } from "../session.ts";

export const meRoutes = new Hono();

/** Weekend derbies the angler held the top spot of when they ended, from their first catch on. */
function derbyWins(userId: string): number {
  const first = firstCatchAt(userId);
  return first ? countDerbyWins(userId, pastDerbies(new Date(first))) : 0;
}

meRoutes.get("/me", (c) => {
  const user = c.get("user") as SessionUser;
  const row = getProfile(user.id);
  if (!row) return c.json({ error: "profile missing" }, 404);
  const profile = toProfile(row);
  const catches = listCatches(user.id).map(toCatch);
  const speciesStats = listSpeciesStats(user.id);
  const level = anglerLevel(profile.lifetimePoints);
  const days = listCatchDays(user.id);
  // The longest run doesn't depend on today; the page reads the current one from `recentDays` on its own calendar.
  const { longest } = streakDays(days, "0000-01-01");
  const today = bagDay();
  return c.json({
    user: { id: user.id, email: user.email, name: user.name },
    profile,
    level,
    spots: {
      dock: canUseSpot("dock", level),
      reeds: canUseSpot("reeds", level),
      dropoff: canUseSpot("dropoff", level),
      point: canUseSpot("point", level),
      inlet: canUseSpot("inlet", level),
      open: canUseSpot("open", level),
    },
    catches,
    speciesStats,
    badges: badgeProgress(listBadgeFacts(user.id), { longestStreak: longest, derbyWins: derbyWins(user.id) }),
    longestStreak: longest,
    recentDays: days.slice(-60),
    todayBag: listBagWeights(user.id, today.from, today.to),
  });
});
