import { describe, expect, it } from "vitest";
import { fishById } from "./fish.ts";
import { trophyWeight } from "./guide.ts";
import { studyProgress } from "./studies.ts";

describe("species studies", () => {
  it("counts a kind's banks, hours and trophy, and is done only with all three", () => {
    const perch = fishById("perch")!;
    const big = trophyWeight(perch);
    const rows = [
      { speciesId: "perch", spot: "dock" as const, hour: "dawn" as const, heaviest: 0.5 },
      { speciesId: "perch", spot: "reeds" as const, hour: "day" as const, heaviest: big },
      { speciesId: "perch", spot: "dropoff" as const, hour: "night" as const, heaviest: 0.6 },
    ];
    const [half] = studyProgress(rows);
    expect(half).toMatchObject({ speciesId: "perch", banks: { have: 3, need: perch.spots.length }, hours: { have: 3, need: 3 }, trophy: true, done: false });
    const [whole] = studyProgress([...rows, { speciesId: "perch", spot: "open" as const, hour: null, heaviest: 0.4 }]);
    expect(whole.done).toBe(true);
  });

  it("leaves out kinds it doesn't know", () => {
    expect(studyProgress([{ speciesId: "kraken", spot: "dock", hour: "day", heaviest: 9 }])).toEqual([]);
  });
});
