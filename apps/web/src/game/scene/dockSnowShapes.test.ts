import { DOCK_PLANKS } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import { BANK_POSTS } from "./bankWalk";
import { dockSnowShapes } from "./DockSnow";
import { bankPostShape } from "./LakeWorld";
import { DOCK_POST_CAPS } from "./snowyDock";

describe("baked dock snow and bank posts", () => {
  it("keeps every footprint on the snow and every cap on its post", () => {
    const { prints, caps } = dockSnowShapes();
    prints.computeBoundingBox();
    caps.computeBoundingBox();
    expect(prints.boundingBox!.min.y).toBeGreaterThan(DOCK_PLANKS.top);
    expect(prints.getAttribute("position").count).toBe(5 * 12 * 3);
    expect(caps.boundingBox!.min.y).toBeCloseTo(Math.min(...DOCK_POST_CAPS.map((cap) => cap.y)), 5);
    expect(caps.getAttribute("position").count).toBe(DOCK_POST_CAPS.length * 36);
  });

  it("puts one post at each bank stand", () => {
    const posts = bankPostShape();
    expect(posts.getAttribute("position").count).toBe(BANK_POSTS.length * 36);
    posts.computeBoundingBox();
    expect(posts.boundingBox!.min.y).toBeCloseTo(0, 5);
    expect(posts.boundingBox!.max.y).toBeCloseTo(1.04, 5);
  });
});
