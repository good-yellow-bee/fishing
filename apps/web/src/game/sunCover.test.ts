import { describe, expect, it } from "vitest";
import { CLOUD_SHADE_WAIT, CLOUD_SHARE, CLOUD_SLOT_MS, cloudOverSun, cloudShadeWaitMul } from "./sunCover";

const slots = Array.from({ length: 2000 }, (_, n) => n * CLOUD_SLOT_MS + 1_000);

describe("a cloud over the sun", () => {
  it("covers the sun in about a quarter of a sunny day's spells, the same all through a spell", () => {
    const covered = slots.filter((at) => cloudOverSun("partly-cloudy", "day", at)).length / slots.length;
    expect(covered).toBeGreaterThan(CLOUD_SHARE - 0.05);
    expect(covered).toBeLessThan(CLOUD_SHARE + 0.05);
    for (const at of slots.slice(0, 200)) expect(cloudOverSun("partly-cloudy", "day", at + CLOUD_SLOT_MS - 2_000)).toBe(cloudOverSun("partly-cloudy", "day", at));
  });

  it("only passes over the sun by day on a clear or partly cloudy day", () => {
    const at = slots.find((ms) => cloudOverSun("partly-cloudy", "day", ms))!;
    expect(cloudOverSun("clear", "day", at)).toBe(true);
    expect(cloudOverSun("fog", "day", at)).toBe(false);
    expect(cloudOverSun("rain", "day", at)).toBe(false);
    expect(cloudOverSun("overcast", "day", at)).toBe(false);
    expect(cloudOverSun("partly-cloudy", "dusk", at)).toBe(false);
    expect(cloudOverSun(undefined, "day", at)).toBe(false);
  });

  it("brings the fish up into the shallows, not the deep banks", () => {
    const at = slots.find((ms) => cloudOverSun("partly-cloudy", "day", ms))!;
    const clear = slots.find((ms) => !cloudOverSun("partly-cloudy", "day", ms))!;
    for (const spot of ["dock", "reeds", "point", "inlet"] as const) expect(cloudShadeWaitMul(spot, "partly-cloudy", "day", at)).toBe(CLOUD_SHADE_WAIT);
    for (const spot of ["dropoff", "open"] as const) expect(cloudShadeWaitMul(spot, "partly-cloudy", "day", at)).toBe(1);
    expect(cloudShadeWaitMul("reeds", "partly-cloudy", "day", clear)).toBe(1);
  });
});
