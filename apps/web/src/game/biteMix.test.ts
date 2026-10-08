import { describe, expect, it } from "vitest";
import { canLand, FISH, type Profile, type SpotId } from "@stillwater/shared";
import { pickBite } from "./logic";

const starter: Profile = {
  userId: "u1",
  displayName: "Ash",
  points: 0,
  lifetimePoints: 0,
  strength: 1,
  accuracy: 1,
  patience: 1,
};

/** Strong enough for every ordinary fish, too weak for legendaries. */
const seasoned: Profile = { ...starter, strength: 4, accuracy: 2 };

const POINT = ["bluegill", "brook-trout", "pike"];
const DOCK = ["carp", "catfish", "golden-shiner", "perch", "smallmouth-bass"];

function drawn(spot: SpotId, lure?: string, profile: Profile = starter) {
  const ids = new Set<string>();
  for (let i = 0; i < 48; i++) ids.add(pickBite(spot, profile, false, () => i / 48, "day", lure).id);
  return [...ids].sort();
}

describe("bite mix", () => {
  it("draws the point from a different pool than the dock", () => {
    const point = drawn("point");
    const dock = drawn("dock");
    expect(point).toEqual(POINT);
    expect(dock).toEqual(DOCK);
    expect(point.some((id) => dock.includes(id))).toBe(false);
    expect(pickBite("point", starter, true, () => 0, "day").id).toBe("bluegill");
  });

  it("a small lure and a large lure on the same bank do not draw the same pool", () => {
    const smallPoint = ["bluegill", "brook-trout"];
    const largePoint = ["brook-trout", "pike"];
    const smallDock = ["golden-shiner", "perch", "smallmouth-bass"];
    const largeDock = ["carp", "catfish", "smallmouth-bass"];

    const smallLures = [
      "Bobber",
      "Worm",
      "Nightcrawlers",
      "Pencil bobbers",
      "Popper",
      "Pheasant tails",
      "Elk hair caddis",
      "Size 8 hooks",
    ];
    const largeLures = [
      "Spinnerbait",
      "#5 Mepps",
      "Spoon",
      "Crayfish crankbait",
      "Green pumpkin tubes",
      "Woolly buggers",
    ];
    for (const lure of smallLures) {
      expect(drawn("point", lure, seasoned)).toEqual(smallPoint);
      expect(drawn("dock", lure, seasoned)).toEqual(smallDock);
    }
    for (const lure of largeLures) {
      expect(drawn("point", lure, seasoned)).toEqual(largePoint);
      expect(drawn("dock", lure, seasoned)).toEqual(largeDock);
    }
    expect(smallPoint).not.toEqual(largePoint);
    expect(smallDock).not.toEqual(largeDock);
  });

  it("keeps every fish on its own bank", () => {
    const banks = ["dock", "reeds", "dropoff", "point"] as const;
    for (const spot of banks) {
      const home = FISH.filter((fish) => fish.spots.includes(spot)).map((fish) => fish.id);
      for (const lure of ["Nightcrawlers", "Spinnerbait", "Bobber", "Spoon"]) {
        for (const id of drawn(spot, lure)) {
          expect(home).toContain(id);
          expect(FISH.find((fish) => fish.id === id)?.spots).toContain(spot);
        }
      }
    }
    for (const id of [...drawn("point", "Worm"), ...drawn("point", "Spoon")]) {
      expect(POINT).toContain(id);
      expect(DOCK).not.toContain(id);
    }
    for (const id of [...drawn("dock", "Bobber"), ...drawn("dock", "Spinnerbait")]) {
      expect(DOCK).toContain(id);
      expect(POINT).not.toContain(id);
    }
  });

  it("does not move a fish between lures when a heavier one becomes legal", () => {
    const strong: Profile = { ...starter, strength: 5, accuracy: 3 };
    const ordinary = (id: string) => FISH.find((fish) => fish.id === id)?.rarity !== "legendary";
    for (const spot of ["reeds", "dropoff"] as const) {
      for (const lure of ["Bobber", "Spoon"]) {
        expect(drawn(spot, lure, strong).filter(ordinary)).toEqual(drawn(spot, lure, seasoned));
      }
    }
  });

  const HOURS = ["dawn", "day", "dusk", "night"] as const;
  const BANKS = ["dock", "reeds", "dropoff", "point"] as const;
  function landableShare(spot: SpotId, profile: Profile, hour: (typeof HOURS)[number], lure: string) {
    const fish = Array.from({ length: 480 }, (_, i) => pickBite(spot, profile, false, () => i / 480, hour, lure));
    return fish.filter((one) => canLand(profile, one)).length / fish.length;
  }

  it("never locks a starter out, whatever the lure or the hour", () => {
    for (const spot of BANKS) {
      for (const hour of HOURS) {
        for (const lure of ["Spinnerbait", "#5 Mepps", "Spoon", "Crayfish crankbait", "Nightcrawlers"]) {
          expect(landableShare(spot, starter, hour, lure), `${spot} ${hour} ${lure}`).toBeGreaterThan(0.55);
        }
      }
    }
  });

  it("lands at least as often after every Strength or Accuracy upgrade", () => {
    for (const spot of BANKS) {
      for (const hour of HOURS) {
        for (const lure of ["Spinnerbait", "Nightcrawlers"]) {
          for (const accuracy of [1, 2, 3]) {
            let previous = 0;
            for (let strength = 1; strength <= 5; strength++) {
              const share = landableShare(spot, { ...starter, strength, accuracy }, hour, lure);
              expect(share, `${spot} ${hour} ${lure} str ${strength} acc ${accuracy}`).toBeGreaterThanOrEqual(previous - 1e-9);
              previous = share;
            }
          }
          for (const strength of [1, 3, 5]) {
            let previous = 0;
            for (let accuracy = 1; accuracy <= 3; accuracy++) {
              const share = landableShare(spot, { ...starter, strength, accuracy }, hour, lure);
              expect(share, `${spot} ${hour} ${lure} str ${strength} acc ${accuracy}`).toBeGreaterThanOrEqual(previous - 1e-9);
              previous = share;
            }
          }
        }
      }
    }
  });

  it("keeps the first Strength upgrade worth it with a big lure", () => {
    expect(landableShare("dock", { ...starter, strength: 2 }, "day", "Spinnerbait")).toBeGreaterThan(0.75);
  });

  it("never lets a small lure draw big-lure fish, whatever the angler can land", () => {
    const strong: Profile = { ...starter, strength: 5, accuracy: 3 };
    for (const spot of BANKS) {
      for (const hour of HOURS) {
        const reach = new Set(Array.from({ length: 480 }, (_, i) => pickBite(spot, strong, false, () => i / 480, hour, "Nightcrawlers").id));
        for (let strength = 1; strength <= 5; strength++) {
          for (let accuracy = 1; accuracy <= 3; accuracy++) {
            for (let i = 0; i < 480; i++) {
              const fish = pickBite(spot, { ...starter, strength, accuracy }, false, () => i / 480, hour, "Nightcrawlers");
              expect(reach.has(fish.id), `${spot} ${hour} str ${strength} acc ${accuracy}: ${fish.id}`).toBe(true);
            }
          }
        }
      }
    }
  });

  it("lets fish out of reach bite less often than for an angler who can land them", () => {
    const carps = (profile: Profile) =>
      Array.from({ length: 480 }, (_, i) => pickBite("dock", profile, false, () => i / 480, "day")).filter((fish) => fish.id === "carp").length;
    expect(carps(starter)).toBeGreaterThan(0);
    expect(carps(starter)).toBeLessThan(carps(seasoned));
  });
});
