import { afterEach, describe, expect, it } from "vitest";
import { DOCK_PLANKS, DOCK_STAND_X, DOCK_STAND_Z, inLake, stanceAt } from "@stillwater/shared";
import { aboard, ANCHOR, boat, boatPathPoint, MOORING, resetBoat, ROW_SECONDS, rowBack, rowOut, stepBoat, subscribeBoat } from "./boat";

afterEach(() => resetBoat());

function row(seconds: number) {
  let home = false;
  for (let t = 0; t < seconds; t += 0.05) home = stepBoat(0.05) || home;
  return home;
}

describe("rowboat", () => {
  it("rows out, anchors, and rows home, one leg at a time", () => {
    expect(boat.mode).toBe("moored");
    expect(rowBack()).toBe(false);
    expect(rowOut()).toBe(true);
    expect(rowOut()).toBe(false);
    expect(boat.mode).toBe("rowingOut");
    row(ROW_SECONDS / 2);
    expect(boat.mode).toBe("rowingOut");
    row(ROW_SECONDS);
    expect(boat.mode).toBe("anchored");
    expect(boat.u).toBe(1);
    expect(rowBack()).toBe(true);
    expect(row(ROW_SECONDS + 0.2)).toBe(true);
    expect(boat.mode).toBe("moored");
    expect(boat.u).toBe(0);
  });

  it("tells listeners each time the mode changes", () => {
    const seen: string[] = [];
    const stop = subscribeBoat(() => seen.push(boat.mode));
    rowOut();
    row(ROW_SECONDS + 0.2);
    rowBack();
    row(ROW_SECONDS + 0.2);
    stop();
    rowOut();
    expect(seen).toEqual(["rowingOut", "anchored", "rowingBack", "moored"]);
  });

  it("counts the angler aboard from the moment the boat is untied until it is tied up again", () => {
    expect(aboard("moored")).toBe(false);
    for (const mode of ["rowingOut", "anchored", "rowingBack"] as const) expect(aboard(mode)).toBe(true);
  });

  it("stays on the water and off the pier the whole row", () => {
    for (let u = 0; u <= 1.0001; u += 0.01) {
      const at = boatPathPoint(u);
      expect(inLake(at.x, at.z), `u ${u}`).toBe(true);
      const onPier = at.x >= DOCK_PLANKS.minX - 0.6 && at.x <= DOCK_PLANKS.maxX + 0.6 && at.z >= DOCK_PLANKS.minZ && at.z <= DOCK_PLANKS.maxZ;
      expect(onPier, `u ${u}`).toBe(false);
    }
    expect(boatPathPoint(0)).toMatchObject(MOORING);
    expect(boatPathPoint(1)).toMatchObject(ANCHOR);
  });

  it("puts the anchored angler on open water and moors within reach of the dock stand", () => {
    expect(stanceAt(ANCHOR.x, ANCHOR.z)).toBe("open");
    expect(Math.hypot(MOORING.x - DOCK_STAND_X, MOORING.z - DOCK_STAND_Z)).toBeLessThan(2.2);
    // Partway out there is no bank underfoot, so no casting from a moving boat.
    const mid = boatPathPoint(0.5);
    expect(stanceAt(mid.x, mid.z)).toBe("trail");
  });
});
