import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth.ts";
import { boardRoutes } from "./routes/board.ts";
import { catchRoutes } from "./routes/catches.ts";
import { dailyRequestRoutes } from "./routes/dailyRequests.ts";
import { meRoutes } from "./routes/me.ts";
import { upgradeRoutes } from "./routes/upgrades.ts";
import { requireSession } from "./session.ts";

export const app = new Hono();

app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use("/api/me", requireSession);
app.use("/api/catches", requireSession);
// The wildcard also covers /api/daily-requests itself; an exact path would leave the claim route without a user.
app.use("/api/daily-requests/*", requireSession);
app.use("/api/upgrades", requireSession);
app.use("/api/board", requireSession);

app.route("/api", meRoutes);
app.route("/api", catchRoutes);
app.route("/api", dailyRequestRoutes);
app.route("/api", upgradeRoutes);
app.route("/api", boardRoutes);

app.get("/api/health", (c) => c.json({ ok: true }));
