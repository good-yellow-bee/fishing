import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const testDir = mkdtempSync(join(tmpdir(), "stillwater-auth-"));
process.env.STILLWATER_DB_PATH = join(testDir, "stillwater.sqlite");

const { auth } = await import("./auth.ts");
const { db, getProfile } = await import("./db.ts");

afterAll(() => {
  db.close();
  rmSync(testDir, { recursive: true, force: true });
});

let n = 0;
async function signUp(name: string) {
  const { user } = await auth.api.signUpEmail({ body: { name, email: `angler${++n}@example.com`, password: "long-enough-1" } });
  return { name: user.name, displayName: getProfile(user.id)?.display_name };
}

describe("a new account's nickname", () => {
  it("is the typed name, trimmed, on the account and the profile alike", async () => {
    expect(await signUp("  Ana  ")).toEqual({ name: "Ana", displayName: "Ana" });
  });

  it("is cut to 24 characters", async () => {
    const { name, displayName } = await signUp("x".repeat(40));
    expect(name).toBe("x".repeat(24));
    expect(displayName).toBe(name);
  });

  it("left blank, is a lake nickname, never the email", async () => {
    const { name, displayName } = await signUp("   ");
    expect(name).toMatch(/^[A-Z][a-z]+ \d{4}$/);
    expect(displayName).toBe(name);
  });
});

describe("sign-in defaults", () => {
  it("keeps a sign-in for 60 days and lets ten sign-ups a 10 s through one address", () => {
    expect(auth.options.session?.expiresIn).toBe(60 * 60 * 24 * 60);
    expect(auth.options.rateLimit?.customRules?.["/sign-up/email"]).toEqual({ window: 10, max: 10 });
  });
});
