import { describe, expect, it } from "vitest";
import type { Trip } from "@stillwater/shared";
import { isPlanned } from "./TripMonthHead";
import { PLAY_LAKE_ID } from "./playLake";

const trip = (spotId: string, date: string) => ({ id: "x", date, spotId, title: "", note: "" }) as Trip;

describe("round 70: what counts as planned", () => {
  it("is an outing still to come, or today's before its first fish", () => {
    expect(isPlanned(trip("own-lake", "2026-10-24"), "2026-10-18", 0)).toBe(true);
    expect(isPlanned(trip("own-lake", "2026-10-18"), "2026-10-18", 0)).toBe(true);
    expect(isPlanned(trip("own-lake", "2026-10-18"), "2026-10-18", 1)).toBe(false);
    expect(isPlanned(trip("own-lake", "2026-10-17"), "2026-10-18", 0)).toBe(false);
  });

  it("is never a round of the game, which is made by playing", () => {
    expect(isPlanned(trip(PLAY_LAKE_ID, "2026-10-18"), "2026-10-18", 0)).toBe(false);
  });
});
