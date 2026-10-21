import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { BASS_BEDS, FACE_OFF_EVERY, bassBedsOut, bassSpot, faceOff, straySpot } from "./bassBeds";
import { REEDS_STAND } from "./bankWalk";
import { sunfishNests } from "./sunfishNests";
import { TADPOLE_SCHOOLS } from "./tadpoleSchools";
import { waterDepth } from "./water";

describe("bass on their spring beds", () => {
  it("guard them in spring only", () => {
    expect(bassBedsOut("spring")).toBe(true);
    for (const season of ["summer", "fall", "winter"] as const) expect(bassBedsOut(season)).toBe(false);
  });

  it("fan wider beds than the sunfish, at the shallow shelf's edge by the Reeds and the dock, clear of the sunfish and tadpoles", () => {
    const nests = sunfishNests();
    for (const bed of BASS_BEDS) {
      expect(inLake(bed.x, bed.z)).toBe(true);
      for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        expect(waterDepth(bed.x + dx! * bed.radius, bed.z + dz! * bed.radius)).toBeLessThanOrEqual(0.4);
      }
      for (const nest of nests) {
        expect(bed.radius).toBeGreaterThan(nest.radius);
        expect(Math.hypot(nest.x - bed.x, nest.z - bed.z)).toBeGreaterThan(nest.radius + bed.radius + 0.3);
      }
      for (const school of TADPOLE_SCHOOLS) expect(Math.hypot(school.x - bed.x, school.z - bed.z)).toBeGreaterThan(1.2 + bed.radius);
    }
    const [reeds, dock] = BASS_BEDS;
    expect(Math.hypot(reeds!.x - REEDS_STAND.x, reeds!.z - REEDS_STAND.z)).toBeLessThan(4);
    expect(Math.min(...nests.map((nest) => Math.hypot(nest.x - dock!.x, nest.z - dock!.z)))).toBeLessThan(2);
  });

  it("keep the bass over its bed", () => {
    for (const bed of BASS_BEDS) {
      for (let t = 0; t < 90; t += 0.37) {
        const bass = bassSpot(bed, t);
        expect(Math.hypot(bass.x - bed.x, bass.z - bed.z)).toBeLessThan(bed.radius);
      }
    }
  });

  it("now and then turn the bass to face a straying sunfish, which turns tail, and then let it settle", () => {
    for (const bed of BASS_BEDS) {
      let peaks = 0;
      for (let t = 0; t < FACE_OFF_EVERY * 4; t += 0.05) {
        const off = faceOff(bed, t);
        const stray = straySpot(bed, t);
        if (!off) {
          expect(stray).toBeNull();
          continue;
        }
        expect(stray).not.toBeNull();
        expect(Math.hypot(stray!.x - bed.x, stray!.z - bed.z)).toBeGreaterThan(bed.radius);
        expect(inLake(stray!.x, stray!.z)).toBe(true);
        expect(waterDepth(stray!.x, stray!.z)).toBeGreaterThan(0.02);
        expect(waterDepth(stray!.x, stray!.z)).toBeLessThanOrEqual(0.45);
        if (Math.abs(off.u - 0.5) < 0.03) {
          peaks += 1;
          const bass = bassSpot(bed, t);
          expect(Math.cos(bass.yaw - Math.atan2(stray!.x - bass.x, stray!.z - bass.z))).toBeGreaterThan(0.95);
        }
        if (off.u > 0.65) expect(Math.cos(stray!.yaw - Math.atan2(stray!.x - bed.x, stray!.z - bed.z))).toBeGreaterThan(0.95);
      }
      expect(peaks).toBeGreaterThanOrEqual(4);
    }
    const [bed] = BASS_BEDS;
    const quiet = Array.from({ length: 200 }, (_, i) => i * 0.1).find((t) => !faceOff(bed!, t))!;
    const a = bassSpot(bed!, quiet);
    const b = bassSpot(bed!, quiet + 0.01);
    expect(Math.cos(a.yaw - Math.atan2(b.x - a.x, b.z - a.z))).toBeGreaterThan(0.99);
  });

  it("hold the bass still over the middle and send no sunfish for reduced motion", () => {
    for (const bed of BASS_BEDS) {
      expect(bassSpot(bed, 3, true)).toEqual(bassSpot(bed, 70, true));
      expect(bassSpot(bed, 3, true)).toMatchObject({ x: bed.x, z: bed.z });
      for (let t = 0; t < FACE_OFF_EVERY; t += 0.5) expect(straySpot(bed, t, true)).toBeNull();
    }
  });
});
