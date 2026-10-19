import { describe, expect, it } from "vitest";
import { MASTER_BONUS, masteryBonus, masteryTier, nextMastery, tierReachedBy } from "./mastery.ts";

describe("species mastery", () => {
  it("climbs Known at 5, Skilled at 15 and Master at 40 fish of a kind", () => {
    expect(masteryTier(4)).toBeNull();
    expect(masteryTier(5)?.id).toBe("known");
    expect(masteryTier(39)?.id).toBe("skilled");
    expect(masteryTier(40)?.id).toBe("master");
    expect(nextMastery(7)).toEqual({ tier: expect.objectContaining({ id: "skilled" }), toGo: 8 });
    expect(nextMastery(40)).toBeNull();
  });

  it("names the tier the crossing fish reaches, and pays the master bonus only once mastered", () => {
    expect(tierReachedBy(4)?.id).toBe("known");
    expect(tierReachedBy(5)).toBeNull();
    expect(tierReachedBy(39)?.id).toBe("master");
    expect(masteryBonus(39)).toBe(1);
    expect(masteryBonus(40)).toBe(MASTER_BONUS);
  });
});
