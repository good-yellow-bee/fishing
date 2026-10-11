import { anglerLevel } from "./progression.ts";

export const BOARD_LIMIT = 100;

export type BoardPeriod = "all" | "week";

export const BOARD_PERIODS: readonly BoardPeriod[] = ["all", "week"];

export function isBoardPeriod(value: unknown): value is BoardPeriod {
  return value === "all" || value === "week";
}

/** The weekly race restarts at Monday 00:00 UTC, the same instant for the whole lodge. */
export function weekStart(at: Date = new Date()): Date {
  const day = at.getUTCDay();
  const back = (day + 6) % 7;
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate() - back));
}

export type BoardStat = {
  userId: string;
  displayName: string;
  lifetimePoints: number;
  /** What the board ranks on: lifetime points all-time, or points landed since Monday for the week. */
  score: number;
  heaviest: number;
  species: number;
  catches: number;
};

export type BoardEntry = BoardStat & {
  rank: number;
  level: number;
};

export type BoardView = {
  period: BoardPeriod;
  entries: BoardEntry[];
  you: BoardEntry | null;
};

export function rankBoard(stats: BoardStat[]): BoardEntry[] {
  const sorted = [...stats].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.heaviest !== a.heaviest) return b.heaviest - a.heaviest;
    const byName = a.displayName.localeCompare(b.displayName);
    if (byName !== 0) return byName;
    return a.userId.localeCompare(b.userId);
  });
  return sorted.map((row, index) => ({
    ...row,
    rank: index + 1,
    level: anglerLevel(row.lifetimePoints),
  }));
}

export function boardView(stats: BoardStat[], userId: string, limit = BOARD_LIMIT, period: BoardPeriod = "all"): BoardView {
  const ranked = rankBoard(stats);
  return {
    period,
    entries: ranked.slice(0, limit),
    you: ranked.find((row) => row.userId === userId) ?? null,
  };
}

/** The heaviest of one species landed by anyone at the lodge; the earlier catch holds a tie. */
export type SpeciesRecord = {
  speciesId: string;
  weight: number;
  userId: string;
  holder: string;
  at: string;
};

export type LodgeStamp =
  | { kind: "first" }
  | { kind: "record"; previous: number; holder: string; yours: boolean };

/** Checked against the records read before this catch was saved. Null when the wall stands. */
export function lodgeStamp(records: readonly SpeciesRecord[], speciesId: string, weight: number, userId: string): LodgeStamp | null {
  const record = records.find((row) => row.speciesId === speciesId);
  if (!record) return { kind: "first" };
  if (weight <= record.weight) return null;
  return { kind: "record", previous: record.weight, holder: record.holder, yours: record.userId === userId };
}
