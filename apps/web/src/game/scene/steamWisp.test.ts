import { DOCK_PLANKS, DOCK_STAND_X, DOCK_STAND_Z } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import { CUP_SPOT, STEAM_BLOBS, STEAM_LIFE_SEC, THERMOS_SPOT, steamBlob } from "./steamWisp";

describe("thermos steam", () => {
  it("stands on the planks, clear of where the angler stands", () => {
    for (const spot of [THERMOS_SPOT, CUP_SPOT]) {
      expect(spot.x).toBeGreaterThan(DOCK_PLANKS.minX);
      expect(spot.x).toBeLessThan(DOCK_PLANKS.maxX);
      expect(spot.z).toBeGreaterThan(DOCK_PLANKS.minZ);
      expect(spot.z).toBeLessThan(DOCK_PLANKS.maxZ);
      expect(Math.hypot(spot.x - DOCK_STAND_X, spot.z - DOCK_STAND_Z)).toBeGreaterThan(0.4);
    }
  });

  it("rises, swells and fades from the cup", () => {
    const young = steamBlob(0, 0.05 * STEAM_LIFE_SEC);
    const old = steamBlob(0, 0.85 * STEAM_LIFE_SEC);
    expect(old.y).toBeGreaterThan(young.y);
    expect(old.scale).toBeGreaterThan(young.scale);
    expect(steamBlob(0, 0.99 * STEAM_LIFE_SEC).opacity).toBeLessThan(0.05);
  });

  it("keeps some blobs showing at any moment", () => {
    for (const t of [0, 1.3, 7.7]) {
      const shown = Array.from({ length: STEAM_BLOBS }, (_, i) => steamBlob(i, t)).filter((b) => b.opacity > 0.2);
      expect(shown.length).toBeGreaterThan(2);
    }
  });
});
