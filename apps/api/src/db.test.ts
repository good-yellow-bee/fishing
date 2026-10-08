import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterAll, describe, expect, it } from "vitest";

const testDir = mkdtempSync(join(tmpdir(), "stillwater-db-"));
const dbPath = join(testDir, "stillwater.sqlite");

afterAll(() => rmSync(testDir, { recursive: true, force: true }));

describe("catch table migration", () => {
  it("adds the clean column to an existing database as not clean", async () => {
    const legacy = new Database(dbPath);
    legacy.exec(`
      CREATE TABLE catch (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, species_id TEXT NOT NULL, weight REAL NOT NULL,
        points INTEGER NOT NULL, spot TEXT NOT NULL, request_id TEXT, created_at TEXT NOT NULL
      );
      INSERT INTO catch VALUES ('old', 'angler', 'perch', 0.8, 12, 'dock', NULL, '2026-10-01T00:00:00.000Z');
    `);
    legacy.close();
    process.env.STILLWATER_DB_PATH = dbPath;

    const { db } = await import("./db.ts");

    expect(db.prepare(`SELECT clean FROM catch WHERE id = 'old'`).get()).toEqual({ clean: 0 });
    db.close();
  });
});
