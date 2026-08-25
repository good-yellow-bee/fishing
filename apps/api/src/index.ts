import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth.ts";
import { catchRoutes } from "./routes/catches.ts";
import { meRoutes } from "./routes/me.ts";
import { upgradeRoutes } from "./routes/upgrades.ts";
import { requireSession } from "./session.ts";

const app = new Hono();

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
app.use("/api/upgrades", requireSession);

app.route("/api", meRoutes);
app.route("/api", catchRoutes);
app.route("/api", upgradeRoutes);

app.get("/api/health", (c) => c.json({ ok: true }));

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port }, () => {
  console.log(`stillwater api http://127.0.0.1:${port}`);
});
