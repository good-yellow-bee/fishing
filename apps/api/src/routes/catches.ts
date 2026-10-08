import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { validateCatch, SPOT_IDS, type CatchSubmission } from "@stillwater/shared";
import { findCatchByRequestId, getProfile, recordCatch, toProfile } from "../db.ts";
import type { SessionUser } from "../session.ts";

export const catchRoutes = new Hono();

const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

catchRoutes.post("/catches", async (c) => {
  const user = c.get("user") as SessionUser;
  let body: CatchSubmission;
  try {
    body = (await c.req.json()) as CatchSubmission;
  } catch {
    return c.json({ error: "invalid JSON" }, 400);
  }
  if (
    !body?.speciesId ||
    typeof body.weight !== "number" ||
    !SPOT_IDS.includes(body.spot) ||
    typeof body.requestId !== "string" ||
    !requestIdPattern.test(body.requestId)
  ) {
    return c.json({ error: "invalid catch" }, 400);
  }
  const previous = findCatchByRequestId(user.id, body.requestId);
  if (previous) {
    if (previous.species_id !== body.speciesId || previous.weight !== body.weight || previous.spot !== body.spot) {
      return c.json({ error: "request ID conflicts with an existing catch" }, 409);
    }
    return c.json({ id: previous.id, points: previous.points, speciesId: previous.species_id, weight: previous.weight });
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
    request_id: body.requestId,
    created_at: new Date().toISOString(),
  };
  const saved = recordCatch(record);
  if (saved.kind === "existing") {
    if (saved.catch.species_id !== body.speciesId || saved.catch.weight !== body.weight || saved.catch.spot !== body.spot) {
      return c.json({ error: "request ID conflicts with an existing catch" }, 409);
    }
    return c.json({
      id: saved.catch.id,
      points: saved.catch.points,
      speciesId: saved.catch.species_id,
      weight: saved.catch.weight,
    });
  }
  if (saved.kind === "rate_limited") return c.json({ error: "catch rate limit exceeded" }, 429);
  return c.json({
    id: record.id,
    points: result.points,
    speciesId: body.speciesId,
    weight: body.weight,
  });
});
