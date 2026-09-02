import { Hono } from "hono";
import { boardView } from "@stillwater/shared";
import { listBoardStats } from "../db.ts";
import type { SessionUser } from "../session.ts";

export const boardRoutes = new Hono();

boardRoutes.get("/board", (c) => {
  const user = c.get("user") as SessionUser;
  return c.json(boardView(listBoardStats(), user.id));
});
