import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Hono } from "hono";
import { fishById, STUDY_REWARD, trophyWeight } from "@stillwater/shared";

const testDir = mkdtempSync(join(tmpdir(), "stillwater-studies-"));
process.env.STILLWATER_DB_PATH = join(testDir, "stillwater.sqlite");

let app: Hono;
let db: typeof import("../db.ts").db;

beforeAll(async () => {
  const routes = await import("./studies.ts");
  db = (await import("../db.ts")).db;
  app = new Hono();
  app.use("*", async (c, next) => {
    c.set("user", { id: "ash", name: "Ash", email: "ash@x.test" });
    await next();
  });
  app.route("/", routes.studyRoutes);
});

afterAll(() => {
  db.close();
  rmSync(testDir, { recursive: true, force: true });
});

let n = 0;
function landed(spot: string, hour: string, weight: number) {
  n += 1;
  db.prepare(`INSERT INTO catch (id, user_id, species_id, weight, points, spot, request_id, clean, hour, created_at) VALUES (?, 'ash', 'perch', ?, 1, ?, ?, 0, ?, ?)`).run(`c${n}`, weight, spot, `r${n}`, hour, new Date().toISOString());
}
const points = () => (db.prepare(`SELECT points FROM profile WHERE user_id = 'ash'`).get() as { points: number }).points;
const claim = () => app.request("http://test/studies/perch/claim", { method: "POST" });

beforeEach(() => {
  db.exec(`DELETE FROM study_claim; DELETE FROM catch; DELETE FROM profile; DELETE FROM "user";`);
  const at = new Date().toISOString();
  db.prepare(`INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES ('ash', 'Ash', 'ash@x.test', 0, ?, ?)`).run(at, at);
  db.prepare(`INSERT INTO profile (user_id, display_name) VALUES ('ash', 'Ash')`).run();
});

describe("species studies", () => {
  it("lists a kind's studies, refuses to pay them unfinished, then pays them once", async () => {
    landed("dock", "dawn", 0.5);
    landed("reeds", "day", trophyWeight(fishById("perch")!));
    landed("dropoff", "night", 0.5);
    const listed = (await (await app.request("http://test/studies")).json()) as { studies: { speciesId: string; done: boolean; claimed: boolean }[] };
    expect(listed.studies).toEqual([expect.objectContaining({ speciesId: "perch", done: false, claimed: false })]);
    expect((await claim()).status).toBe(409);
    landed("open", "day", 0.5);
    expect((await claim()).status).toBe(200);
    expect(points()).toBe(STUDY_REWARD);
    expect((await claim()).status).toBe(409);
    expect(points()).toBe(STUDY_REWARD);
  });
});
