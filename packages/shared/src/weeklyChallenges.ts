import { weekStart } from "./board.ts";
import { fishById } from "./fish.ts";
import { isTrophyWeight } from "./guide.ts";
import { weeklyFish } from "./weeklyFish.ts";

/** One week-long goal on the shack board; `kind` says what counts toward `goal`. */
export type WeeklyChallenge = {
  id: string;
  kind: "weeklyFish" | "banks" | "kinds" | "trophy" | "clean";
  goal: number;
  reward: number;
};

/** A catch as the week's goals read it. */
export type WeeklyCatch = { speciesId: string; spot: string; weight: number; clean: boolean };

const CHALLENGES: readonly WeeklyChallenge[] = [
  { id: "week-fish", kind: "weeklyFish", goal: 5, reward: 90 },
  { id: "week-banks", kind: "banks", goal: 4, reward: 70 },
  { id: "week-kinds", kind: "kinds", goal: 6, reward: 80 },
  { id: "week-trophy", kind: "trophy", goal: 1, reward: 120 },
  { id: "week-clean", kind: "clean", goal: 10, reward: 60 },
];

/** How many of the week's goals the board shows. */
export const WEEKLY_CHALLENGE_COUNT = 3;

/** The local Monday of the week holding `day` (YYYY-MM-DD), which names the week. */
export function weekOf(day: string): string {
  return weekStart(new Date(`${day}T12:00:00.000Z`)).toISOString().slice(0, 10);
}

/** The seven local days of the week that starts on `monday`. */
export function weekDays(monday: string): string[] {
  const start = Date.parse(`${monday}T12:00:00.000Z`);
  return Array.from({ length: 7 }, (_, i) => new Date(start + i * 86_400_000).toISOString().slice(0, 10));
}

/** The week's fish for the week starting `monday`. */
export function weekFishFor(monday: string) {
  return weeklyFish(new Date(`${monday}T12:00:00.000Z`));
}

/** The week's goals: the same three for every angler that week, picked by its Monday with no stored state. */
export function weeklyChallengesFor(monday: string): WeeklyChallenge[] {
  const weeks = Math.round(Date.parse(`${monday}T12:00:00.000Z`) / (7 * 86_400_000));
  const skip = ((weeks % CHALLENGES.length) + CHALLENGES.length) % CHALLENGES.length;
  return Array.from({ length: WEEKLY_CHALLENGE_COUNT }, (_, i) => CHALLENGES[(skip + i * 2) % CHALLENGES.length]!);
}

/** How far the week's catches go toward a goal, up to the goal. */
export function weeklyProgress(challenge: WeeklyChallenge, catches: readonly WeeklyCatch[], monday: string): number {
  const count = (() => {
    switch (challenge.kind) {
      case "weeklyFish":
        return catches.filter((row) => row.speciesId === weekFishFor(monday).id).length;
      case "banks":
        return new Set(catches.map((row) => row.spot)).size;
      case "kinds":
        return new Set(catches.map((row) => row.speciesId)).size;
      case "trophy":
        return catches.filter((row) => {
          const species = fishById(row.speciesId);
          return species !== undefined && isTrophyWeight(species, row.weight);
        }).length;
      case "clean":
        return catches.filter((row) => row.clean).length;
    }
  })();
  return Math.min(challenge.goal, count);
}
