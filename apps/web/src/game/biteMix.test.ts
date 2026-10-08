import { describe, expect, it } from "vitest";
import { FISH, type Profile, type SpotId } from "@stillwater/shared";
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
      expect(drawn("point", lure)).toEqual(smallPoint);
      expect(drawn("dock", lure)).toEqual(smallDock);
    }
    for (const lure of largeLures) {
      expect(drawn("point", lure)).toEqual(largePoint);
      expect(drawn("dock", lure)).toEqual(largeDock);
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
        expect(drawn(spot, lure, strong).filter(ordinary)).toEqual(drawn(spot, lure));
      }
    }
  });
});
