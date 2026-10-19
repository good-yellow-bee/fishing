import { Hono } from "hono";
import { validateGroundbaitBuy, validateUpgrade, type SkillId } from "@stillwater/shared";
import { applyUpgrade, getProfile, spendPoints, toProfile } from "../db.ts";
import type { SessionUser } from "../session.ts";

const skills: SkillId[] = ["strength", "accuracy", "patience"];

export const upgradeRoutes = new Hono();

upgradeRoutes.post("/upgrades", async (c) => {
  const user = c.get("user") as SessionUser;
  let body: { skill?: SkillId };
  try {
    body = (await c.req.json()) as { skill?: SkillId };
  } catch {
    return c.json({ error: "invalid JSON" }, 400);
  }
  if (!body?.skill || !skills.includes(body.skill)) {
    return c.json({ error: "invalid skill" }, 400);
  }
  const row = getProfile(user.id);
  if (!row) return c.json({ error: "profile missing" }, 404);
  const profile = toProfile(row);
  const result = validateUpgrade(profile, body.skill);
  if (!result.ok) return c.json({ error: result.error }, result.status);
  try {
    applyUpgrade(user.id, body.skill, result.cost);
  } catch {
    return c.json({ error: "upgrade failed" }, 409);
  }
  const updated = getProfile(user.id);
  return c.json({ profile: updated ? toProfile(updated) : profile });
});

// A handful of groundbait from the shack: the server takes the points, and the bag that holds it lives in the game.
upgradeRoutes.post("/groundbait", (c) => {
  const user = c.get("user") as SessionUser;
  const row = getProfile(user.id);
  if (!row) return c.json({ error: "profile missing" }, 404);
  const profile = toProfile(row);
  const result = validateGroundbaitBuy(profile);
  if (!result.ok) return c.json({ error: result.error }, result.status);
  try {
    spendPoints(user.id, result.cost);
  } catch {
    return c.json({ error: "not enough points" }, 409);
  }
  const updated = getProfile(user.id);
  return c.json({ profile: updated ? toProfile(updated) : profile });
});
