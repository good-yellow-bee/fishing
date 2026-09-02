import { anglerLevel } from "./progression.ts";

export const BOARD_LIMIT = 100;

export type BoardStat = {
  userId: string;
  displayName: string;
  lifetimePoints: number;
  heaviest: number;
  species: number;
  catches: number;
};

export type BoardEntry = BoardStat & {
  rank: number;
  level: number;
};

export type BoardView = {
  entries: BoardEntry[];
  you: BoardEntry | null;
};

export function rankBoard(stats: BoardStat[]): BoardEntry[] {
  const sorted = [...stats].sort((a, b) => {
    if (b.lifetimePoints !== a.lifetimePoints) return b.lifetimePoints - a.lifetimePoints;
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

export function boardView(stats: BoardStat[], userId: string, limit = BOARD_LIMIT): BoardView {
  const ranked = rankBoard(stats);
  return {
    entries: ranked.slice(0, limit),
    you: ranked.find((row) => row.userId === userId) ?? null,
  };
}
