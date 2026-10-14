import { describe, expect, it } from "vitest";
import { PHOTO_LIMITS, PHOTO_TURN, lookDrag, lookIdle, lookZoom, lookedOffset, takeLook } from "./photoLook";

describe("photo mode's look", () => {
  it("gathers drags and zooms until a frame takes them", () => {
    lookDrag(10, -5);
    lookZoom(2);
    lookZoom(Number.NaN);
    const look = takeLook();
    expect(look.yaw).toBeCloseTo(-10 * PHOTO_TURN, 9);
    expect(look.pitch).toBeCloseTo(5 * PHOTO_TURN, 9);
    expect(look.zoom).toBe(2);
    expect(lookIdle(takeLook())).toBe(true);
  });

  it("turns around the target and keeps the distance", () => {
    const start = { x: 0, y: 4, z: 6 };
    const turned = lookedOffset(start, { yaw: Math.PI / 2, pitch: 0, zoom: 1 });
    expect(Math.hypot(turned.x, turned.y, turned.z)).toBeCloseTo(Math.hypot(4, 6), 6);
    expect(turned.y).toBeCloseTo(4, 6);
    expect(turned.x).toBeCloseTo(6, 6);
    expect(turned.z).toBeCloseTo(0, 6);
  });

  it("never tips under the lake or past straight down, nor zooms past the free camera's limits", () => {
    const start = { x: 0, y: 4, z: 6 };
    const low = lookedOffset(start, { yaw: 0, pitch: 3, zoom: 1 });
    expect(Math.acos(low.y / Math.hypot(low.x, low.y, low.z))).toBeCloseTo(PHOTO_LIMITS.maxPolar, 6);
    const high = lookedOffset(start, { yaw: 0, pitch: -3, zoom: 1 });
    expect(Math.acos(high.y / Math.hypot(high.x, high.y, high.z))).toBeCloseTo(PHOTO_LIMITS.minPolar, 6);
    const far = lookedOffset(start, { yaw: 0, pitch: 0, zoom: 10 });
    expect(Math.hypot(far.x, far.y, far.z)).toBeCloseTo(PHOTO_LIMITS.maxDistance, 6);
    const near = lookedOffset(start, { yaw: 0, pitch: 0, zoom: 0.01 });
    expect(Math.hypot(near.x, near.y, near.z)).toBeCloseTo(PHOTO_LIMITS.minDistance, 6);
  });
});
