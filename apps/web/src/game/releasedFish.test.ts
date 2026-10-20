import { beforeEach, describe, expect, it, vi } from "vitest";
import { FISH } from "@stillwater/shared";
import { LODGE_LOST_ODDS, LODGE_RECAPTURE_ODDS, type LodgeLost, type LodgeRelease } from "@stillwater/shared";
import { castForLodgeLost, castForLodgeTag, castForReleased, grownWeight, loadReleased, RECAPTURE_GROWTH_CAP, RECAPTURE_ODDS, RELEASED_KEEP, RELEASED_KEY, rememberReleased } from "./releasedFish";

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

  it("remembers the lure a fish was caught on, and it won't take that lure again, though another one may", () => {
    rememberReleased(pike, 6, "reeds", day(4, 9), "Mepps spinner");
    const list = loadReleased();
    expect(list[0]?.lure).toBe("Mepps spinner");
    expect(castForReleased(list, "reeds", day(11), 0, "Mepps spinner").fish).toBeNull();
    expect(castForReleased(list, "reeds", day(11), 0, "Silver spoon").fish?.species).toBe(pike);
    // One let go before lures were remembered shies from none.
    expect(castForReleased([{ species: "pike", weight: 6, spot: "reeds", at: day(4, 9) }], "reeds", day(11), 0, "Mepps spinner").fish?.species).toBe(pike);
  });
});

describe("fish other anglers let go", () => {
  const now = Date.UTC(2026, 9, 20, 12);
  const strong = { strength: 10, accuracy: 10 };
  const list: LodgeRelease[] = [
    { catchId: "a", speciesId: "carp", weight: 6, spot: "reeds", at: "2026-10-20T08:00:00.000Z", by: "Mara" },
    { catchId: "b", speciesId: "carp", weight: 6, spot: "reeds", at: "2026-10-13T08:00:00.000Z", by: "Mara" },
  ];

  it("brings up one let go at this bank before today, grown, with its tag", () => {
    const back = castForLodgeTag(list, "reeds", now, LODGE_RECAPTURE_ODDS / 2, new Set(), strong);
    expect(back).toMatchObject({ was: 6, weight: grownWeight(back!.species, 6, 7), tag: { id: "b", by: "Mara" } });
    expect(back!.species.id).toBe("carp");
  });

  it("brings up none at another bank, on an unlucky roll, once landed this visit, or too strong for the angler's line", () => {
    expect(castForLodgeTag(list, "reeds", now, 0, new Set(), { strength: 1, accuracy: 1 })).toBeNull();
    expect(castForLodgeTag(list, "dock", now, 0, new Set(), strong)).toBeNull();
    expect(castForLodgeTag(list, "reeds", now, LODGE_RECAPTURE_ODDS, new Set(), strong)).toBeNull();
    expect(castForLodgeTag(list, "reeds", now, 0, new Set(["b"]), strong)).toBeNull();
  });
});

describe("trophies other anglers lost", () => {
  const strong = { strength: 10, accuracy: 10 };
  const list: LodgeLost[] = [{ id: "l1", speciesId: "pike", weight: 14.5, spot: "reeds", at: "2026-10-19T10:00:00.000Z", by: "Mara" }];

  it("brings one up at its bank on a lucky cast, with who lost it, once a visit, and only if the line can hold it", () => {
    expect(castForLodgeLost(list, "dock", 0, new Set(), strong)).toBeNull();
    expect(castForLodgeLost(list, "reeds", LODGE_LOST_ODDS, new Set(), strong)).toBeNull();
    expect(castForLodgeLost(list, "reeds", 0, new Set(["l1"]), strong)).toBeNull();
    expect(castForLodgeLost(list, "reeds", 0, new Set(), { strength: 1, accuracy: 1 })).toBeNull();
    expect(castForLodgeLost(list, "reeds", 0, new Set(), strong)).toMatchObject({ species: pike, weight: 14.5, lost: { id: "l1", by: "Mara" } });
  });
});
