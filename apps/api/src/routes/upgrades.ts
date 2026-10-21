import { Hono, type Context } from "hono";
import { validateAeratorBuy, validateBreadCrumbBuy, validateWormBinBuy, validateGroundbaitBuy, validateShinerBuy, validateUpgrade, validateWormBuy, type SkillId } from "@stillwater/shared";
import { applyUpgrade, fitAerator, getProfile, spendPoints, takeBreadCrumb, takeWormBin, toProfile } from "../db.ts";
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

// A handful of groundbait, a live shiner, a worm, the bucket's aerator, a place in the worm bin or a sack of bread crumb from the shack: the server takes the points, and what was bought lives in the game.
const shackSale = (validate: typeof validateGroundbaitBuy, spend = spendPoints) => (c: Context) => {
  const user = c.get("user") as SessionUser;
  const row = getProfile(user.id);
  if (!row) return c.json({ error: "profile missing" }, 404);
  const profile = toProfile(row);
  const result = validate(profile);
  if (!result.ok) return c.json({ error: result.error }, result.status);
  try {
    spend(user.id, result.cost);
  } catch {
    return c.json({ error: "not enough points" }, 409);
  }
  const updated = getProfile(user.id);
  return c.json({ profile: updated ? toProfile(updated) : profile });
};
upgradeRoutes.post("/groundbait", shackSale(validateGroundbaitBuy));
upgradeRoutes.post("/shiner", shackSale(validateShinerBuy));
upgradeRoutes.post("/worm", shackSale(validateWormBuy));
upgradeRoutes.post("/aerator", shackSale(validateAeratorBuy, fitAerator));
upgradeRoutes.post("/worm-bin", shackSale(validateWormBinBuy, takeWormBin));
upgradeRoutes.post("/bread-crumb", shackSale(validateBreadCrumbBuy, takeBreadCrumb));
