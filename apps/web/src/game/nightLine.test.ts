import { describe, expect, it, vi } from "vitest";
import { skyAt, type Sky } from "@stillwater/shared";
import { loadNightLine, saveNightLine, wormLineHour, NIGHT_LINE_ODDS, NIGHT_LINE_SOAK_MS, WORM_LINE_ODDS, NIGHT_LINE_STALE_MS, NIGHT_LINE_HOT_STALE_MS, NIGHT_LINE_COLD_SOAK_MS, NIGHT_LINE_COLD_STALE_MS, NIGHT_LINE_DAY_MS, nightLineCatch, nightLineKinds, nightLineNextChange, nightLineReadyAt, nightLineSeason, nightLineState, nightSkyFor } from "./nightLine";

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

  it("keeps the season it was set in: summer's line is ready by dawn but stripped within a day, winter's soaks twelve hours past dawn but keeps four days", () => {
    expect(nightLineSeason("summer")).toBe("summer");
    expect(nightLineSeason("winter")).toBe("winter");
    expect(nightLineSeason("fall")).toBeUndefined();
    expect(nightLineSeason(undefined)).toBeUndefined();
    const summer = { ...line, season: "summer" as const };
    expect(nightLineState(summer, at(21, 5))).toBe("ready");
    // Set in the small hours, only three hours have to pass.
    expect(nightLineState({ ...summer, setAt: at(21, 2) }, at(21, 5))).toBe("ready");
    expect(nightLineState({ ...line, setAt: at(21, 2) }, at(21, 5))).toBe("soaking");
    expect(nightLineState(summer, line.setAt + NIGHT_LINE_HOT_STALE_MS)).toBe("ready");
    expect(nightLineState(summer, line.setAt + NIGHT_LINE_HOT_STALE_MS + 1)).toBe("stale");
    // Set just after dawn, it still holds its bait till the evening after its night.
    const morning = { ...summer, setAt: at(20, 6) };
    expect(nightLineState(morning, at(21, 5) + NIGHT_LINE_DAY_MS)).toBe("ready");
    expect(nightLineState(morning, at(21, 5) + NIGHT_LINE_DAY_MS + 1)).toBe("stale");
    const winter = { ...line, season: "winter" as const };
    // Set at eight in the evening, it is not ready at dawn but at eight in the morning.
    expect(nightLineState(winter, at(21, 5))).toBe("soaking");
    expect(nightLineState(winter, line.setAt + NIGHT_LINE_COLD_SOAK_MS - 1)).toBe("soaking");
    expect(nightLineState(winter, at(21, 8))).toBe("ready");
    expect(nightLineState(winter, line.setAt + NIGHT_LINE_STALE_MS + 1)).toBe("ready");
    expect(nightLineState(winter, line.setAt + NIGHT_LINE_COLD_STALE_MS + 1)).toBe("stale");
  });

  it("knows when its state next changes: as it turns ready, then stale, then never", () => {
    for (const set of [at(20, 20), at(21, 2), at(20, 6)].flatMap((setAt) => [undefined, "summer" as const, "winter" as const].map((season) => ({ spot: "dropoff" as const, setAt, season })))) {
      const setAt = set.setAt;
      const turnsReady = nightLineNextChange(set, setAt)!;
      expect(nightLineState(set, turnsReady - 1)).toBe("soaking");
      expect(nightLineState(set, turnsReady)).toBe("ready");
      const turnsStale = nightLineNextChange(set, turnsReady)!;
      expect(nightLineState(set, turnsStale - 1)).toBe("ready");
      expect(nightLineState(set, turnsStale)).toBe("stale");
      expect(nightLineNextChange(set, turnsStale)).toBeNull();
    }
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

  it("goes out on a worm only as the light goes, and remembers which bait is out", () => {
    expect(wormLineHour("dusk")).toBe(true);
    expect(wormLineHour("day")).toBe(false);
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
    try {
      saveNightLine("ash", { ...line, bait: "worm" });
      expect(loadNightLine("ash")).toEqual({ ...line, bait: "worm" });
      saveNightLine("ash", { ...line, season: "winter" });
      expect(loadNightLine("ash")).toEqual({ ...line, season: "winter" });
      kept.set("stillwater.nightline.ash.v1", JSON.stringify({ ...line, season: "fall" }));
      expect(loadNightLine("ash")).toEqual(line);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("catches nothing a new angler could not land, and nothing at the inlet", () => {
    expect(nightLineKinds("dropoff", { strength: 1, accuracy: 1 })).toEqual([]);
    expect(nightLineKinds("inlet", strong)).toEqual([]);
  });
});
