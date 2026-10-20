import { describe, expect, it } from "vitest";
import type { TackleItem } from "@stillwater/shared";
import { renamedTackle } from "./gear/renamedTackle";
import { gpxFor } from "./gpx";

describe("round 115: merging two spellings on a packing list", () => {
  it("keeps the tick of the row it drops", () => {
    const items: TackleItem[] = [
      { id: "a", tripId: "t", label: "Spiner", packed: true },
      { id: "b", tripId: "t", label: "Spinner", packed: false },
    ];
    expect(renamedTackle(items, "Spiner", "Spinner")).toEqual([{ id: "b", tripId: "t", label: "Spinner", packed: true }]);
  });
});

describe("round 115: the waters for a GPS", () => {
  it("leave out characters XML can't hold", () => {
    const gpx = gpxFor([{ id: "a", name: "Pine\u0007 Pond", waterType: "pond", notes: "", bestConditions: "", place: { lat: 54, lng: 18 } }]);
    expect(gpx).toContain("Pine Pond");
    expect(gpx).not.toMatch(/[\u0000-\u0008]/);
  });
});
