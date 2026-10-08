import { inLake, resolveCast, SPOT_IDS, spotAt, walkableAt, type SpotId } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import { BANK_STANDS, HOTSPOT_PERIOD_MS, HOTSPOT_RADIUS, hotspotAt, isHotspotCast } from "./hotspot";

const START = Date.UTC(2026, 9, 8, 12);
const PERIODS = 600;

function series(level: number) {
  return Array.from({ length: PERIODS }, (_, i) => hotspotAt(START + i * HOTSPOT_PERIOD_MS, level));
}

describe("bubbling hotspot", () => {
  it("holds one patch for the whole period", () => {
    const startsAt = Math.ceil(START / HOTSPOT_PERIOD_MS) * HOTSPOT_PERIOD_MS;
    const early = hotspotAt(startsAt, 3);
    expect(hotspotAt(startsAt + HOTSPOT_PERIOD_MS - 1, 3)).toEqual(early);
    expect(early.startsAt).toBe(startsAt);
  });

  it("puts every patch on open water a cast from that bank's stand reaches", () => {
    for (const level of [1, 3]) {
      const places = new Map<SpotId, Set<string>>();
      for (const hotspot of series(level)) {
        const stand = BANK_STANDS[hotspot.spot];
        const where = `level ${level} ${hotspot.spot} ${hotspot.x},${hotspot.z}`;
        expect(inLake(hotspot.x, hotspot.z), where).toBe(true);
        expect(walkableAt(hotspot.x, hotspot.z), where).toBe(false);
        expect(spotAt(hotspot.x, hotspot.z), where).toBe(hotspot.spot);
        expect(resolveCast(hotspot.x, hotspot.z, hotspot.spot, level, stand.x, stand.z), where).toEqual({ ok: true, spot: hotspot.spot });
        places.set(hotspot.spot, (places.get(hotspot.spot) ?? new Set()).add(`${hotspot.x},${hotspot.z}`));
      }
      for (const [spot, seen] of places) expect(seen.size, `level ${level} ${spot}`).toBeGreaterThanOrEqual(5);
    }
  });

  it("moves to another bank every period, and only to banks the angler can fish", () => {
    for (const [level, banks] of [[1, ["dock", "point", "reeds"]], [3, ["dock", "dropoff", "point", "reeds"]]] as const) {
      const all = series(level);
      for (let i = 1; i < all.length; i += 1) {
        const [before, after] = [all[i - 1]!, all[i]!];
        expect(after.spot, `level ${level} period ${i}`).not.toBe(before.spot);
        expect({ x: after.x, z: after.z, spot: after.spot }).not.toEqual({ x: before.x, z: before.z, spot: before.spot });
      }
      expect([...new Set(all.map((hotspot) => hotspot.spot))].sort()).toEqual(banks);
    }
  });

  it("rewards only a cast inside the patch, on its own bank", () => {
    const hotspot = hotspotAt(START, 3);
    expect(isHotspotCast(hotspot, hotspot.x, hotspot.z, hotspot.spot)).toBe(true);
    expect(isHotspotCast(hotspot, hotspot.x + HOTSPOT_RADIUS, hotspot.z, hotspot.spot)).toBe(true);
    expect(isHotspotCast(hotspot, hotspot.x + HOTSPOT_RADIUS + 0.01, hotspot.z, hotspot.spot)).toBe(false);
    const elsewhere = SPOT_IDS.find((spot) => spot !== hotspot.spot)!;
    expect(isHotspotCast(hotspot, hotspot.x, hotspot.z, elsewhere)).toBe(false);
    expect(isHotspotCast(null, hotspot.x, hotspot.z, hotspot.spot)).toBe(false);
  });
});
