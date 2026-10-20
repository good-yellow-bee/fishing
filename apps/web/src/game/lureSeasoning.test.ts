import { describe, expect, it } from "vitest";
import { PLAY_LAKE_ID, type CatchEntry } from "@stillwater/shared";
import { lureCatchCount, lureTier, lureTierReachedBy } from "./lureSeasoning";

describe("seasoned lures", () => {
  it("climbs from Proven at 10 fish to Trusted at 30 and Lucky at 75", () => {
    expect(lureTier(9)).toBeNull();
    expect(lureTier(10)).toBe("proven");
    expect(lureTier(29)).toBe("proven");
    expect(lureTier(30)).toBe("trusted");
    expect(lureTier(75)).toBe("lucky");
    expect(lureTier(400)).toBe("lucky");
  });

  it("names the tier only the fish that reaches it takes it to", () => {
    expect(lureTierReachedBy(9)).toBe("proven");
    expect(lureTierReachedBy(10)).toBeNull();
    expect(lureTierReachedBy(74)).toBe("lucky");
  });

  it("counts the game's fish on a lure however its plural was spelled, and none logged at a real water", () => {
    const entry = (lure: string, spotId = PLAY_LAKE_ID) => ({ lure, spotId }) as CatchEntry;
    expect(lureCatchCount([entry("Spinnerbait"), entry("spinnerbaits "), entry("Popper"), entry(""), entry("Spinnerbait", "spot-home")], "Spinnerbait")).toBe(2);
  });
});
