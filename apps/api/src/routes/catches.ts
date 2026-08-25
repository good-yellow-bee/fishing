import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { validateCatch, SPOT_IDS, type CatchRequest } from "@stillwater/shared";
import { getProfile, insertCatch, toProfile } from "../db.ts";
import type { SessionUser } from "../session.ts";

export const catchRoutes = new Hono();

catchRoutes.post("/catches", async (c) => {
  const user = c.get("user") as SessionUser;
  const body = (await c.req.json()) as CatchRequest;
  if (!body?.speciesId || typeof body.weight !== "number" || !SPOT_IDS.includes(body.spot)) {
    return c.json({ error: "invalid catch" }, 400);
  }
  const row = getProfile(user.id);
  if (!row) return c.json({ error: "profile missing" }, 404);
  const result = validateCatch(toProfile(row), body);
  if (!result.ok) return c.json({ error: result.error }, result.status);
  const record = {
    id: randomUUID(),
    user_id: user.id,
    species_id: body.speciesId,
    weight: body.weight,
    points: result.points,
    spot: body.spot,
    created_at: new Date().toISOString(),
  };
  insertCatch(record);
  return c.json({
    id: record.id,
    points: result.points,
    speciesId: body.speciesId,
    weight: body.weight,
  });
});
