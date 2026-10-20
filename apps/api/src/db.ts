import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { BAG_SIZE, SLAMS, fishById, TAG_RETURN_BONUS, TAGGABLE_IDS, isLakeHour, lakeSeason, releaseBonus, isLakeSeason, isSky, type BadgeFactRow, type BoardStat, type BonusId, type LodgeLost, type LostFound, type LodgeRelease, type LodgeTrack, type StudyFact, type TagReturn, type SpeciesRecord, type SpotId } from "@stillwater/shared";

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
    released INTEGER NOT NULL DEFAULT 0,
    day TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS catch_user_created ON catch (user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS catch_species_created ON catch (species_id, created_at);
  CREATE INDEX IF NOT EXISTS catch_created ON catch (created_at);

  CREATE TABLE IF NOT EXISTS lost_fish (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
    species_id TEXT NOT NULL,
    weight REAL NOT NULL,
    spot TEXT NOT NULL,
    lure TEXT,
    lost_at TEXT NOT NULL,
    found_by TEXT,
    found_at TEXT
  );
  CREATE INDEX IF NOT EXISTS lost_fish_lost_at ON lost_fish (lost_at);

  CREATE TABLE IF NOT EXISTS giant_landed (
    week TEXT NOT NULL,
    spot TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
    landed_at TEXT NOT NULL,
    PRIMARY KEY (week, spot)
  );

  CREATE TABLE IF NOT EXISTS study_claim (
    user_id TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
    species_id TEXT NOT NULL,
    claimed_at TEXT NOT NULL,
    PRIMARY KEY (user_id, species_id)
  );

  CREATE TABLE IF NOT EXISTS daily_request_claim (
    user_id TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
    day TEXT NOT NULL,
    daily_request_id TEXT NOT NULL,
    window_from TEXT NOT NULL,
    window_to TEXT NOT NULL,
    claimed_at TEXT NOT NULL,
    PRIMARY KEY (user_id, day, daily_request_id)
  );

  CREATE TABLE IF NOT EXISTS weekly_challenge_claim (
    user_id TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
    week TEXT NOT NULL,
    challenge_id TEXT NOT NULL,
    claimed_at TEXT NOT NULL,
    PRIMARY KEY (user_id, week, challenge_id)
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
if (!catchColumns.some((column) => column.name === "released")) {
  db.exec(`ALTER TABLE catch ADD COLUMN released INTEGER NOT NULL DEFAULT 0`);
}
// Older rows keep null: their local day can't be told from created_at without the angler's time zone.
if (!catchColumns.some((column) => column.name === "day")) {
  db.exec(`ALTER TABLE catch ADD COLUMN day TEXT`);
}
// The bonuses the catch was paid, comma-separated, so the landed card stamps only those.
if (!catchColumns.some((column) => column.name === "bonuses")) {
  db.exec(`ALTER TABLE catch ADD COLUMN bonuses TEXT`);
}
// When the angler let the fish go; older releases have only their catch's time.
if (!catchColumns.some((column) => column.name === "released_at")) {
  db.exec(`ALTER TABLE catch ADD COLUMN released_at TEXT`);
  db.exec(`UPDATE catch SET released_at = created_at WHERE released = 1`);
}
// A fish another angler let go and this catch landed again: that catch's id.
if (!catchColumns.some((column) => column.name === "tagged_from")) {
  db.exec(`ALTER TABLE catch ADD COLUMN tagged_from TEXT`);
}
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS catch_user_request ON catch (user_id, request_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS catch_user_day ON catch (user_id, day)`);
db.exec(`CREATE INDEX IF NOT EXISTS catch_released_at ON catch (released_at) WHERE released_at IS NOT NULL`);
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS catch_tagged_from ON catch (tagged_from) WHERE tagged_from IS NOT NULL`);

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
  /** Read back from the table; a new catch is never released yet. */
  released?: 0 | 1;
  day: string | null;
  /** Another angler's let-go fish this catch landed again. */
  tagged_from?: string | null;
  /** The bonuses it was paid, comma-separated. */
  bonuses?: string | null;
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

/** How many fish of a kind the angler has landed, for the mastery tiers. */
export function countCatches(userId: string, speciesId: string): number {
  return (db.prepare(`SELECT COUNT(*) as n FROM catch WHERE user_id = ? AND species_id = ?`).get(userId, speciesId) as { n: number }).n;
}

/** The heaviest of a species this angler has landed, or null before the first. */
export function heaviestCatch(userId: string, speciesId: string): number | null {
  const row = db.prepare(`SELECT MAX(weight) as heaviest FROM catch WHERE user_id = ? AND species_id = ?`).get(userId, speciesId) as
    | { heaviest: number | null }
    | undefined;
  return row?.heaviest ?? null;
}

/** The heaviest of a species any other angler has landed, or null when nobody else has. */
export function othersHeaviestCatch(userId: string, speciesId: string): number | null {
  const row = db.prepare(`SELECT MAX(weight) as heaviest FROM catch WHERE user_id != ? AND species_id = ?`).get(userId, speciesId) as
    | { heaviest: number | null }
    | undefined;
  return row?.heaviest ?? null;
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

/** Each (local day, kind) the angler landed of a slam's kinds; catches saved before days were sent are left out. */
export function listSlamDays(userId: string, since = "0000-01-01"): { day: string; speciesId: string }[] {
  const kinds = SLAMS.flatMap((slam) => slam.kinds);
  return db
    .prepare(`SELECT DISTINCT day, species_id as speciesId FROM catch WHERE user_id = ? AND day >= ? AND species_id IN (${kinds.map(() => "?").join(", ")})`)
    .all(userId, since, ...kinds) as { day: string; speciesId: string }[];
}

/** Every local day the angler landed a fish on, oldest first; catches saved before days were sent are left out. */
export function listCatchDays(userId: string): string[] {
  const rows = db
    .prepare(`SELECT DISTINCT day FROM catch WHERE user_id = ? AND day IS NOT NULL ORDER BY day`)
    .all(userId) as { day: string }[];
  return rows.map((row) => row.day);
}

/** The heaviest of a derby's fish each angler landed in its window, heaviest first; of equal fish, the one landed first wins. */
export function listDerbyEntries(fishId: string, from: string, to: string, limit: number) {
  return db
    .prepare(
      `SELECT userId, displayName, weight, landedAt FROM (
         SELECT c.user_id as userId, p.display_name as displayName, c.weight as weight, c.created_at as landedAt,
                ROW_NUMBER() OVER (PARTITION BY c.user_id ORDER BY c.weight DESC, c.created_at ASC) as nth
         FROM catch c JOIN profile p ON p.user_id = c.user_id
         WHERE c.species_id = ? AND c.created_at >= ? AND c.created_at < ?
       ) WHERE nth = 1 ORDER BY weight DESC, landedAt ASC LIMIT ?`,
    )
    .all(fishId, from, to, limit) as { userId: string; displayName: string; weight: number; landedAt: string }[];
}

/** Each angler's day's bag in a window: the total of their BAG_SIZE heaviest fish, heaviest bag first; of equal bags, the one made first wins. */
export function listDayBags(from: string, to: string, limit: number) {
  return db
    .prepare(
      `SELECT userId, displayName, ROUND(SUM(weight), 2) as total, COUNT(*) as count, MAX(landedAt) as madeAt FROM (
         SELECT c.user_id as userId, p.display_name as displayName, c.weight as weight, c.created_at as landedAt,
                ROW_NUMBER() OVER (PARTITION BY c.user_id ORDER BY c.weight DESC, c.created_at ASC) as nth
         FROM catch c JOIN profile p ON p.user_id = c.user_id
         WHERE c.created_at >= ? AND c.created_at < ?
       ) WHERE nth <= ? GROUP BY userId ORDER BY total DESC, madeAt ASC, userId ASC LIMIT ?`,
    )
    .all(from, to, BAG_SIZE, limit) as { userId: string; displayName: string; total: number; count: number; madeAt: string }[];
}

/** Each kind's banks, hours and heaviest the angler landed it at, for the studies. */
export function listStudyFacts(userId: string): StudyFact[] {
  return db
    .prepare(`SELECT species_id as speciesId, spot, hour, MAX(weight) as heaviest FROM catch WHERE user_id = ? GROUP BY species_id, spot, hour`)
    .all(userId) as StudyFact[];
}

/** Claims a week's giant at a bank for the angler who landed it; false when someone landed it first. */
export function claimGiant(week: string, spot: string, userId: string): boolean {
  return db.prepare(`INSERT OR IGNORE INTO giant_landed (week, spot, user_id, landed_at) VALUES (?, ?, ?, ?)`).run(week, spot, userId, new Date().toISOString()).changes === 1;
}

/** Claims the giant and pays its bonus together, or neither; false when someone landed it first. */
export function claimAndPayGiant(week: string, spot: string, userId: string, catchId: string, bonus: number): boolean {
  return db.transaction(() => {
    if (!claimGiant(week, spot, userId)) return false;
    payBonus(catchId, userId, bonus, "giant");
    return true;
  })();
}

/** Pays a saved catch a bonus it won after saving, on the catch (with its id in bonuses) and the angler's points. */
export function payBonus(catchId: string, userId: string, bonus: number, id: BonusId) {
  db.transaction(() => {
    db.prepare(`UPDATE catch SET points = points + ?, bonuses = CASE WHEN bonuses IS NULL OR bonuses = '' THEN ? ELSE bonuses || ',' || ? END WHERE id = ?`).run(bonus, id, id, catchId);
    db.prepare(`UPDATE profile SET points = points + ?, lifetime_points = lifetime_points + ? WHERE user_id = ?`).run(bonus, bonus, userId);
  })();
}

/** Files a trophy the angler lost, for the rest of the lodge to meet at its bank. */
export function reportLost(userId: string, fish: { speciesId: string; weight: number; spot: string; lure: string | null }): string {
  const id = randomUUID();
  db.prepare(`INSERT INTO lost_fish (id, user_id, species_id, weight, spot, lure, lost_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, userId, fish.speciesId, fish.weight, fish.spot, fish.lure, new Date().toISOString());
  return id;
}

/** Other anglers' lost trophies since `since` that no one has landed yet, the newest first. */
export function listLodgeLost(userId: string, since: string, limit: number): LodgeLost[] {
  return db
    .prepare(
      `SELECT l.id, l.species_id as speciesId, l.weight, l.spot, l.lure, l.lost_at as at, p.display_name as by FROM lost_fish l JOIN profile p ON p.user_id = l.user_id
       WHERE l.user_id != ? AND l.found_by IS NULL AND l.lost_at >= ? ORDER BY l.lost_at DESC LIMIT ?`,
    )
    .all(userId, since, limit) as LodgeLost[];
}

/** How many of the angler's lost trophies since `since` are still out there. */
export function countOpenLost(userId: string, since: string): number {
  return (db.prepare(`SELECT COUNT(*) as n FROM lost_fish WHERE user_id = ? AND found_by IS NULL AND lost_at >= ?`).get(userId, since) as { n: number }).n;
}

/** The angler's own lost trophies since `since` that someone else has landed. */
export function listMineFound(userId: string, since: string): LostFound[] {
  return db.prepare(`SELECT species_id as speciesId, weight, spot FROM lost_fish WHERE user_id = ? AND found_by IS NOT NULL AND lost_at >= ?`).all(userId, since) as LostFound[];
}

/** Claims another angler's lost trophy for the catch that landed it, and pays its finder, together or neither; false when it was not theirs to claim. */
export function claimAndPayLost(lostId: string, fish: { speciesId: string; weight: number; spot: string }, since: string, userId: string, catchId: string, bonus: number): boolean {
  return db.transaction(() => {
    const claimed = db
      .prepare(`UPDATE lost_fish SET found_by = ?, found_at = ? WHERE id = ? AND user_id != ? AND found_by IS NULL AND lost_at >= ? AND species_id = ? AND spot = ? AND ABS(weight - ?) < 0.005`)
      .run(userId, new Date().toISOString(), lostId, userId, since, fish.speciesId, fish.spot, fish.weight);
    if (claimed.changes !== 1) return false;
    payBonus(catchId, userId, bonus, "found");
    return true;
  })();
}

/** How many of the weekly giants the angler was first to land. */
export function countGiantsLanded(userId: string): number {
  return (db.prepare(`SELECT COUNT(*) as n FROM giant_landed WHERE user_id = ?`).get(userId) as { n: number }).n;
}

/** Who landed each of a week's giants, and when. */
export function listGiantsLanded(week: string): { spot: string; displayName: string; landedAt: string }[] {
  return db
    .prepare(`SELECT g.spot, p.display_name as displayName, g.landed_at as landedAt FROM giant_landed g JOIN profile p ON p.user_id = g.user_id WHERE g.week = ?`)
    .all(week) as { spot: string; displayName: string; landedAt: string }[];
}

/** The kinds whose studies the angler has been paid for. */
export function listStudyClaims(userId: string): string[] {
  return (db.prepare(`SELECT species_id FROM study_claim WHERE user_id = ?`).all(userId) as { species_id: string }[]).map((row) => row.species_id);
}

/** Pays a kind's finished studies once; null when they were paid already. */
export function claimStudy(userId: string, speciesId: string, reward: number): number | null {
  return db.transaction(() => {
    const claim = db.prepare(`INSERT OR IGNORE INTO study_claim (user_id, species_id, claimed_at) VALUES (?, ?, ?)`).run(userId, speciesId, new Date().toISOString());
    if (claim.changes !== 1) return null;
    db.prepare(`UPDATE profile SET points = points + ?, lifetime_points = lifetime_points + ? WHERE user_id = ?`).run(reward, reward, userId);
    return reward;
  })();
}

/** Each angler's count of fish let go since `since`, most first; of equal counts, by name. */
export function listStewards(since: string) {
  return db
    .prepare(
      `SELECT c.user_id as userId, p.display_name as displayName, COUNT(*) as count
       FROM catch c JOIN profile p ON p.user_id = c.user_id
       WHERE c.released_at >= ?
       GROUP BY c.user_id ORDER BY count DESC, displayName COLLATE NOCASE ASC, userId ASC LIMIT 1000`,
    )
    .all(since) as { userId: string; displayName: string; count: number }[];
}

/** The weights of the angler's day's bag in a window, heaviest first. */
export function listBagWeights(userId: string, from: string, to: string): number[] {
  const rows = db
    .prepare(`SELECT weight FROM catch WHERE user_id = ? AND created_at >= ? AND created_at < ? ORDER BY weight DESC LIMIT ?`)
    .all(userId, from, to, BAG_SIZE) as { weight: number }[];
  return rows.map((row) => row.weight);
}

const LODGE_RELEASE_SELECT = `SELECT c.id as catchId, c.species_id as speciesId, c.weight as weight, c.spot as spot, c.created_at as at, p.display_name as by
  FROM catch c JOIN profile p ON p.user_id = c.user_id
  WHERE c.released = 1 AND c.user_id != ? AND c.created_at >= ? AND c.created_at < ?
    AND c.species_id IN (${TAGGABLE_IDS.map(() => "?").join(", ")})
    AND NOT EXISTS (SELECT 1 FROM catch again WHERE again.tagged_from = c.id)`;

/** Fish other anglers let go in a window and nobody has landed again, newest first. */
export function listLodgeReleases(userId: string, from: string, before: string, limit: number): LodgeRelease[] {
  return db.prepare(`${LODGE_RELEASE_SELECT} ORDER BY c.created_at DESC LIMIT ?`).all(userId, from, before, ...TAGGABLE_IDS, limit) as LodgeRelease[];
}

/** How many fish the angler kept at each bank since `since`; fish let go went back to the bank. */
export function listBankCounts(userId: string, since: string): { spot: SpotId; count: number }[] {
  return db.prepare(`SELECT spot, COUNT(*) as count FROM catch WHERE user_id = ? AND created_at >= ? AND released = 0 GROUP BY spot`).all(userId, since) as { spot: SpotId; count: number }[];
}

/** The angler's let-go fish other anglers landed again since `since`, newest first. */
export function listTagReturns(userId: string, since: string, limit: number): TagReturn[] {
  return db
    .prepare(
      `SELECT again.id as catchId, again.species_id as speciesId, again.weight as weight, orig.weight as was, p.display_name as by, again.created_at as at
       FROM catch again JOIN catch orig ON orig.id = again.tagged_from JOIN profile p ON p.user_id = again.user_id
       WHERE again.created_at >= ? AND again.tagged_from IS NOT NULL AND orig.user_id = ? ORDER BY again.created_at DESC LIMIT ?`,
    )
    .all(since, userId, limit) as TagReturn[];
}

/** One of those let-go fish, by its catch's id, if it is still in the lake for this angler. */
export function findLodgeRelease(userId: string, catchId: string, from: string, before: string): LodgeRelease | undefined {
  return db.prepare(`${LODGE_RELEASE_SELECT} AND c.id = ?`).get(userId, from, before, ...TAGGABLE_IDS, catchId) as LodgeRelease | undefined;
}

/** How many ended derbies this angler held the top spot of, back to their first catch. */
export function countDerbyWins(userId: string, derbies: readonly { fishId: string; from: string; to: string }[]): number {
  return derbies.filter((derby) => listDerbyEntries(derby.fishId, derby.from, derby.to, 1)[0]?.userId === userId).length;
}

export function firstCatchAt(userId: string): string | null {
  return (db.prepare(`SELECT MIN(created_at) as at FROM catch WHERE user_id = ?`).get(userId) as { at: string | null }).at;
}

/** The whole history grouped into badge facts; `listCatches` stops at 20, so badges can't be read from it. */
export function listBadgeFacts(userId: string): BadgeFactRow[] {
  const rows = db
    .prepare(
      `SELECT species_id, spot, hour, sky, season, clean, golden, released, COUNT(*) as count, MAX(weight) as heaviest
       FROM catch WHERE user_id = ? GROUP BY species_id, spot, hour, sky, season, clean, golden, released`,
    )
    .all(userId) as {
    species_id: string;
    spot: SpotId;
    hour: string | null;
    sky: string | null;
    season: string | null;
    clean: 0 | 1;
    golden: 0 | 1;
    released: 0 | 1;
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
    released: row.released === 1,
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
      `INSERT INTO catch (id, user_id, species_id, weight, points, spot, request_id, clean, hour, sky, season, golden, day, tagged_from, bonuses, created_at)
       VALUES (@id, @user_id, @species_id, @weight, @points, @spot, @request_id, @clean, @hour, @sky, @season, @golden, @day, @tagged_from, @bonuses, @created_at)`,
    ).run({ ...row, tagged_from: row.tagged_from ?? null, bonuses: row.bonuses ?? null });
    // The angler who let the fish go is paid for it once, when it is landed again.
    const tagged = row.tagged_from ? (db.prepare(`SELECT user_id FROM catch WHERE id = ?`).get(row.tagged_from) as { user_id: string } | undefined) : undefined;
    if (tagged) db.prepare(`UPDATE profile SET points = points + ?, lifetime_points = lifetime_points + ? WHERE user_id = ?`).run(TAG_RETURN_BONUS, TAG_RETURN_BONUS, tagged.user_id);
    db.prepare(
      `UPDATE profile SET points = points + ?, lifetime_points = lifetime_points + ? WHERE user_id = ?`,
    ).run(row.points, row.points, row.user_id);
    return { kind: "created" } as const;
  })();
}

/** A catch the offline queue posts late counts on the day the server saved it, not the day it was landed. */
/** Marks the angler's catch released; it keeps its points, and its first release pays releaseBonus (a trophy, a guarder off its nest). Undefined when there is no such catch. */
export function releaseCatch(userId: string, requestId: string): { row: CatchRow; bonus: number } | undefined {
  return db.transaction(() => {
    const change = db.prepare(`UPDATE catch SET released = 1, released_at = ? WHERE user_id = ? AND request_id = ? AND released = 0`).run(new Date().toISOString(), userId, requestId);
    const row = findCatchByRequestId(userId, requestId);
    if (!row) return undefined;
    const species = fishById(row.species_id);
    // The season is the server's own, from when the catch was saved, not the one the client sent.
    const bonus = change.changes === 1 && species ? releaseBonus(species, row.weight, row.spot, lakeSeason(new Date(row.created_at))) : 0;
    if (bonus) {
      db.prepare(`UPDATE profile SET points = points + ?, lifetime_points = lifetime_points + ? WHERE user_id = ?`).run(bonus, bonus, userId);
    }
    return { row, bonus };
  })();
}

/** The angler's catches filed under any of these local days and saved no earlier than `savedFrom`, so a fish posted
 * late can't be filed back into an earlier week. */
export function listCatchesOnDays(userId: string, days: readonly string[], savedFrom: string): CatchRow[] {
  return db
    .prepare(`SELECT * FROM catch WHERE user_id = ? AND created_at >= ? AND day IN (${days.map(() => "?").join(", ")})`)
    .all(userId, savedFrom, ...days) as CatchRow[];
}

export function listWeeklyClaims(userId: string, week: string): string[] {
  return (db.prepare(`SELECT challenge_id FROM weekly_challenge_claim WHERE user_id = ? AND week = ?`).all(userId, week) as { challenge_id: string }[]).map((row) => row.challenge_id);
}

/** Pays a week's goal once; false when it was already claimed. */
export function claimWeeklyChallenge(userId: string, week: string, challengeId: string, reward: number): boolean {
  return db.transaction(() => {
    const claim = db
      .prepare(`INSERT OR IGNORE INTO weekly_challenge_claim (user_id, week, challenge_id, claimed_at) VALUES (?, ?, ?, ?)`)
      .run(userId, week, challengeId, new Date().toISOString());
    if (claim.changes !== 1) return false;
    db.prepare(`UPDATE profile SET points = points + ?, lifetime_points = lifetime_points + ? WHERE user_id = ?`).run(reward, reward, userId);
    return true;
  })();
}

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

/**
 * Pays a request's reward once; the claim that clears the day's board of `boardSize` requests also pays `boardBonus`.
 * Null when the request was already claimed, else the board bonus paid (0 when the board isn't clear yet).
 */
export function claimDailyRequest(userId: string, local: DayWindow, dailyRequestId: string, reward: number, boardSize = Infinity, boardBonus = 0): number | null {
  return db.transaction(() => {
    const claim = db
      .prepare(
        `INSERT OR IGNORE INTO daily_request_claim (user_id, day, daily_request_id, window_from, window_to, claimed_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(userId, local.day, dailyRequestId, local.from, local.to, new Date().toISOString());
    if (claim.changes !== 1) return null;
    const claims = db.prepare(`SELECT COUNT(*) as n FROM daily_request_claim WHERE user_id = ? AND day = ?`).get(userId, local.day) as { n: number };
    const bonus = claims.n >= boardSize ? boardBonus : 0;
    db.prepare(
      `UPDATE profile SET points = points + ?, lifetime_points = lifetime_points + ? WHERE user_id = ?`,
    ).run(reward + bonus, reward + bonus, userId);
    return bonus;
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

/** Takes the points for something bought at the shack, never below zero. */
export function spendPoints(userId: string, cost: number) {
  const result = db.prepare(`UPDATE profile SET points = points - ? WHERE user_id = ? AND points >= ?`).run(cost, userId, cost);
  if (result.changes !== 1) throw new Error("purchase failed");
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
    released: row.released === 1,
    requestId: row.request_id,
    tagged: !!row.tagged_from,
    bonuses: row.bonuses == null ? null : (row.bonuses ? (row.bonuses.split(",") as BonusId[]) : []),
    createdAt: row.created_at,
  };
}
