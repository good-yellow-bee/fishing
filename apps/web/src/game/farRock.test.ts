import { describe, expect, it } from "vitest";
import { FAR_ROCK_REACH, FAR_ROCK_RADIUS, tightToFarRock } from "./farRock";
import { CORMORANT_ROCK } from "./scene/cormorantPerch";

describe("the far rock", () => {
  it("counts a boat cast landing tight to the rock, not on it, past its reach, or off the open water", () => {
    const at = (off: number) => [CORMORANT_ROCK.x + off, CORMORANT_ROCK.z] as const;
    expect(tightToFarRock("open", ...at(1))).toBe(true);
    expect(tightToFarRock("open", ...at(FAR_ROCK_RADIUS / 2))).toBe(false);
    expect(tightToFarRock("open", ...at(FAR_ROCK_REACH + 0.1))).toBe(false);
    expect(tightToFarRock("dock", ...at(1))).toBe(false);
    expect(tightToFarRock("open", ...at(FAR_ROCK_RADIUS))).toBe(false);
    expect(tightToFarRock("open", ...at(FAR_ROCK_REACH))).toBe(true);
    expect(tightToFarRock("open", CORMORANT_ROCK.x, CORMORANT_ROCK.z - 1.2)).toBe(true);
  });
});
