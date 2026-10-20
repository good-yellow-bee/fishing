import { Hono } from "hono";
import { BOARD_LIMIT, boardView, derbyOn, isBoardPeriod, lastDerby, nextDerby, weekStart } from "@stillwater/shared";
import { listBoardStats, listDerbyEntries, listSpeciesRecords } from "../db.ts";
import type { SessionUser } from "../session.ts";

export const boardRoutes = new Hono();

boardRoutes.get("/board", (c) => {
  const user = c.get("user") as SessionUser;
  const asked = c.req.query("period");
  const period = isBoardPeriod(asked) ? asked : "all";
  const since = period === "week" ? weekStart().toISOString() : undefined;
  return c.json(boardView(listBoardStats(since), user.id, BOARD_LIMIT, period));
});

/** The derby on now (or the next one on a weekday), its top ten and where the angler stands, and last weekend's champion. */
boardRoutes.get("/board/derby", (c) => {
  const user = c.get("user") as SessionUser;
  const now = new Date();
  const on = derbyOn(now);
  const derby = on ?? nextDerby(now);
  const ranked = on ? listDerbyEntries(on.fishId, on.from, on.to, 1000) : [];
  const yourRank = ranked.findIndex((row) => row.userId === user.id);
  const last = lastDerby(now);
  const champion = last ? listDerbyEntries(last.fishId, last.from, last.to, 1)[0] ?? null : null;
  return c.json({
    derby,
    running: on !== null,
    entries: ranked.slice(0, 10).map((row, index) => ({ rank: index + 1, userId: row.userId, displayName: row.displayName, weight: row.weight })),
    you: yourRank >= 0 ? { rank: yourRank + 1, weight: ranked[yourRank]!.weight } : null,
    lastChampion: last && champion ? { fishId: last.fishId, displayName: champion.displayName, weight: champion.weight } : null,
  });
});

boardRoutes.get("/board/records", (c) => c.json({ records: listSpeciesRecords() }));
