import { describe, expect, it } from "vitest";
import { DOCK_PLANKS } from "@stillwater/shared";
import { CHEER_SEC, DOG_COCK, DOG_LOOK_MAX, DOG_SPOT, DOZE_IDLE_SEC, DOZE_WAIT_SEC, dogGlance, dogLookAt, dogMood, dogOut, dogAttention, easeMood, noticing, tailSwing, watching } from "./dogMood";
import { paperBoatAt } from "./paperDrift";
import { robinAt } from "./robinVisit";
import { MOUSE_FROM } from "./mouseScurry";
import { THERMOS_SPOT } from "./steamWisp";

describe("dock dog", () => {
  it("lies on the dock by day, but stays home in the rain and after dark", () => {
    expect(dogOut("day", "clear", "summer")).toBe(true);
    expect(dogOut("day", "fog", "fall")).toBe(true);
    expect(dogOut("day", "rain", "spring")).toBe(false);
    expect(dogOut("dusk", "clear", "summer")).toBe(false);
    expect(dogOut("night", "clear", "summer")).toBe(false);
    // Winter's precipitation is snow, which it loves.
    expect(dogOut("day", "rain", "winter")).toBe(true);
  });

  it("lies on the boards, clear of the thermos and the night mouse's way on", () => {
    expect(DOG_SPOT.x - 0.15).toBeGreaterThan(DOCK_PLANKS.minX);
    expect(DOG_SPOT.z + 0.45).toBeLessThan(DOCK_PLANKS.maxZ);
    expect(Math.hypot(DOG_SPOT.x - THERMOS_SPOT.x, DOG_SPOT.z - THERMOS_SPOT.z)).toBeGreaterThan(0.6);
    expect(dogOut("dusk", "clear", "summer") || dogOut("night", "clear", "summer")).toBe(false);
    expect(MOUSE_FROM.x).toBeLessThan(DOG_SPOT.x);
  });

  it("watches a fresh cast, then dozes off when nothing happens", () => {
    expect(dogMood("waiting", 2).headUp).toBe(1);
    expect(dogMood("waiting", DOZE_WAIT_SEC + 1).headUp).toBe(0);
    expect(dogMood("idle", 3).headUp).toBeGreaterThan(0.5);
    expect(dogMood("idle", DOZE_IDLE_SEC + 1).headUp).toBe(0);
  });

  it("sits up through the strike and fight, and wags hardest over the result", () => {
    expect(dogMood("hookset", 0).sit).toBe(1);
    expect(dogMood("fight", 10).sit).toBe(1);
    const cheer = dogMood("result", 1);
    expect(cheer.wag).toBe(1);
    expect(cheer.wag).toBeGreaterThan(dogMood("fight", 1).wag);
    expect(dogMood("result", CHEER_SEC + 1).sit).toBe(0);
  });

  it("eases between moods, sitting up quicker than it lies down", () => {
    const lying = { sit: 0, headUp: 0, wag: 0 };
    const sitting = { sit: 1, headUp: 1, wag: 1 };
    const up = easeMood(lying, sitting, 0.2);
    const down = easeMood(sitting, lying, 0.2);
    expect(up.sit).toBeGreaterThan(0);
    expect(up.sit).toBeLessThan(1);
    expect(up.sit).toBeGreaterThan(1 - down.sit);
    let mood = lying;
    for (let i = 0; i < 300; i += 1) mood = easeMood(mood, sitting, 1 / 60);
    expect(mood.sit).toBeCloseTo(1, 3);
  });

  it("keeps its tail still when it is not wagging, and its glance small", () => {
    for (let t = 0; t < 30; t += 0.37) {
      expect(Math.abs(tailSwing(t, 0))).toBe(0);
      expect(Math.abs(tailSwing(t, 1))).toBeLessThanOrEqual(0.6);
      expect(Math.abs(dogGlance(t))).toBeLessThanOrEqual(0.4);
    }
  });

  it("turns its head to watch the robin on the posts and a paper boat going by, but not round behind it", () => {
    let robinSeen = 0;
    for (let t = 0; t < 90; t += 0.5) {
      const bird = robinAt(t);
      if (!bird.here || bird.flying) continue;
      const turn = dogLookAt(bird.x, bird.z);
      expect(turn).not.toBeNull();
      robinSeen += 1;
    }
    expect(robinSeen).toBeGreaterThan(10);
    // Out on the water to either side it turns opposite ways, always within reach.
    const left = dogLookAt(DOG_SPOT.x - 3, DOG_SPOT.z - 3)!;
    const right = dogLookAt(DOG_SPOT.x + 3, DOG_SPOT.z - 3)!;
    expect(Math.sign(left)).toBe(-Math.sign(right));
    expect(Math.abs(left)).toBeLessThanOrEqual(DOG_LOOK_MAX);
    expect(dogLookAt(DOG_SPOT.x, DOG_SPOT.z - 5)).toBeCloseTo(0, 6);
    expect(dogLookAt(DOG_SPOT.x, DOG_SPOT.z + 3)).toBeNull();
    const boat = paperBoatAt(60, 0);
    expect(boat.here).toBe(true);
    expect(dogLookAt(boat.x, boat.z)).not.toBeNull();
  });

  it("wakes to watch, but a watch does not stand it down from sitting", () => {
    expect(watching({ sit: 0, headUp: 0, wag: 0 }).headUp).toBeGreaterThan(0.5);
    expect(watching({ sit: 1, headUp: 1, wag: 1 })).toEqual({ sit: 1, headUp: 1, wag: 1 });
  });

  it("wakes with its head right up and a hopeful wag when a nibble catches its ear", () => {
    const asleep = dogMood("waiting", DOZE_WAIT_SEC + 1);
    expect(asleep.headUp).toBe(0);
    const heard = noticing(asleep);
    expect(heard.headUp).toBe(1);
    expect(heard.wag).toBeGreaterThan(0);
    expect(heard.sit).toBe(0);
    expect(DOG_COCK).toBeGreaterThan(0.1);
    expect(DOG_COCK).toBeLessThan(0.6);
  });

  it("minds a nibble before the robin or a boat: it turns to the float itself and cocks its head", () => {
    const calm = dogMood("waiting", DOZE_WAIT_SEC + 1);
    const float = { x: DOG_SPOT.x + 1, z: DOG_SPOT.z - 6 };
    const robin = { x: DOG_SPOT.x - 1, z: DOG_SPOT.z - 2 };
    const heard = dogAttention(calm, float, robin, null);
    expect(heard.cock).toBe(true);
    expect(heard.turn).toBe(dogLookAt(float.x, float.z));
    expect(heard.mood.headUp).toBe(1);
    const watched = dogAttention(calm, null, robin, null);
    expect(watched.cock).toBe(false);
    expect(watched.turn).toBe(dogLookAt(robin.x, robin.z));
    expect(dogAttention(calm, null, null, null)).toEqual({ turn: null, mood: calm, cock: false });
    // Sat up for a bite, it stays sat.
    const sat = dogMood("hookset", 0);
    expect(dogAttention(sat, float, null, null).mood).toEqual(sat);
  });
});
