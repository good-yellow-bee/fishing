import type { Context, Next } from "hono";
import { auth } from "./auth.ts";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
};

export async function requireSession(c: Context, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "unauthorized" }, 401);
  c.set("user", session.user as SessionUser);
  await next();
}
