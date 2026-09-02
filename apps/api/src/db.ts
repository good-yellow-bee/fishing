import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const dir = dirname(fileURLToPath(import.meta.url));
export const dataDir = join(dir, "../data");
export const dbPath = join(dataDir, "stillwater.sqlite");

mkdirSync(dataDir, { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS "user" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "emailVerified" INTEGER NOT NULL,
    "image" TEXT,
    "createdAt" DATE NOT NULL,
    "updatedAt" DATE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expiresAt" DATE NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "createdAt" DATE NOT NULL,
    "updatedAt" DATE NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" DATE,
    "refreshTokenExpiresAt" DATE,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" DATE NOT NULL,
    "updatedAt" DATE NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS account_issuer_accountId ON "account" ("issuer", "accountId");

  CREATE TABLE IF NOT EXISTS "verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" DATE NOT NULL,
    "createdAt" DATE NOT NULL,
    "updatedAt" DATE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS profile (
    user_id TEXT PRIMARY KEY REFERENCES "user" ("id") ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    lifetime_points INTEGER NOT NULL DEFAULT 0,
    strength INTEGER NOT NULL DEFAULT 1,
    accuracy INTEGER NOT NULL DEFAULT 1,
    patience INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS catch (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
    species_id TEXT NOT NULL,
    weight REAL NOT NULL,
    points INTEGER NOT NULL,
    spot TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS catch_user_created ON catch (user_id, created_at DESC);
`);

export type ProfileRow = {
  user_id: string;
  display_name: string;
  points: number;
  lifetime_points: number;
  strength: number;
  accuracy: number;
  patience: number;
};

export type CatchRow = {
  id: string;
  user_id: string;
  species_id: string;
  weight: number;
  points: number;
  spot: string;
  created_at: string;
};

export function createProfile(userId: string, displayName: string) {
  db.prepare(
    `INSERT OR IGNORE INTO profile (user_id, display_name) VALUES (?, ?)`,
  ).run(userId, displayName);
}

export function getProfile(userId: string): ProfileRow | undefined {
  return db.prepare(`SELECT * FROM profile WHERE user_id = ?`).get(userId) as
    | ProfileRow
    | undefined;
}

export function listCatches(userId: string, limit = 20): CatchRow[] {
  return db
    .prepare(`SELECT * FROM catch WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`)
    .all(userId, limit) as CatchRow[];
}

export function listSpeciesStats(userId: string) {
  const rows = db
    .prepare(
      `SELECT species_id, COUNT(*) as caught, MAX(weight) as heaviest, MAX(created_at) as last_at
       FROM catch WHERE user_id = ? GROUP BY species_id`,
    )
    .all(userId) as { species_id: string; caught: number; heaviest: number; last_at: string }[];
  return rows.map((row) => ({
    speciesId: row.species_id,
    caught: Number(row.caught),
    heaviest: row.heaviest,
    lastAt: row.last_at,
  }));
}

export function listBoardStats() {
  const rows = db
    .prepare(
      `SELECT p.user_id, p.display_name, p.lifetime_points,
              COALESCE(MAX(c.weight), 0) as heaviest,
              COUNT(c.id) as catches,
              COUNT(DISTINCT CASE WHEN c.species_id IS NOT NULL THEN c.species_id END) as species
       FROM profile p
       LEFT JOIN catch c ON c.user_id = p.user_id
       GROUP BY p.user_id, p.display_name, p.lifetime_points`,
    )
    .all() as {
      user_id: string;
      display_name: string;
      lifetime_points: number;
      heaviest: number;
      catches: number;
      species: number;
    }[];
  return rows.map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    lifetimePoints: row.lifetime_points,
    heaviest: row.heaviest,
    catches: Number(row.catches),
    species: Number(row.species),
  }));
}

export function insertCatch(row: CatchRow) {
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO catch (id, user_id, species_id, weight, points, spot, created_at)
       VALUES (@id, @user_id, @species_id, @weight, @points, @spot, @created_at)`,
    ).run(row);
    db.prepare(
      `UPDATE profile SET points = points + ?, lifetime_points = lifetime_points + ? WHERE user_id = ?`,
    ).run(row.points, row.points, row.user_id);
  });
  tx();
}

export function applyUpgrade(userId: string, skill: "strength" | "accuracy" | "patience", cost: number) {
  const tx = db.transaction(() => {
    const result = db
      .prepare(`UPDATE profile SET points = points - ?, ${skill} = ${skill} + 1 WHERE user_id = ? AND points >= ?`)
      .run(cost, userId, cost);
    if (result.changes !== 1) throw new Error("upgrade failed");
  });
  tx();
}

export function toProfile(row: ProfileRow) {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    points: row.points,
    lifetimePoints: row.lifetime_points,
    strength: row.strength,
    accuracy: row.accuracy,
    patience: row.patience,
  };
}

export function toCatch(row: CatchRow) {
  return {
    id: row.id,
    userId: row.user_id,
    speciesId: row.species_id,
    weight: row.weight,
    points: row.points,
    spot: row.spot,
    createdAt: row.created_at,
  };
}
