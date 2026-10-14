import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { AWAY_SEC, FLEE_SEC, KINGFISHER_PERCH, RETURN_SEC, SIT_MIN, kingfisherOut, kingfisherPose, stepKingfisher } from "./kingfisherFlight";

const NO_SPLASH = { x: 0, z: 0, at: Number.NEGATIVE_INFINITY };

describe("kingfisher", () => {
  it("is out by day outside winter, rain and fog", () => {
    expect(kingfisherOut("day", "clear", "summer")).toBe(true);
    expect(kingfisherOut("dawn", "overcast", "fall")).toBe(true);
    expect(kingfisherOut("night", "clear", "summer")).toBe(false);
    expect(kingfisherOut("day", "rain", "summer")).toBe(false);
    expect(kingfisherOut("day", "fog", "summer")).toBe(false);
    expect(kingfisherOut("day", "clear", "winter")).toBe(false);
  });

  it("sits on its snag over the water before the first dive", () => {
    expect(inLake(KINGFISHER_PERCH.x, KINGFISHER_PERCH.z)).toBe(true);
    const pose = kingfisherPose(SIT_MIN / 2);
    expect(pose).toMatchObject({ x: KINGFISHER_PERCH.x, y: KINGFISHER_PERCH.y, hidden: false, flying: 0 });
  });

  it("dives into the water now and then and comes back to the snag", () => {
    let under = 0;
    let rings = 0;
    for (let t = 0; t < 200; t += 0.05) {
      const pose = kingfisherPose(t);
      if (pose.hidden) {
        under += 1;
        expect(inLake(pose.x, pose.z)).toBe(true);
      }
      if (pose.ring >= 0) rings += 1;
      expect(pose.y).toBeLessThanOrEqual(KINGFISHER_PERCH.y + 0.5);
    }
    expect(under).toBeGreaterThan(0);
    expect(rings).toBeGreaterThan(0);
  });

  it("flies off from a close cast, stays away, and comes back", () => {
    const near = { x: KINGFISHER_PERCH.x - 2, z: KINGFISHER_PERCH.z, at: 10 };
    expect(stepKingfisher({ mode: "perched" }, 10.2, near)).toEqual({ mode: "fled", since: 10.2 });
    expect(stepKingfisher({ mode: "perched" }, 12, near)).toEqual({ mode: "perched" });
    const far = { x: -15, z: 0, at: 10 };
    expect(stepKingfisher({ mode: "perched" }, 10.2, far)).toEqual({ mode: "perched" });
    const fled = { mode: "fled" as const, since: 0 };
    expect(kingfisherPose(FLEE_SEC + 1, fled).hidden).toBe(true);
    expect(stepKingfisher(fled, FLEE_SEC + AWAY_SEC + RETURN_SEC, NO_SPLASH)).toEqual({ mode: "perched" });
    const landing = kingfisherPose(FLEE_SEC + AWAY_SEC + RETURN_SEC - 0.001, fled);
    expect(landing.x).toBeCloseTo(KINGFISHER_PERCH.x, 1);
  });

  it("keeps sitting for reduced motion", () => {
    expect(kingfisherPose(9999, { mode: "perched" }, true)).toMatchObject({ x: KINGFISHER_PERCH.x, hidden: false });
  });
});
