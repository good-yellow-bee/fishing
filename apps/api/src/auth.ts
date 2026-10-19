import { betterAuth } from "better-auth";
import { createProfile, db } from "./db.ts";

const production = process.env.NODE_ENV === "production";
const secret = process.env.BETTER_AUTH_SECRET;
if (!secret && production) {
  throw new Error("Set BETTER_AUTH_SECRET before running the API in production.");
}
if (!process.env.BETTER_AUTH_URL && production) {
  throw new Error("Set BETTER_AUTH_URL to the site's public URL before running the API in production.");
}

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:5173";
const devOrigins = production ? [] : ["http://localhost:5173", "http://127.0.0.1:5173"];
/** Origins that may call the API with the session cookie: the public site, plus the Vite dev server outside production. */
export const trustedOrigins = [...new Set([new URL(baseURL).origin, ...devOrigins])];

export const auth = betterAuth({
  database: db,
  baseURL,
  basePath: "/api/auth",
  secret: secret ?? "stillwater-dev-secret-change-me-32ch",
  trustedOrigins,
  // On Fly (which sets FLY_APP_NAME) the proxy puts the visitor's address here, so sign-in rate limits count per visitor.
  // Elsewhere the header is the client's own word, so it is left alone.
  ...(process.env.FLY_APP_NAME && { advanced: { ipAddress: { ipAddressHeaders: ["fly-client-ip"] } } }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const name = user.name?.trim() || user.email.split("@")[0] || "Angler";
          createProfile(user.id, name);
        },
      },
    },
  },
});
