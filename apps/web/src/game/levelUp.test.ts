import { describe, expect, it } from "vitest";
import { levelUp } from "./levelUp";

const dropoff = "The drop-off is open — walk east along the shore.";

describe("level up", () => {
  it("stays quiet on the first reading and while the level holds or falls", () => {
    expect(levelUp(null, 1)).toBeNull();
    expect(levelUp(null, 4)).toBeNull();
    expect(levelUp(2, 2)).toBeNull();
    expect(levelUp(3, 2)).toBeNull();
  });

  it("announces a rise and the drop-off only when it is crossed", () => {
    expect(levelUp(1, 2)).toEqual({ level: 2, opened: null });
    expect(levelUp(2, 3)).toEqual({ level: 3, opened: dropoff });
    expect(levelUp(1, 4)).toEqual({ level: 4, opened: `${dropoff} See a fish shadow before you strike.` });
    expect(levelUp(3, 4)).toEqual({ level: 4, opened: "See a fish shadow before you strike." });
  });
});

const unlocks = [
  [4, "See a fish shadow before you strike."],
  [5, "Cast 25% farther."],
  [6, "Legendary fish bite more often at night or in rain."],
  [7, "Fish bite 15% faster."],
  [8, "Better odds of trophy-size fish."],
] as const;

it.each(unlocks)("announces the level %i unlock at its boundary", (level, opened) => {
  expect(levelUp(level - 1, level)).toEqual({ level, opened });
  expect(levelUp(level, level)).toBeNull();
});

it("keeps every unlock when several levels are crossed together", () => {
  expect(levelUp(3, 8)?.opened).toBe(unlocks.map(([, line]) => line).join(" "));
});
