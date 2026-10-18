import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge } from "@stillwater/shared";
import { BIRDER_AT, WATCH_ROUND_SEC, birderAt, birderOut } from "./birdWatch";
import { walkPath } from "./dogWalk";
import { PAINTER_AT, UMBRELLA_AT } from "./pleinAir";
import { SEAT_AT } from "./headlampFishing";

function onLand({ x, z }: { x: number; z: number }) {
  const nx = x / LAKE_RX;
  const nz = (z - LAKE_CENTER_Z) / LAKE_RZ;
  return Math.hypot(nx, nz) > lakeEdge(Math.atan2(-nz, nx)) + 0.03;
}

describe("spring birdwatcher on the far bank", () => {
  it("is out at dawn and by day in spring unless it rains", () => {
    expect(birderOut("dawn", "clear", "spring")).toBe(true);
    expect(birderOut("day", "overcast", "spring")).toBe(true);
    expect(birderOut("day", "rain", "spring")).toBe(false);
    expect(birderOut("day", "clear", "summer")).toBe(false);
    expect(birderOut("dusk", "clear", "spring")).toBe(false);
  });

  it("stands on the grass clear of the path, the painter and the night angler's seat", () => {
    expect(onLand(BIRDER_AT)).toBe(true);
    const path = Array.from({ length: 81 }, (_, i) => walkPath(i / 80));
    expect(Math.min(...path.map((p) => Math.hypot(p.x - BIRDER_AT.x, p.z - BIRDER_AT.z)))).toBeGreaterThan(0.8);
    for (const spot of [PAINTER_AT, UMBRELLA_AT, SEAT_AT]) expect(Math.hypot(spot.x - BIRDER_AT.x, spot.z - BIRDER_AT.z)).toBeGreaterThan(1.5);
  });

  it("raises the glasses to scan, lowers them to write, all smoothly, never both at once", () => {
    let last = birderAt(0);
    let scanned = 0;
    let wrote = false;
    for (let t = 0.02; t < WATCH_ROUND_SEC; t += 0.02) {
      const pose = birderAt(t);
      expect(Math.abs(pose.glasses - last.glasses)).toBeLessThan(0.05);
      expect(Math.abs(pose.scan - last.scan)).toBeLessThan(0.02);
      expect(Math.abs(pose.note - last.note)).toBeLessThan(0.06);
      expect(pose.glasses > 0.05 && pose.note > 0.05).toBe(false);
      scanned = Math.max(scanned, Math.abs(pose.scan));
      if (pose.note > 0.95) wrote = true;
      last = pose;
    }
    expect(scanned).toBeGreaterThan(0.3);
    expect(wrote).toBe(true);
  });

  it("holds the glasses up, looking straight out, under reduced motion", () => {
    expect(birderAt(3, true)).toEqual({ glasses: 1, scan: 0, note: 0 });
  });
});
