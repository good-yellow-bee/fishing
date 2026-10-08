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
    expect(levelUp(1, 4)).toEqual({ level: 4, opened: dropoff });
    expect(levelUp(3, 4)).toEqual({ level: 4, opened: null });
  });
});
