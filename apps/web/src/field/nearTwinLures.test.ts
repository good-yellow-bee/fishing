import { describe, expect, it } from "vitest";
import { nearTwinLures } from "./suggestions";

describe("nearTwinLures", () => {
  it("folds a slip into the name used most", () => {
    expect(nearTwinLures([{ lure: "Spiner", count: 1 }, { lure: "Spinner", count: 6 }, { lure: "Crankbait", count: 3 }])).toEqual([{ from: "Spiner", into: "Spinner" }]);
  });

  it("leaves sizes of one lure, and names far apart", () => {
    expect(nearTwinLures([{ lure: "Jig 5g", count: 2 }, { lure: "Jig 9g", count: 1 }, { lure: "Spoon", count: 1 }, { lure: "Popper", count: 1 }])).toEqual([]);
  });
});
