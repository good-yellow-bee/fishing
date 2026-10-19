import { describe, expect, it } from "vitest";
import { EWES } from "./sheepFlock";
import { COWS } from "./cowGraze";
import { hillFront } from "./farHills";
import { FARM_AT } from "./farmstead";
import { FIELDS } from "./hayField";
import { ORCHARD_EAST, ORCHARD_WEST, TREE_HEIGHT, orchardLook, orchardTrees } from "./orchardRows";
import { CAR_HEIGHT, TRACK_Y } from "./trainLine";

describe("the orchard", () => {
  it("flowers in spring, greens in summer, fruits in the fall and stands bare in winter", () => {
    expect(orchardLook("spring").dots).not.toBeNull();
    expect(orchardLook("summer")).toEqual({ crown: "#5f8f4a", dots: null });
    expect(orchardLook("fall").dots).toBe("#c0392b");
    expect(orchardLook("winter")).toEqual({ crown: null, dots: null });
  });

  it("stands in front of the hills' face, above the railway and below the farm and its cows", () => {
    const trees = orchardTrees();
    expect(trees).toHaveLength(10);
    trees.forEach((tree) => {
      expect(tree.z).toBeGreaterThan(hillFront(tree.x, tree.y)!);
      expect(tree.z).toBeGreaterThan(hillFront(tree.x, tree.y + TREE_HEIGHT * tree.size)!);
      expect(tree.y).toBeGreaterThan(TRACK_Y + CAR_HEIGHT + 0.3);
      expect(tree.y + TREE_HEIGHT * tree.size).toBeLessThan(FARM_AT.y);
      COWS.forEach((cow) => expect(tree.y + TREE_HEIGHT * tree.size).toBeLessThan(cow.y));
    });
  });

  it("keeps west of the hay fields and the sheep", () => {
    const west = Math.min(...FIELDS.map((field) => field.x - field.halfX));
    expect(ORCHARD_EAST).toBeLessThan(west - 0.5);
    EWES.forEach((ewe) => expect(ewe.x).toBeGreaterThan(ORCHARD_EAST + 0.5));
    expect(ORCHARD_WEST).toBeGreaterThan(-8);
  });
});
