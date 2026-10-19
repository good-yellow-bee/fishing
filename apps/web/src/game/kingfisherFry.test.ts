import { describe, expect, it } from "vitest";
import { FRY_REACH, overKingfisherFry } from "./kingfisherFry";
import { KINGFISHER_PERCH } from "./scene/kingfisherFlight";

describe("overKingfisherFry", () => {
  const { x, z } = KINGFISHER_PERCH;

  it("lands over the fry under the snag from dawn to dusk outside winter, as far as the kingfisher dives", () => {
    for (const hour of ["dawn", "day", "dusk"] as const) expect(overKingfisherFry("summer", hour, "clear", x, z)).toBe(true);
    expect(overKingfisherFry("spring", "day", "overcast", x + FRY_REACH * 0.95, z)).toBe(true);
    expect(overKingfisherFry("summer", "day", "clear", x, z + FRY_REACH * 1.1)).toBe(false);
  });

  it("finds no fry there when the kingfisher is not out: at night, in winter, in rain or fog, or without a season", () => {
    expect(overKingfisherFry("summer", "night", "clear", x, z)).toBe(false);
    expect(overKingfisherFry("winter", "day", "clear", x, z)).toBe(false);
    expect(overKingfisherFry("summer", "day", "rain", x, z)).toBe(false);
    expect(overKingfisherFry("fall", "day", "fog", x, z)).toBe(false);
    expect(overKingfisherFry(undefined, "day", "clear", x, z)).toBe(false);
  });
});
