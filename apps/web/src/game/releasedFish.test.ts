import { beforeEach, describe, expect, it, vi } from "vitest";
import { FISH } from "@stillwater/shared";
import { castForReleased, grownWeight, loadReleased, RECAPTURE_GROWTH_CAP, RECAPTURE_ODDS, RELEASED_KEEP, RELEASED_KEY, rememberReleased } from "./releasedFish";

const pike = FISH.find((fish) => fish.id === "pike")!;
const common = FISH.find((fish) => fish.rarity === "common")!;
const day = (date: number, hour = 12) => new Date(2026, 9, date, hour).getTime();

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", memoryStorage());
});

describe("fish let go from the lake", () => {
  it("remembers the bigger kinds, newest first and only so many, but never a small common fish", () => {
    rememberReleased(common, 0.4, "dock", day(1));
    expect(loadReleased()).toEqual([]);
    for (let n = 0; n < RELEASED_KEEP + 2; n++) rememberReleased(pike, 3 + n, "reeds", day(1 + n));
    const kept = loadReleased();
    expect(kept).toHaveLength(RELEASED_KEEP);
    expect(kept[0]).toEqual({ species: "pike", weight: 3 + RELEASED_KEEP + 1, spot: "reeds", at: day(RELEASED_KEEP + 2) });
  });

  it("reads a broken store as nothing remembered", () => {
    localStorage.setItem(RELEASED_KEY, "{not json");
    expect(loadReleased()).toEqual([]);
    localStorage.setItem(RELEASED_KEY, JSON.stringify([{ species: "pike" }, null, { species: "pike", weight: 4, spot: "dock", at: 1 }]));
    expect(loadReleased()).toEqual([{ species: "pike", weight: 4, spot: "dock", at: 1 }]);
  });

  it("grows a fish a little each week it is back, up to a cap and the kind's top weight", () => {
    expect(grownWeight(pike, 5, 7)).toBeGreaterThan(5);
    expect(grownWeight(pike, 5, 14)).toBeGreaterThan(grownWeight(pike, 5, 7));
    expect(grownWeight(pike, 5, 3650)).toBe(Math.round(5 * (1 + RECAPTURE_GROWTH_CAP) * 100) / 100);
    expect(grownWeight(pike, pike.maxWeight, 70)).toBe(pike.maxWeight);
  });

  it("brings one back only at its bank, on a later day, on a lucky cast, and forgets it once it bites", () => {
    const list = [{ species: "pike", weight: 6, spot: "reeds" as const, at: day(4, 9) }];
    expect(castForReleased(list, "dock", day(11), 0).fish).toBeNull();
    expect(castForReleased(list, "reeds", day(4, 18), 0).fish).toBeNull();
    expect(castForReleased(list, "reeds", day(11), RECAPTURE_ODDS).fish).toBeNull();
    const back = castForReleased(list, "reeds", day(11), RECAPTURE_ODDS / 2);
    expect(back.fish).toEqual({ species: pike, weight: grownWeight(pike, 6, 7), was: 6, at: day(4, 9) });
    expect(back.next).toEqual([]);
  });
});
