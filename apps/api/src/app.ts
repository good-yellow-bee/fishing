import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth, trustedOrigins } from "./auth.ts";
import { serveClient } from "./client.ts";
import { boardRoutes } from "./routes/board.ts";
import { catchRoutes } from "./routes/catches.ts";
import { dailyRequestRoutes } from "./routes/dailyRequests.ts";
import { lodgeRoutes } from "./routes/lodge.ts";
import { meRoutes } from "./routes/me.ts";
import { upgradeRoutes } from "./routes/upgrades.ts";
import { requireSession } from "./session.ts";

export const app = new Hono();

app.use(
  "*",
  cors({
    origin: trustedOrigins,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use("/api/me", requireSession);
app.use("/api/catches", requireSession);
app.use("/api/catches/*", requireSession);
// The wildcard also covers /api/daily-requests itself; an exact path would leave the claim route without a user.
app.use("/api/daily-requests/*", requireSession);
app.use("/api/upgrades", requireSession);
app.use("/api/board", requireSession);
app.use("/api/board/*", requireSession);
app.use("/api/lodge/*", requireSession);

app.route("/api", meRoutes);
app.route("/api", catchRoutes);
app.route("/api", dailyRequestRoutes);
app.route("/api", upgradeRoutes);
app.route("/api", boardRoutes);
app.route("/api", lodgeRoutes);

app.get("/api/health", (c) => c.json({ ok: true }));

// In development Vite serves the client and proxies /api here.
if (process.env.NODE_ENV === "production") {
  serveClient(app, join(dirname(fileURLToPath(import.meta.url)), "../../web/dist"));
}
