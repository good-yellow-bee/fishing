import { betterAuth } from "better-auth";
import { createProfile, db } from "./db.ts";

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret && process.env.NODE_ENV === "production") {
  throw new Error("Set BETTER_AUTH_SECRET before running the API in production.");
}

export const auth = betterAuth({
  database: db,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:5173",
  basePath: "/api/auth",
  secret: secret ?? "stillwater-dev-secret-change-me-32ch",
  trustedOrigins: ["http://localhost:5173", "http://127.0.0.1:5173"],
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
