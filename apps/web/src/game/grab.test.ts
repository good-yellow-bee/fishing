import { describe, expect, it } from "vitest";
import { GRAB_ODDS, grabberFor } from "./grab";

const strong = { strength: 10, accuracy: 10 };

describe("grabberFor", () => {
  it("lets a pike hit a golden shiner hooked at the reeds", () => {
    expect(grabberFor("golden-shiner", "reeds", strong, false, 0)?.id).toBe("pike");
  });

  it("only hits on a share of shiners", () => {
    expect(grabberFor("golden-shiner", "reeds", strong, false, GRAB_ODDS - 0.01)?.id).toBe("pike");
    expect(grabberFor("golden-shiner", "reeds", strong, false, GRAB_ODDS)).toBeNull();
  });

  it("stays off other banks and other fish", () => {
    expect(grabberFor("golden-shiner", "dock", strong, false, 0)).toBeNull();
    expect(grabberFor("golden-shiner", "inlet", strong, false, 0)).toBeNull();
    expect(grabberFor("perch", "reeds", strong, false, 0)).toBeNull();
  });

  it("spares a new angler's first fish and one too weak for the pike", () => {
    expect(grabberFor("golden-shiner", "reeds", strong, true, 0)).toBeNull();
    expect(grabberFor("golden-shiner", "reeds", { strength: 1, accuracy: 1 }, false, 0)).toBeNull();
  });
});
