import { Hono } from "hono";
import { dailyRequestProgress, dailyRequestsForDay } from "@stillwater/shared";
import { claimDailyRequest, listCatchesBetween, listDailyClaims, toCatch } from "../db.ts";
import type { SessionUser } from "../session.ts";

export const dailyRequestRoutes = new Hono();

const DAY_MS = 86_400_000;
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
const offsetPattern = /^-?\d{1,3}$/;

/**
 * The angler's calendar day as a UTC window. `offset` is Date#getTimezoneOffset at that local midnight,
 * so on a DST change the window is an hour off at one end.
 */
function localDay(day: string | undefined, offset: string | undefined) {
  if (!day || !dayPattern.test(day) || !offset || !offsetPattern.test(offset)) return null;
  const midnight = Date.parse(`${day}T00:00:00.000Z`);
  if (Number.isNaN(midnight) || new Date(midnight).toISOString().slice(0, 10) !== day) return null;
  const minutes = Number(offset);
  // Real zones run from UTC+14 to UTC-12, so their local date is never more than a day from the server's.
  if (minutes < -840 || minutes > 720) return null;
  const today = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  if (Math.abs(midnight - today) > DAY_MS) return null;
  const from = midnight + minutes * 60_000;
  return { day, from: new Date(from).toISOString(), to: new Date(from + DAY_MS).toISOString() };
}

dailyRequestRoutes.get("/daily-requests", (c) => {
  const user = c.get("user") as SessionUser;
  const local = localDay(c.req.query("day"), c.req.query("offset"));
  if (!local) return c.json({ error: "invalid day" }, 400);
  const catches = listCatchesBetween(user.id, local.from, local.to).map(toCatch);
  const claimed = new Set(listDailyClaims(user.id, local.day));
  const requests = dailyRequestsForDay(local.day).map((request) => ({
    ...request,
    progress: dailyRequestProgress(request, catches),
    claimed: claimed.has(request.id),
  }));
  return c.json({ day: local.day, requests });
});

dailyRequestRoutes.post("/daily-requests/:id/claim", (c) => {
  const user = c.get("user") as SessionUser;
  const local = localDay(c.req.query("day"), c.req.query("offset"));
  if (!local) return c.json({ error: "invalid day" }, 400);
  const request = dailyRequestsForDay(local.day).find((row) => row.id === c.req.param("id"));
  if (!request) return c.json({ error: "unknown daily request" }, 404);
  const catches = listCatchesBetween(user.id, local.from, local.to).map(toCatch);
  if (dailyRequestProgress(request, catches) < request.count) return c.json({ error: "request incomplete" }, 409);
  if (!claimDailyRequest(user.id, local.day, request.id, request.reward)) {
    return c.json({ error: "request already claimed" }, 409);
  }
  return c.json({ reward: request.reward });
});
