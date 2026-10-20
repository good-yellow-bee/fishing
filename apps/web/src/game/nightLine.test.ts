import { describe, expect, it } from "vitest";
import { skyAt, type Sky } from "@stillwater/shared";
import { NIGHT_LINE_ODDS, NIGHT_LINE_SOAK_MS, WORM_LINE_ODDS, NIGHT_LINE_STALE_MS, nightLineCatch, nightLineKinds, nightLineReadyAt, nightLineState, nightSkyFor } from "./nightLine";

const strong = { strength: 10, accuracy: 10, patience: 5 };
const at = (day: number, hour: number) => new Date(2026, 9, day, hour).getTime();
const line = { spot: "dropoff" as const, setAt: at(20, 20) };
const ready = nightLineReadyAt(line.setAt);

describe("a night line", () => {
  it("comes in once its night is out, never before six hours, and after two days the bait is long gone", () => {
    expect(nightLineReadyAt(at(20, 20))).toBe(at(21, 5));
    // Set in the morning, it waits for the night to come and go.
    expect(nightLineReadyAt(at(20, 8))).toBe(at(21, 5));
    // Set in the small hours, the night under way ends at dawn, but six hours still have to pass.
    expect(nightLineReadyAt(at(21, 2))).toBe(at(21, 2) + NIGHT_LINE_SOAK_MS);
    expect(nightLineState(line, ready - 1)).toBe("soaking");
    expect(nightLineState(line, ready)).toBe("ready");
    expect(nightLineState(line, line.setAt + NIGHT_LINE_STALE_MS + 1)).toBe("stale");
  });

  it("holds one of the bank's night feeders the angler could land, or nothing", () => {
    const kinds = nightLineKinds("dropoff", strong).map((fish) => fish.id);
    expect(kinds).toEqual(["catfish", "burbot"]);
    const fish = nightLineCatch(line, ready, strong, 5, () => 0)!;
    expect(kinds).toContain(fish.species.id);
    expect(fish.weight).toBeGreaterThanOrEqual(fish.species.minWeight);
    expect(nightLineCatch(line, line.setAt + NIGHT_LINE_STALE_MS + 1, strong, 5, () => 0)).toBeNull();
    expect(nightLineCatch(line, ready - 1, strong, 5, () => 0)).toBeNull();
  });

  it("reads the sky over the night it stood through, so a wet night fills more lines than a clear one", () => {
    expect(nightSkyFor(at(20, 19))).toBe(skyAt(new Date(2026, 9, 20, 23)));
    expect(nightSkyFor(at(21, 2))).toBe(skyAt(new Date(2026, 9, 20, 23)));
    // The first rain night and clear night of the season, found from the forecast itself.
    const nightOf = (sky: Sky) => [...Array(120).keys()].map((day) => at(day + 1, 20)).find((setAt) => nightSkyFor(setAt) === sky)!;
    const roll = () => (NIGHT_LINE_ODDS.clear + NIGHT_LINE_ODDS.rain) / 2;
    const check = (setAt: number) => nightLineCatch({ spot: "dropoff", setAt }, nightLineReadyAt(setAt), strong, 5, roll);
    expect(check(nightOf("rain"))).not.toBeNull();
    expect(check(nightOf("clear"))).toBeNull();
  });

  it("draws fewer night feeders to a worm than to a shiner", () => {
    const odds = NIGHT_LINE_ODDS[nightSkyFor(line.setAt)];
    const roll = () => odds * (1 + WORM_LINE_ODDS) / 2;
    expect(nightLineCatch(line, ready, strong, 5, roll)).not.toBeNull();
    expect(nightLineCatch({ ...line, bait: "worm" }, ready, strong, 5, roll)).toBeNull();
  });

  it("catches nothing a new angler could not land, and nothing at the inlet", () => {
    expect(nightLineKinds("dropoff", { strength: 1, accuracy: 1 })).toEqual([]);
    expect(nightLineKinds("inlet", strong)).toEqual([]);
  });
});
