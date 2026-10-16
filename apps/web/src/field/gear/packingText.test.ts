import { describe, expect, it } from "vitest";
import { packingText } from "./packingText";

describe("packingText", () => {
  it("lists each piece with a box ticked when packed", () => {
    const rows = [
      { id: "a", tripId: "t", label: "Spinnerbait", packed: true },
      { id: "b", tripId: "t", label: "Steel leader", packed: false },
    ];
    expect(packingText("Tackle for Dawn patrol", rows)).toBe("Tackle for Dawn patrol\n[x] Spinnerbait\n[ ] Steel leader");
  });
});
