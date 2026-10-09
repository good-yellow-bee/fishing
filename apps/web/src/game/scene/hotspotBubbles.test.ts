import * as THREE from "three";
import { DAILY_SKIES, LAKE_HOURS, spotAt, walkableAt } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import { HOTSPOT_PERIOD_MS, HOTSPOT_RADIUS, hotspotAt, type Hotspot } from "../hotspot.ts";
import { weatherLook } from "./LakeWorld.tsx";
import {
  BUBBLE_BEAD_MAX,
  BUBBLE_CYCLE_SEC,
  BUBBLE_LIFT,
  BUBBLE_RING_MAX,
  HOTSPOT_BUBBLES,
  bubbleColor,
  hotspotBubble,
} from "./hotspotBubbles.ts";
import { waterHeight } from "./water.ts";

const START = Date.UTC(2026, 9, 8, 12);
const PATCHES: Hotspot[] = Array.from({ length: 120 }, (_, i) => hotspotAt(START + i * HOTSPOT_PERIOD_MS, 3));
const TIMES = Array.from({ length: 40 }, (_, i) => 0.37 + i * BUBBLE_CYCLE_SEC * 0.13);

function luminance(color: string) {
  const c = new THREE.Color(color);
  return c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
}

function saturation(color: string) {
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(color).getHSL(hsl);
  return hsl.s;
}

describe("hotspot bubbles", () => {
  it("rises only inside the patch, on its bank's open water, riding the chop", () => {
    for (const patch of PATCHES) {
      for (const time of TIMES) {
        for (let i = 0; i < HOTSPOT_BUBBLES; i += 1) {
          const bubble = hotspotBubble(patch, i, time);
          if (!bubble) continue;
          const where = `${patch.spot} ${patch.x},${patch.z} bubble ${i} at ${time}`;
          expect(Math.hypot(bubble.x - patch.x, bubble.z - patch.z), where).toBeLessThanOrEqual(HOTSPOT_RADIUS);
          expect(spotAt(bubble.x, bubble.z), where).toBe(patch.spot);
          expect(walkableAt(bubble.x, bubble.z), where).toBe(false);
          expect(bubble.y, where).toBeCloseTo(waterHeight(bubble.x, bubble.z, time) + BUBBLE_LIFT, 6);
        }
      }
    }
  });

  it("keeps every patch busy, even where it sits against a bank's edge", () => {
    for (const patch of PATCHES) {
      let beads = 0;
      let rings = 0;
      for (const time of TIMES) {
        for (let i = 0; i < HOTSPOT_BUBBLES; i += 1) {
          const bubble = hotspotBubble(patch, i, time);
          if (bubble?.kind === "bead") beads += 1;
          if (bubble?.kind === "ring") rings += 1;
        }
      }
      const where = `${patch.spot} ${patch.x},${patch.z}`;
      // Two of every five slots on screen at once, on average, wherever the patch sits.
      expect(beads / TIMES.length, where).toBeGreaterThan(2);
      expect(rings / TIMES.length, where).toBeGreaterThan(2);
    }
  });

  it("stays small, so the patch is a simmer and not a splash", () => {
    expect(BUBBLE_BEAD_MAX).toBeLessThanOrEqual(0.08);
    expect(BUBBLE_RING_MAX).toBeLessThanOrEqual(0.35);
    for (const time of TIMES) {
      for (let i = 0; i < HOTSPOT_BUBBLES; i += 1) {
        const bubble = hotspotBubble(PATCHES[0]!, i, time);
        if (bubble) expect(bubble.size).toBeLessThanOrEqual(bubble.kind === "bead" ? BUBBLE_BEAD_MAX : BUBBLE_RING_MAX);
      }
    }
  });

  it("surfaces each slot somewhere new on its next round", () => {
    const patch = PATCHES[0]!;
    let moved = 0;
    for (let i = 0; i < HOTSPOT_BUBBLES; i += 1) {
      const first = hotspotBubble(patch, i, BUBBLE_CYCLE_SEC * 3 + 0.01);
      const next = hotspotBubble(patch, i, BUBBLE_CYCLE_SEC * 4 + 0.01);
      if (first && next && Math.hypot(first.x - next.x, first.z - next.z) > 0.1) moved += 1;
    }
    expect(moved).toBeGreaterThan(HOTSPOT_BUBBLES / 3);
  });

  it("reads on day and night water without glowing, and grays with the weather", () => {
    for (const sky of DAILY_SKIES) {
      const day = weatherLook("day", sky);
      const night = weatherLook("night", sky);
      expect(luminance(bubbleColor(day)), sky).toBeGreaterThan(luminance(day.water) * 4);
      expect(luminance(bubbleColor(night)), sky).toBeGreaterThan(luminance(night.water) * 4);
      expect(luminance(bubbleColor(night)), sky).toBeLessThan(luminance(bubbleColor(day)) * 0.6);
    }
    for (const hour of LAKE_HOURS) {
      const clear = bubbleColor(weatherLook(hour, "clear"));
      for (const sky of ["overcast", "rain", "fog"] as const) {
        expect(saturation(bubbleColor(weatherLook(hour, sky))), `${hour} ${sky}`).toBeLessThanOrEqual(saturation(clear) + 1e-9);
      }
    }
  });
});
