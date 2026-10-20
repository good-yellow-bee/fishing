import { request, type FullConfig } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { ANGLER_FILE, STATE_FILE } from "./paths";

/** Signs up one angler for the whole run, so every test (and every repeat) shares a session. */
export default async function setup(config: FullConfig) {
  const baseURL = config.projects[0]!.use.baseURL!;
  const api = await request.newContext({ baseURL, extraHTTPHeaders: { origin: baseURL } });
  const signUp = await api.post("/api/auth/sign-up/email", { data: { name: "Visual", email: `visual-${Date.now()}@example.com`, password: "visual-tests-only-1" } });
  if (!signUp.ok()) throw new Error(`Sign-up failed: ${signUp.status()} ${await signUp.text()}`);
  const me = await api.get("/api/me");
  if (!me.ok()) throw new Error(`/api/me failed: ${me.status()}`);
  const body = (await me.json()) as { profile?: { userId?: string }; user?: { id?: string } };
  const userId = body.profile?.userId ?? body.user?.id;
  if (!userId) throw new Error("/api/me named no angler");
  mkdirSync(dirname(ANGLER_FILE), { recursive: true });
  writeFileSync(ANGLER_FILE, JSON.stringify({ userId }));
  await api.storageState({ path: STATE_FILE });
  await api.dispose();
}
