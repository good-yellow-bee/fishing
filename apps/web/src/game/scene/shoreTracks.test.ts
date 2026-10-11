import { describe, expect, it } from "vitest";
import { spotAt, SPOT_IDS, TRACK_WINDOW_MS, type LodgeTrack } from "@stillwater/shared";
import { trackAnchor, trackLabel, trackOpacity, trackPulse } from "./shoreTracks";

describe("shore tracks", () => {
  it("keeps every anchor on its own bank's water and steady for the same catch", () => {
    for (const spot of SPOT_IDS) {
      for (let i = 0; i < 200; i += 1) {
        const anchor = trackAnchor({ id: `catch-${spot}-${i}`, spot });
        expect(spotAt(anchor.x, anchor.z)).toBe(spot);
      }
    }
    expect(trackAnchor({ id: "c1", spot: "reeds" })).toEqual(trackAnchor({ id: "c1", spot: "reeds" }));
  });

  it("spreads tracks out instead of stacking them", () => {
    const xs = new Set(Array.from({ length: 20 }, (_, i) => trackAnchor({ id: `c${i}`, spot: "dropoff" }).x.toFixed(2)));
    expect(xs.size).toBeGreaterThan(15);
  });

  it("fades over the hour and is gone after it", () => {
    expect(trackOpacity(0)).toBeCloseTo(0.36);
    expect(trackOpacity(TRACK_WINDOW_MS / 2)).toBeLessThan(trackOpacity(60_000));
    expect(trackOpacity(TRACK_WINDOW_MS / 2)).toBeGreaterThan(0);
    expect(trackOpacity(TRACK_WINDOW_MS)).toBe(0);
  });

  it("pulses each track out of step with the others", () => {
    expect(trackPulse("a", 1)).toBeGreaterThanOrEqual(0);
    expect(trackPulse("a", 1)).toBeLessThan(1);
    expect(trackPulse("a", 1)).not.toBeCloseTo(trackPulse("b", 1));
  });

  it("names the angler, fish, bank and age", () => {
    const track: LodgeTrack = { id: "c", displayName: "Mara", speciesId: "pike", spot: "reeds", createdAt: "2026-10-11T12:00:00.000Z" };
    expect(trackLabel(track, Date.parse("2026-10-11T12:12:30.000Z"))).toBe("Mara · northern pike · Reeds · 12 min ago");
    expect(trackLabel(track, Date.parse("2026-10-11T12:00:20.000Z"))).toContain("just now");
  });
});
