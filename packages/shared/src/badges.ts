import { fishById } from "./fish.ts";
import { isTrophyWeight } from "./guide.ts";
import type { LakeHour } from "./hour.ts";
import type { LakeSeason } from "./season.ts";
import type { SpotId } from "./types.ts";
import type { Sky } from "./weather.ts";

/**
 * One slice of an angler's whole catch history: how many fish of a species came in at one bank, hour and sky,
 * clean or not, and the heaviest of them. Hour and sky are null on catches saved before they were recorded.
 */
export type BadgeFactRow = {
  speciesId: string;
  spot: SpotId;
  hour: LakeHour | null;
  sky: Sky | null;
  /** Null on catches saved before seasons were recorded. */
  season: LakeSeason | null;
  clean: boolean;
  /** False on catches saved before golden fish. */
  golden: boolean;
  count: number;
  heaviest: number;
};

export type BadgeId = "four-banks" | "night-owl" | "rain-pike" | "clean-sweep" | "trophy" | "full-book" | "four-seasons" | "gold";

export type Badge = {
  id: BadgeId;
  label: string;
  blurb: string;
  need: number;
  /** How far along the angler is, before capping at `need`. */
  have: (facts: BadgeFactRow[]) => number;
};

function count(facts: BadgeFactRow[], keep: (row: BadgeFactRow) => boolean) {
  return facts.reduce((sum, row) => (keep(row) ? sum + row.count : sum), 0);
}

function distinct(facts: BadgeFactRow[], key: (row: BadgeFactRow) => string) {
  return new Set(facts.filter((row) => row.count > 0).map(key)).size;
}

/** The lake's species before the inlet opened. Full book keeps to these so nobody who earned it loses it. */
export const FIRST_BOOK: readonly string[] = [
  "golden-shiner",
  "bluegill",
  "perch",
  "brook-trout",
  "smallmouth-bass",
  "rainbow-trout",
  "carp",
  "pike",
  "catfish",
  "burbot",
  "salmon",
  "tiger-muskie",
  "sturgeon",
];

export const BADGES: readonly Badge[] = [
  {
    id: "four-banks",
    label: "Four banks",
    blurb: "Land a fish from four different banks.",
    // Four, not every bank: the badge predates the inlet and nobody who earned it should lose it.
    need: 4,
    have: (facts) => distinct(facts, (row) => row.spot),
  },
  {
    id: "night-owl",
    label: "Night owl",
    blurb: "Land five fish at night.",
    need: 5,
    have: (facts) => count(facts, (row) => row.hour === "night"),
  },
  {
    id: "rain-pike",
    label: "Rain pike",
    blurb: "Land a pike in the rain.",
    need: 1,
    have: (facts) => count(facts, (row) => row.speciesId === "pike" && row.sky === "rain"),
  },
  {
    id: "clean-sweep",
    label: "Clean sweep",
    blurb: "Win ten clean fights.",
    need: 10,
    have: (facts) => count(facts, (row) => row.clean),
  },
  {
    id: "trophy",
    label: "Trophy",
    blurb: "Land a fish at trophy weight.",
    need: 1,
    have: (facts) =>
      facts.some((row) => {
        const species = fishById(row.speciesId);
        return row.count > 0 && species !== undefined && isTrophyWeight(species, row.heaviest);
      })
        ? 1
        : 0,
  },
  {
    id: "full-book",
    label: "Full book",
    blurb: "Land all thirteen species of the lake's first book.",
    need: FIRST_BOOK.length,
    have: (facts) => distinct(facts.filter((row) => FIRST_BOOK.includes(row.speciesId)), (row) => row.speciesId),
  },
  {
    id: "four-seasons",
    label: "Four seasons",
    blurb: "Land a fish in spring, summer, fall and winter.",
    need: 4,
    have: (facts) => distinct(facts.filter((row) => row.season !== null), (row) => row.season!),
  },
  {
    id: "gold",
    label: "Gold",
    blurb: "Land a golden fish.",
    need: 1,
    have: (facts) => count(facts, (row) => row.golden),
  },
];

export type BadgeProgress = { id: BadgeId; have: number; need: number; earned: boolean };

export function badgeProgress(facts: BadgeFactRow[]): BadgeProgress[] {
  return BADGES.map((badge) => {
    const have = Math.min(badge.need, badge.have(facts));
    return { id: badge.id, have, need: badge.need, earned: have >= badge.need };
  });
}

export function badgeById(id: string): Badge | undefined {
  return BADGES.find((badge) => badge.id === id);
}

/** Badges in `now` that were not earned in `before`, in wall order. */
export function newlyEarned(before: readonly BadgeProgress[] | null, now: readonly BadgeProgress[]): BadgeId[] {
  if (!before) return [];
  const had = new Set(before.filter((badge) => badge.earned).map((badge) => badge.id));
  return now.filter((badge) => badge.earned && !had.has(badge.id)).map((badge) => badge.id);
}
