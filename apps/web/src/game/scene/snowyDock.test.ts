import { describe, expect, it } from "vitest";
import { DOCK_PLANKS } from "@stillwater/shared";
import { DOCK_POST_CAPS, DOCK_PRINTS, dockSnowy } from "./snowyDock";

describe("snowy dock", () => {
  it("only in winter", () => {
    expect(dockSnowy("winter")).toBe(true);
    expect(dockSnowy("fall")).toBe(false);
  });

  it("caps four posts on each bridge span, above the planks", () => {
    expect(DOCK_POST_CAPS).toHaveLength(8);
    for (const cap of DOCK_POST_CAPS) expect(cap.y).toBeGreaterThan(DOCK_PLANKS.top);
  });

  it("keeps the footprints on the planks", () => {
    for (const print of DOCK_PRINTS) {
      expect(print.x).toBeGreaterThan(DOCK_PLANKS.minX);
      expect(print.x).toBeLessThan(DOCK_PLANKS.maxX);
      expect(print.z).toBeGreaterThan(DOCK_PLANKS.minZ);
      expect(print.z).toBeLessThan(DOCK_PLANKS.maxZ);
    }
  });
});
