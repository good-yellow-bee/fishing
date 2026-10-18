import { describe, expect, it } from "vitest";
import { hummingbirdAt, hummingbirdOut, ROUND_SEC } from "./hummingbirdVisits";
import { hummerShape } from "./Hummingbird";
import { flowersIn } from "./meadowFlowers";

const flowers = flowersIn("summer");

describe("hummingbird", () => {
  it("comes by day in summer, when it is dry and clear", () => {
    expect(hummingbirdOut("day", "clear", "summer")).toBe(true);
    expect(hummingbirdOut("day", "rain", "summer")).toBe(false);
    expect(hummingbirdOut("dusk", "clear", "summer")).toBe(false);
    expect(hummingbirdOut("day", "clear", "spring")).toBe(false);
  });

  it("is away for part of each round and visiting for the rest", () => {
    const poses = Array.from({ length: 420 }, (_, i) => hummingbirdAt(i * 0.1, flowers));
    const here = poses.filter((pose) => pose !== null).length;
    expect(here).toBeGreaterThan(100);
    expect(here).toBeLessThan(380);
  });

  it("hovers with its bill at a flower", () => {
    const hovering = Array.from({ length: 420 }, (_, i) => hummingbirdAt(i * 0.1, flowers)).filter((pose) => pose?.hovering);
    expect(hovering.length).toBeGreaterThan(50);
    for (const pose of hovering) {
      const tip = { x: pose!.x + Math.sin(pose!.yaw) * 0.09, z: pose!.z + Math.cos(pose!.yaw) * 0.09 };
      const nearest = Math.min(...flowers.map((f) => Math.hypot(f.x - tip.x, f.z - tip.z)));
      expect(nearest).toBeLessThan(0.05);
    }
  });

  it("visits different flowers on different rounds", () => {
    const first = hummingbirdAt(16.3, flowers)!;
    const later = hummingbirdAt(16.3 + ROUND_SEC * 3, flowers)!;
    expect(Math.hypot(first.x - later.x, first.z - later.z)).toBeGreaterThan(0.01);
  });

  it("hangs at one flower for reduced motion, and stays away when there are none", () => {
    expect(hummingbirdAt(1, flowers, true)).toEqual(hummingbirdAt(30, flowers, true));
    expect(hummingbirdAt(1, flowers, true)!.hovering).toBe(true);
    expect(hummingbirdAt(20, [])).toBeNull();
  });

  it("builds its body", () => {
    const body = hummerShape();
    expect(body.getAttribute("color")).toBeDefined();
    body.dispose();
  });
});
