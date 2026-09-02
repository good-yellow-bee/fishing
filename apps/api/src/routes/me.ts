import { Hono } from "hono";
import { anglerLevel, canUseSpot } from "@stillwater/shared";
import { getProfile, listCatches, listSpeciesStats, toCatch, toProfile } from "../db.ts";
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
  return c.json({
    user: { id: user.id, email: user.email, name: user.name },
    profile,
    level,
    spots: {
      dock: canUseSpot("dock", level),
      reeds: canUseSpot("reeds", level),
      dropoff: canUseSpot("dropoff", level),
    },
    catches,
    speciesStats,
  });
});
