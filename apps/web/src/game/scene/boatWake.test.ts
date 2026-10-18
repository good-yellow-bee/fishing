import { describe, expect, it } from "vitest";
import { speedOf, wakeLook } from "./boatWake";
import { wakeGeometry } from "./BoatWake";
import { canoeAt } from "./canoeTrip";
import { LEG_SEC, sailAt } from "./sailingTrip";

describe("boat wakes", () => {
  it("leaves no wake standing still, and a longer, brighter one the faster it goes", () => {
    expect(wakeLook(0).opacity).toBe(0);
    expect(wakeLook(0.3).length).toBeGreaterThan(wakeLook(0.1).length);
    expect(wakeLook(0.3).opacity).toBeGreaterThan(wakeLook(0.1).opacity);
    expect(wakeLook(5)).toEqual(wakeLook(0.6));
  });

  it("measures a boat's speed from its path", () => {
    expect(speedOf((t) => ({ x: t * 0.5, z: 0 }), 3)).toBeCloseTo(0.5);
    expect(speedOf(() => ({ x: 1, z: 2 }), 3)).toBe(0);
  });

  it("shows behind the canoe and the dinghy as they go, and not while the dinghy goes about", () => {
    expect(wakeLook(speedOf(canoeAt, 45)).opacity).toBeGreaterThan(0.2);
    const wind = { x: 0.08, z: 0 };
    expect(wakeLook(speedOf((t) => sailAt(t, wind), LEG_SEC / 2)).opacity).toBeGreaterThan(0.2);
    expect(wakeLook(speedOf((t) => sailAt(t, wind), LEG_SEC + 2.5)).opacity).toBe(0);
  });

  it("fades each arm out toward its end", () => {
    const geometry = wakeGeometry();
    const alpha = geometry.getAttribute("color");
    expect(alpha.itemSize).toBe(4);
    expect(alpha.getW(0)).toBe(1);
    expect(alpha.getW(alpha.count - 1)).toBe(0);
    geometry.dispose();
  });
});
