import { describe, expect, it } from "vitest";
import { FISH } from "@stillwater/shared";
import { BAIT_THIEVES, baitThievesOver, BUILT_SWIM_STEAL_CHANCE, FRESH_SWIM_STEAL_CHANCE, biteStyle, takeStyle, LIFT_RISE, liftTilt, nibblePlan, RUN_PLUNGE, RUN_SLIDE, runSlide, STEAL_CHANCE, stealChance, stealsBait } from "./nibblePlan";
import { TOPUP_MAX } from "./logic";

function seeded(seed: number) {
  let s = (seed * 48271 + 12345) % 2147483647;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe("nibble plan", () => {
  it("has no nibble when the wait is too short", () => {
    expect(nibblePlan(800, seeded(1))).toEqual([]);
  });

  it("always ends its nibbles well before the bite, in order and apart", () => {
    for (let seed = 1; seed < 300; seed += 1) {
      const wait = 1000 + (seed * 137) % 9000;
      const plan = nibblePlan(wait, seeded(seed));
      expect(plan.length).toBeGreaterThanOrEqual(1);
      expect(plan.length).toBeLessThanOrEqual(3);
      plan.forEach((n, k) => {
        expect(n.at).toBeGreaterThanOrEqual(0);
        expect(n.at + n.ms).toBeLessThanOrEqual(wait - 350);
        if (k > 0) expect(n.at).toBeGreaterThan(plan[k - 1]!.at + plan[k - 1]!.ms);
      });
    }
  });

  it("varies when the first nibble lands and how many come", () => {
    const firsts = new Set<number>();
    const counts = new Set<number>();
    for (let seed = 1; seed < 60; seed += 1) {
      const plan = nibblePlan(8000, seeded(seed));
      firsts.add(Math.round(plan[0]!.at / 500));
      counts.add(plan.length);
    }
    expect(firsts.size).toBeGreaterThan(3);
    expect(counts.size).toBe(3);
  });

  it("gives a predator's ambush no nibble, and a bottom feeder more", () => {
    expect(nibblePlan(8000, seeded(3), "ambush")).toEqual([]);
    let usual = 0;
    let mouthed = 0;
    for (let seed = 1; seed < 200; seed += 1) {
      const plan = nibblePlan(8000, seeded(seed), "mouth");
      expect(plan.length).toBeGreaterThanOrEqual(1);
      expect(plan.length).toBeLessThanOrEqual(4);
      plan.forEach((n) => expect(n.at + n.ms).toBeLessThanOrEqual(8000 - 350));
      mouthed += plan.length;
      usual += nibblePlan(8000, seeded(seed)).length;
    }
    expect(mouthed).toBeGreaterThan(usual * 1.3);
  });

  it("names every kind's style, with only known ids set apart", () => {
    const styles = new Set(FISH.map((fish) => biteStyle(fish.id)));
    expect(styles).toEqual(new Set(["ambush", "mouth", "light", "lift", "peck", "run", "gulp", "snatch", "roll", "usual"]));
    expect(biteStyle("salmon")).toBe("roll");
    expect(biteStyle("brook-trout")).toBe("snatch");
    expect(biteStyle("rainbow-trout")).toBe("snatch");
    expect(biteStyle("golden-shiner")).toBe("usual");
    expect(biteStyle("perch")).toBe("gulp");
    expect(biteStyle("pike")).toBe("ambush");
    expect(biteStyle("carp")).toBe("mouth");
    expect(biteStyle("walleye")).toBe("light");
    expect(biteStyle("lake-whitefish")).toBe("light");
    expect(biteStyle("crappie")).toBe("lift");
    expect(biteStyle("bluegill")).toBe("peck");
    expect(biteStyle("smallmouth-bass")).toBe("run");
  });

  it("slides a running bite's float away as it goes down, never past the full slide", () => {
    expect(runSlide(0)).toBe(0);
    expect(runSlide(-0.1)).toBe(0);
    expect(runSlide(0.36 * RUN_PLUNGE)).toBeCloseTo(RUN_SLIDE);
    expect(runSlide(1)).toBeCloseTo(RUN_SLIDE);
    expect(runSlide(0.1)).toBeGreaterThan(0);
    expect(runSlide(0.1)).toBeLessThan(RUN_SLIDE);
  });

  it("gives a pecker more, quicker taps that still end before the bite", () => {
    let pecks = 0;
    let usual = 0;
    for (let seed = 1; seed < 200; seed += 1) {
      const wait = 2000 + (seed * 137) % 7000;
      const plan = nibblePlan(wait, seeded(seed), "peck");
      expect(plan.length).toBeGreaterThanOrEqual(1);
      expect(plan.length).toBeLessThanOrEqual(5);
      plan.forEach((n, k) => {
        expect(n.ms).toBeLessThanOrEqual(200);
        expect(n.at + n.ms).toBeLessThanOrEqual(wait - 350);
        if (k > 0) expect(n.at).toBeGreaterThan(plan[k - 1]!.at + plan[k - 1]!.ms);
      });
      pecks += plan.length;
      usual += nibblePlan(wait, seeded(seed)).length;
    }
    expect(pecks).toBeGreaterThan(usual * 1.5);
  });

  it("tips a lifted float flat as it rises, and never past flat", () => {
    expect(liftTilt(0)).toBe(0);
    expect(liftTilt(0.2)).toBe(0);
    expect(liftTilt(-0.36 * LIFT_RISE)).toBe(1);
    expect(liftTilt(-0.05)).toBeGreaterThan(0);
    expect(liftTilt(-0.05)).toBeLessThan(1);
  });
});

describe("stealsBait", () => {
  it("lets only a thief that nibbled steal, at its chance", () => {
    expect(BAIT_THIEVES.has("golden-shiner")).toBe(true);
    expect(stealsBait("golden-shiner", 2, () => STEAL_CHANCE - 0.01)).toBe(true);
    expect(stealsBait("golden-shiner", 2, () => STEAL_CHANCE + 0.01)).toBe(false);
    expect(stealsBait("golden-shiner", 0, () => 0)).toBe(false);
    expect(stealsBait("perch", 2, () => 0)).toBe(false);
  });

  it("strips the hook twice as often over a fresh swim, half as often over one built all the way", () => {
    expect([null, 0, 1, TOPUP_MAX, TOPUP_MAX + 1].map(stealChance)).toEqual([STEAL_CHANCE, FRESH_SWIM_STEAL_CHANCE, STEAL_CHANCE, BUILT_SWIM_STEAL_CHANCE, BUILT_SWIM_STEAL_CHANCE]);
    expect(FRESH_SWIM_STEAL_CHANCE).toBe(STEAL_CHANCE * 2);
    expect(BUILT_SWIM_STEAL_CHANCE).toBe(STEAL_CHANCE / 2);
    expect(stealsBait("golden-shiner", 2, () => 0.4, stealChance(0))).toBe(true);
    expect(stealsBait("golden-shiner", 2, () => 0.2, stealChance(TOPUP_MAX))).toBe(false);
  });

  it("crowd a swim at a bank where they would take the tied lure, until its feeders are scattered", () => {
    expect(baitThievesOver({ spot: "dock", casts: 4 }, "Worm")).toBe(true);
    expect(baitThievesOver({ spot: "reeds", casts: 4, built: 1 }, undefined)).toBe(true);
    expect(baitThievesOver({ spot: "dock", casts: 4 }, "Crankbait")).toBe(false);
    expect(baitThievesOver({ spot: "point", casts: 4 }, "Worm")).toBe(false);
    expect(baitThievesOver({ spot: "dock", casts: 4, spooked: 2 }, "Worm")).toBe(false);
  });
});

describe("a topwater lure", () => {
  it("makes every fish's take an ambush, and leaves other lures to the fish", () => {
    expect(takeStyle("carp", true)).toBe("ambush");
    expect(takeStyle("crappie", true)).toBe("ambush");
    expect(takeStyle("carp", false)).toBe("mouth");
    expect(nibblePlan(5000, () => 0.5, takeStyle("carp", true))).toEqual([]);
  });
});
