import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { isLakeHour, isLakeSeason, isSky, type BadgeFactRow, type BoardStat, type LodgeTrack, type SpeciesRecord, type SpotId } from "@stillwater/shared";

const dir = dirname(fileURLToPath(import.meta.url));
export const dataDir = join(dir, "../data");
export const dbPath = process.env.STILLWATER_DB_PATH ?? join(dataDir, "stillwater.sqlite");

mkdirSync(dirname(dbPath), { recursive: true });

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
    request_id TEXT,
    clean INTEGER NOT NULL DEFAULT 0,
    hour TEXT,
    sky TEXT,
    season TEXT,
    golden INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS catch_user_created ON catch (user_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS daily_request_claim (
    user_id TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
    day TEXT NOT NULL,
    daily_request_id TEXT NOT NULL,
    window_from TEXT NOT NULL,
    window_to TEXT NOT NULL,
    claimed_at TEXT NOT NULL,
    PRIMARY KEY (user_id, day, daily_request_id)
  );
`);

const catchColumns = db.prepare(`PRAGMA table_info(catch)`).all() as { name: string }[];
if (!catchColumns.some((column) => column.name === "request_id")) {
  db.exec(`ALTER TABLE catch ADD COLUMN request_id TEXT`);
}
if (!catchColumns.some((column) => column.name === "clean")) {
  db.exec(`ALTER TABLE catch ADD COLUMN clean INTEGER NOT NULL DEFAULT 0`);
}
// Older rows keep null: their hour can't be recovered from created_at without the angler's time zone.
if (!catchColumns.some((column) => column.name === "hour")) {
  db.exec(`ALTER TABLE catch ADD COLUMN hour TEXT`);
}
if (!catchColumns.some((column) => column.name === "sky")) {
  db.exec(`ALTER TABLE catch ADD COLUMN sky TEXT`);
}
// Like hour, an older row's season stays null rather than guessed from created_at in UTC.
if (!catchColumns.some((column) => column.name === "season")) {
  db.exec(`ALTER TABLE catch ADD COLUMN season TEXT`);
}
// Older rows stay plain: they were paid as plain fish, so they don't turn golden after the fact.
if (!catchColumns.some((column) => column.name === "golden")) {
  db.exec(`ALTER TABLE catch ADD COLUMN golden INTEGER NOT NULL DEFAULT 0`);
}
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS catch_user_request ON catch (user_id, request_id)`);

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
  request_id: string | null;
  clean: 0 | 1;
  hour: string | null;
  sky: string | null;
  season: string | null;
  golden: 0 | 1;
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

export function findCatchByRequestId(userId: string, requestId: string): CatchRow | undefined {
  return db
    .prepare(`SELECT * FROM catch WHERE user_id = ? AND request_id = ?`)
    .get(userId, requestId) as CatchRow | undefined;
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

/** The whole history grouped into badge facts; `listCatches` stops at 20, so badges can't be read from it. */
export function listBadgeFacts(userId: string): BadgeFactRow[] {
  const rows = db
    .prepare(
      `SELECT species_id, spot, hour, sky, season, clean, golden, COUNT(*) as count, MAX(weight) as heaviest
       FROM catch WHERE user_id = ? GROUP BY species_id, spot, hour, sky, season, clean, golden`,
    )
    .all(userId) as {
    species_id: string;
    spot: SpotId;
    hour: string | null;
    sky: string | null;
    season: string | null;
    clean: 0 | 1;
    golden: 0 | 1;
    count: number;
    heaviest: number;
  }[];
  return rows.map((row) => ({
    speciesId: row.species_id,
    spot: row.spot,
    hour: row.hour !== null && isLakeHour(row.hour) ? row.hour : null,
    sky: isSky(row.sky) ? row.sky : null,
    season: isLakeSeason(row.season) ? row.season : null,
    clean: row.clean === 1,
    golden: row.golden === 1,
    count: Number(row.count),
    heaviest: row.heaviest,
  }));
}

/** Every angler's standing. With `since`, only catches from then on count and only anglers who landed one appear. */
export function listBoardStats(since?: string): BoardStat[] {
  const rows = db
    .prepare(
      `SELECT p.user_id, p.display_name, p.lifetime_points,
              COALESCE(SUM(c.points), 0) as period_points,
              COALESCE(MAX(c.weight), 0) as heaviest,
              COUNT(c.id) as catches,
              COUNT(DISTINCT CASE WHEN c.species_id IS NOT NULL THEN c.species_id END) as species
       FROM profile p
       LEFT JOIN catch c ON c.user_id = p.user_id AND (@since IS NULL OR c.created_at >= @since)
       GROUP BY p.user_id, p.display_name, p.lifetime_points
       HAVING @since IS NULL OR COUNT(c.id) > 0`,
    )
    .all({ since: since ?? null }) as {
      user_id: string;
      display_name: string;
      lifetime_points: number;
      period_points: number;
      heaviest: number;
      catches: number;
      species: number;
    }[];
  return rows.map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    lifetimePoints: row.lifetime_points,
    score: since ? Number(row.period_points) : row.lifetime_points,
    heaviest: row.heaviest,
    catches: Number(row.catches),
    species: Number(row.species),
  }));
}

/** The heaviest of each species anyone has landed, with who holds it; the earlier catch keeps a tie. */
export function listSpeciesRecords(): SpeciesRecord[] {
  const rows = db
    .prepare(
      `SELECT species_id, weight, user_id, display_name, created_at FROM (
         SELECT c.species_id, c.weight, c.user_id, p.display_name, c.created_at,
                ROW_NUMBER() OVER (PARTITION BY c.species_id ORDER BY c.weight DESC, c.created_at ASC, c.id ASC) as place
         FROM catch c JOIN profile p ON p.user_id = c.user_id
       ) WHERE place = 1`,
    )
    .all() as { species_id: string; weight: number; user_id: string; display_name: string; created_at: string }[];
  return rows.map((row) => ({
    speciesId: row.species_id,
    weight: row.weight,
    userId: row.user_id,
    holder: row.display_name,
    at: row.created_at,
  }));
}

/** Other anglers' catches since `since`, newest first, for the shore tracks. */
export function listRecentLodgeCatches(since: string, limit: number): (LodgeTrack & { userId: string })[] {
  const rows = db
    .prepare(
      `SELECT c.id, c.user_id, p.display_name, c.species_id, c.spot, c.created_at
       FROM catch c JOIN profile p ON p.user_id = c.user_id
       WHERE c.created_at >= ? ORDER BY c.created_at DESC LIMIT ?`,
    )
    .all(since, limit) as { id: string; user_id: string; display_name: string; species_id: string; spot: SpotId; created_at: string }[];
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    speciesId: row.species_id,
    spot: row.spot,
    createdAt: row.created_at,
  }));
}

export type RecordCatchResult =
  | { kind: "created" }
  | { kind: "existing"; catch: CatchRow }
  | { kind: "rate_limited" };

export function recordCatch(row: CatchRow): RecordCatchResult {
  return db.transaction(() => {
    const existing = findCatchByRequestId(row.user_id, row.request_id ?? "");
    if (existing) return { kind: "existing", catch: existing } as const;
    const cutoff = new Date(new Date(row.created_at).getTime() - 60_000).toISOString();
    const count = db
      .prepare(`SELECT COUNT(*) as count FROM catch WHERE user_id = ? AND created_at > ?`)
      .get(row.user_id, cutoff) as { count: number };
    if (count.count >= 12) return { kind: "rate_limited" } as const;
    db.prepare(
      `INSERT INTO catch (id, user_id, species_id, weight, points, spot, request_id, clean, hour, sky, season, golden, created_at)
       VALUES (@id, @user_id, @species_id, @weight, @points, @spot, @request_id, @clean, @hour, @sky, @season, @golden, @created_at)`,
    ).run(row);
    db.prepare(
      `UPDATE profile SET points = points + ?, lifetime_points = lifetime_points + ? WHERE user_id = ?`,
    ).run(row.points, row.points, row.user_id);
    return { kind: "created" } as const;
  })();
}

/** A catch the offline queue posts late counts on the day the server saved it, not the day it was landed. */
export function listCatchesBetween(userId: string, from: string, to: string): CatchRow[] {
  return db
    .prepare(`SELECT * FROM catch WHERE user_id = ? AND created_at >= ? AND created_at < ?`)
    .all(userId, from, to) as CatchRow[];
}

/** An angler's local day and the UTC window of catches it counts. */
export type DayWindow = { day: string; from: string; to: string };

export function listDailyClaims(userId: string, day: string): string[] {
  const rows = db
    .prepare(`SELECT daily_request_id FROM daily_request_claim WHERE user_id = ? AND day = ?`)
    .all(userId, day) as { daily_request_id: string }[];
  return rows.map((row) => row.daily_request_id);
}

/** The client picks the offsets, so a window overlapping another claimed day's would count the same catches twice. */
export function overlapsOtherClaimedDay(userId: string, local: DayWindow): boolean {
  return (
    db
      .prepare(
        `SELECT 1 FROM daily_request_claim WHERE user_id = ? AND day != ? AND window_from < ? AND window_to > ? LIMIT 1`,
      )
      .get(userId, local.day, local.to, local.from) !== undefined
  );
}

/** False when that day's request was already claimed; the primary key rules out paying twice. */
export function claimDailyRequest(userId: string, local: DayWindow, dailyRequestId: string, reward: number): boolean {
  return db.transaction(() => {
    const claim = db
      .prepare(
        `INSERT OR IGNORE INTO daily_request_claim (user_id, day, daily_request_id, window_from, window_to, claimed_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(userId, local.day, dailyRequestId, local.from, local.to, new Date().toISOString());
    if (claim.changes !== 1) return false;
    db.prepare(
      `UPDATE profile SET points = points + ?, lifetime_points = lifetime_points + ? WHERE user_id = ?`,
    ).run(reward, reward, userId);
    return true;
  })();
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
    hour: row.hour,
    sky: row.sky,
    season: row.season,
    golden: row.golden === 1,
    createdAt: row.created_at,
  };
}
