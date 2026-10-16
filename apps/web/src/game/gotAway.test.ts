import { describe, expect, it } from "vitest";
import { FISH } from "@stillwater/shared";
import { AGAIN_CASTS, AGAIN_ODDS, BIG_LURE_AGAIN_ODDS, castForGotAway, gotAwayAfterLoss } from "./gotAway";

const pike = FISH.find((fish) => fish.id === "pike")!;
const perch = FISH.find((fish) => fish.id === "perch")!;

describe("the one that got away", () => {
  it("remembers a lost fish that isn't a small common one", () => {
    expect(gotAwayAfterLoss(pike, 9.2, "reeds")).toEqual({ spot: "reeds", species: pike, weight: 9.2, casts: AGAIN_CASTS });
    expect(gotAwayAfterLoss(perch, 0.4, "dock")).toBeNull();
  });

  it("can bite again at its own bank, same fish and weight", () => {
    const lost = gotAwayAfterLoss(pike, 9.2, "reeds");
    expect(castForGotAway(lost, "reeds", AGAIN_ODDS - 0.01)).toEqual({ again: lost, next: null });
  });

  it("comes back sooner to a big lure", () => {
    const lost = gotAwayAfterLoss(pike, 9.2, "reeds");
    expect(castForGotAway(lost, "reeds", AGAIN_ODDS + 0.01).again).toBeNull();
    expect(castForGotAway(lost, "reeds", AGAIN_ODDS + 0.01, true).again).toBe(lost);
    expect(castForGotAway(lost, "reeds", BIG_LURE_AGAIN_ODDS, true).again).toBeNull();
  });

  it("waits through casts elsewhere or misses, then moves off", () => {
    let lost = gotAwayAfterLoss(pike, 9.2, "reeds");
    for (let cast = 1; cast < AGAIN_CASTS; cast += 1) {
      const result = castForGotAway(lost, cast % 2 ? "dock" : "reeds", 0.99);
      expect(result.again).toBeNull();
      lost = result.next;
      expect(lost?.casts).toBe(AGAIN_CASTS - cast);
    }
    expect(castForGotAway(lost, "reeds", 0.99)).toEqual({ again: null, next: null });
    expect(castForGotAway(null, "reeds", 0)).toEqual({ again: null, next: null });
  });
});
