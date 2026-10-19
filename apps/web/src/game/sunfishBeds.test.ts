import { describe, expect, it } from "vitest";
import { BED_REACH, onSunfishBed } from "./sunfishBeds";
import { sunfishNests } from "./scene/sunfishNests";

describe("onSunfishBed", () => {
  const nest = sunfishNests()[0]!;

  it("sits a lure on the beds in spring and summer, on a nest or just past its rim", () => {
    expect(onSunfishBed("spring", nest.x, nest.z)).toBe(true);
    expect(onSunfishBed("summer", nest.x + nest.radius + BED_REACH * 0.9, nest.z)).toBe(true);
    expect(onSunfishBed("summer", nest.x, nest.z - 4)).toBe(false);
  });

  it("finds no beds in fall or winter, or without a season", () => {
    expect(onSunfishBed("fall", nest.x, nest.z)).toBe(false);
    expect(onSunfishBed("winter", nest.x, nest.z)).toBe(false);
    expect(onSunfishBed(undefined, nest.x, nest.z)).toBe(false);
  });
});
