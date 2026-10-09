import { Hono } from "hono";
import { dailyRequestProgress, dailyRequestsForDay } from "@stillwater/shared";
import { claimDailyRequest, listCatchesBetween, listDailyClaims, overlapsOtherClaimedDay, toCatch } from "../db.ts";
import type { SessionUser } from "../session.ts";

export const dailyRequestRoutes = new Hono();

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The angler's calendar day as the UTC instants of its first moment and the next day's, measured by the client
 * so zones that jump at midnight still start the day at the right instant. Real zones run UTC-12..+14 and a day
 * lasts 22-26 hours (up to two-hour DST shifts).
 */
function localDay({ day, from, to }: Record<string, string | undefined>) {
  if (!day || !dayPattern.test(day) || !from || !to) return null;
  const midnight = Date.parse(`${day}T00:00:00.000Z`);
  const start = Date.parse(from);
  const end = Date.parse(to);
  if ([midnight, start, end].some(Number.isNaN) || new Date(midnight).toISOString().slice(0, 10) !== day) return null;
  // UTC+14 starts before UTC midnight; UTC-12 starts after it. Keep the one-hour midnight-transition margin.
  if (start < midnight - 15 * HOUR_MS || start > midnight + 13 * HOUR_MS) return null;
  if (end - start < 22 * HOUR_MS || end - start > 26 * HOUR_MS) return null;
  // Given those bounds, a real local date is never more than a day from the server's.
  const today = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  if (Math.abs(midnight - today) > DAY_MS) return null;
  return { day, from: new Date(start).toISOString(), to: new Date(end).toISOString() };
}

dailyRequestRoutes.get("/daily-requests", (c) => {
  const user = c.get("user") as SessionUser;
  const local = localDay(c.req.query());
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
  const local = localDay(c.req.query());
  if (!local) return c.json({ error: "invalid day" }, 400);
  const request = dailyRequestsForDay(local.day).find((row) => row.id === c.req.param("id"));
  if (!request) return c.json({ error: "unknown daily request" }, 404);
  const catches = listCatchesBetween(user.id, local.from, local.to).map(toCatch);
  if (dailyRequestProgress(request, catches) < request.count) return c.json({ error: "request incomplete" }, 409);
  if (overlapsOtherClaimedDay(user.id, local)) return c.json({ error: "those hours already count for another day" }, 409);
  if (!claimDailyRequest(user.id, local, request.id, request.reward)) {
    return c.json({ error: "request already claimed" }, 409);
  }
  return c.json({ reward: request.reward });
});
