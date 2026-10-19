import { describe, expect, it } from "vitest";
import { duckweedCast, inDuckweed } from "./duckweedCast";
import { DUCKWEED_BEDS, MAX_PUSH } from "./scene/duckweedBeds";

const CALM = { x: 0, z: 0 };

describe("inDuckweed", () => {
  const bed = DUCKWEED_BEDS[0]!;

  it("lands in a mat's middle in summer and fall, not at a ragged rim or out on the open water", () => {
    expect(inDuckweed("summer", CALM, bed.x, bed.z)).toBe(true);
    expect(inDuckweed("fall", undefined, bed.x, bed.z)).toBe(true);
    expect(inDuckweed("summer", CALM, bed.x + bed.radius * 0.9, bed.z)).toBe(false);
    expect(inDuckweed("summer", CALM, 0, -2)).toBe(false);
  });

  it("finds no duckweed in winter or spring, or without a season", () => {
    expect(inDuckweed("winter", CALM, bed.x, bed.z)).toBe(false);
    expect(inDuckweed("spring", CALM, bed.x, bed.z)).toBe(false);
    expect(inDuckweed(undefined, CALM, bed.x, bed.z)).toBe(false);
  });

  it("follows a bed the breeze has pushed downwind", () => {
    // A strong east wind pushes every bed its full MAX_PUSH east.
    const wind = { x: 0.13, z: 0 };
    const reach = bed.radius * 0.75 * 1.5;
    expect(inDuckweed("summer", wind, bed.x + MAX_PUSH + reach * 0.95, bed.z)).toBe(true);
    expect(inDuckweed("summer", wind, bed.x - (reach - MAX_PUSH) * 1.05, bed.z)).toBe(false);
  });
});

describe("duckweedCast", () => {
  it("rides a popper over the mat and beards anything else with weed", () => {
    expect(duckweedCast(true, true)).toBe("topwater");
    expect(duckweedCast(true, false)).toBe("fouled");
    expect(duckweedCast(false, true)).toBeNull();
  });
});
