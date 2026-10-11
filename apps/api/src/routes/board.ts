import { Hono } from "hono";
import { BOARD_LIMIT, boardView, isBoardPeriod, weekStart } from "@stillwater/shared";
import { listBoardStats, listSpeciesRecords } from "../db.ts";
import type { SessionUser } from "../session.ts";

export const boardRoutes = new Hono();

boardRoutes.get("/board", (c) => {
  const user = c.get("user") as SessionUser;
  const asked = c.req.query("period");
  const period = isBoardPeriod(asked) ? asked : "all";
  const since = period === "week" ? weekStart().toISOString() : undefined;
  return c.json(boardView(listBoardStats(since), user.id, BOARD_LIMIT, period));
});

boardRoutes.get("/board/records", (c) => c.json({ records: listSpeciesRecords() }));
