import { serve } from "@hono/node-server";
import { app } from "./app.ts";

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port }, () => {
  console.log(`stillwater api http://127.0.0.1:${port}`);
});
