import type { SessionUser } from "./session.ts";

declare module "hono" {
  interface ContextVariableMap {
    user: SessionUser;
  }
}
