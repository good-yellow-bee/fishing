import { Hono } from "hono";
import { dailyRequestProgress, dailyRequestsForDay } from "@stillwater/shared";
import { claimDailyRequest, listCatchesBetween, listDailyClaims, overlapsOtherClaimedDay, toCatch } from "../db.ts";
import type { SessionUser } from "../session.ts";

export const dailyRequestRoutes = new Hono();

const DAY_MS = 86_400_000;
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
const offsetPattern = /^-?\d{1,3}$/;
const MAX_DAY_SHIFT_MINUTES = 60;

/** Minutes from Date#getTimezoneOffset; real zones run from UTC+14 to UTC-12. */
function zoneOffset(value: string | undefined) {
  if (!value || !offsetPattern.test(value)) return null;
  const minutes = Number(value);
  return minutes < -840 || minutes > 720 ? null : minutes;
}

/**
 * The angler's calendar day as a UTC window, from Date#getTimezoneOffset at its midnight and at the next,
 * so one angler's days abut exactly even across a DST change.
 */
function localDay({ day, offset, nextOffset }: Record<string, string | undefined>) {
  const start = zoneOffset(offset);
  const end = zoneOffset(nextOffset);
  if (!day || !dayPattern.test(day) || start === null || end === null) return null;
  // One zone's offsets differ by at most a DST shift across a day; anything else is not a real local day.
  if (Math.abs(start - end) > MAX_DAY_SHIFT_MINUTES) return null;
  const midnight = Date.parse(`${day}T00:00:00.000Z`);
  if (Number.isNaN(midnight) || new Date(midnight).toISOString().slice(0, 10) !== day) return null;
  // Given the offset bounds, a real local date is never more than a day from the server's.
  const today = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  if (Math.abs(midnight - today) > DAY_MS) return null;
  return {
    day,
    from: new Date(midnight + start * 60_000).toISOString(),
    to: new Date(midnight + DAY_MS + end * 60_000).toISOString(),
  };
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
