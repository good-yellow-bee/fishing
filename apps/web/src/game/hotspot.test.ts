import { inLake, resolveCast, SPOT_IDS, spotAt, stanceAt, walkableAt, type SpotId } from "@stillwater/shared";
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

  it("puts every patch at least half on open water, all of it a cast from that bank's stand reaches", () => {
    for (const level of [1, 3]) {
      const patches = new Map(series(level).map((hotspot) => [`${hotspot.spot} ${hotspot.x},${hotspot.z}`, hotspot]));
      for (const [where, hotspot] of patches) {
        const stand = BANK_STANDS[hotspot.spot];
        expect(inLake(hotspot.x, hotspot.z), where).toBe(true);
        expect(walkableAt(hotspot.x, hotspot.z), where).toBe(false);
        expect(spotAt(hotspot.x, hotspot.z), where).toBe(hotspot.spot);
        let disc = 0;
        let open = 0;
        const unreachable: string[] = [];
        for (let dx = -HOTSPOT_RADIUS; dx <= HOTSPOT_RADIUS; dx += 0.1) {
          for (let dz = -HOTSPOT_RADIUS; dz <= HOTSPOT_RADIUS; dz += 0.1) {
            const [x, z] = [hotspot.x + dx, hotspot.z + dz];
            if (!isHotspotCast(hotspot, x, z, hotspot.spot)) continue;
            disc += 1;
            if (spotAt(x, z) !== hotspot.spot || walkableAt(x, z)) continue;
            open += 1;
            if (!resolveCast(x, z, hotspot.spot, level, stand.x, stand.z).ok) unreachable.push(`${x.toFixed(2)},${z.toFixed(2)}`);
          }
        }
        expect(unreachable, where).toEqual([]);
        // Finer than the placement grid, so a seam patch can measure a hair under half.
        expect(open / disc, where).toBeGreaterThanOrEqual(0.45);
      }
      for (const spot of new Set([...patches.values()].map((hotspot) => hotspot.spot))) {
        expect([...patches.values()].filter((hotspot) => hotspot.spot === spot).length, `level ${level} ${spot}`).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it("measures the drop-off from dry drop-off ground at the water's edge", () => {
    const edge = BANK_STANDS.dropoff;
    expect(walkableAt(edge.x, edge.z)).toBe(true);
    expect(inLake(edge.x, edge.z)).toBe(false);
    expect(stanceAt(edge.x, edge.z)).toBe("dropoff");
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
      const turns = banks.map((bank) => all.filter((hotspot) => hotspot.spot === bank).length);
      expect(Math.max(...turns) - Math.min(...turns), `level ${level} turns ${turns}`).toBeLessThanOrEqual(1);
    }
  });

  it("keeps the period's patch through a level-up unless the drop-off's turn opens, and never repeats a bank at the next move", () => {
    const [before, after] = [series(2), series(3)];
    for (let i = 0; i < PERIODS; i += 1) {
      if (after[i]!.spot !== "dropoff") expect(after[i], `period ${i}`).toEqual(before[i]);
      if (i + 1 < PERIODS) expect(after[i + 1]!.spot, `period ${i}`).not.toBe(before[i]!.spot);
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
