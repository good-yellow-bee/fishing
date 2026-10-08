import { Hono } from "hono";
import { validateUpgrade, type SkillId } from "@stillwater/shared";
import { applyUpgrade, getProfile, toProfile } from "../db.ts";
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
