import { describe, expect, it } from "vitest";
import { skyAt } from "@stillwater/shared";
import { NIGHT_LINE_ODDS, NIGHT_LINE_SOAK_MS, nightSkyFor, NIGHT_LINE_STALE_MS, nightLineCatch, nightLineKinds, nightLineState } from "./nightLine";

const strong = { strength: 10, accuracy: 10, patience: 5 };
const line = { spot: "dropoff" as const, setAt: 0 };

describe("a night line", () => {
  it("needs six hours out, and after two days the bait is long gone", () => {
    expect(nightLineState(line, NIGHT_LINE_SOAK_MS - 1)).toBe("soaking");
    expect(nightLineState(line, NIGHT_LINE_SOAK_MS)).toBe("ready");
    expect(nightLineState(line, NIGHT_LINE_STALE_MS + 1)).toBe("stale");
  });

  it("holds one of the bank's night feeders the angler could land, or nothing", () => {
    const kinds = nightLineKinds("dropoff", strong).map((fish) => fish.id);
    expect(kinds).toEqual(["catfish", "burbot"]);
    const fish = nightLineCatch(line, NIGHT_LINE_SOAK_MS, strong, 5, () => 0)!;
    expect(kinds).toContain(fish.species.id);
    expect(fish.weight).toBeGreaterThanOrEqual(fish.species.minWeight);
    expect(nightLineCatch(line, NIGHT_LINE_SOAK_MS, strong, 5, () => NIGHT_LINE_ODDS[nightSkyFor(line.setAt)])).toBeNull();
    expect(nightLineCatch(line, NIGHT_LINE_STALE_MS + 1, strong, 5, () => 0)).toBeNull();
    expect(nightLineCatch(line, NIGHT_LINE_SOAK_MS - 1, strong, 5, () => 0)).toBeNull();
  });

  it("reads the sky over the night it stood through, so a wet night fills more lines than a clear one", () => {
    const evening = new Date(2026, 9, 20, 19).getTime();
    const smallHours = new Date(2026, 9, 21, 2).getTime();
    expect(nightSkyFor(evening)).toBe(skyAt(new Date(2026, 9, 20, 23)));
    expect(nightSkyFor(smallHours)).toBe(skyAt(new Date(2026, 9, 20, 23)));
    expect(NIGHT_LINE_ODDS.rain).toBeGreaterThan(NIGHT_LINE_ODDS.clear);
  });

  it("catches nothing a new angler could not land, and nothing at the inlet", () => {
    expect(nightLineKinds("dropoff", { strength: 1, accuracy: 1 })).toEqual([]);
    expect(nightLineKinds("inlet", strong)).toEqual([]);
  });
});
