import { Hono } from "hono";
import { anglerLevel, badgeProgress, canUseSpot, streakDays } from "@stillwater/shared";
import { getProfile, listBadgeFacts, listCatchDays, listCatches, listSpeciesStats, toCatch, toProfile } from "../db.ts";
import type { SessionUser } from "../session.ts";

export const meRoutes = new Hono();

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
    badges: badgeProgress(listBadgeFacts(user.id), { longestStreak: longest }),
    longestStreak: longest,
    recentDays: days.slice(-60),
  });
});
