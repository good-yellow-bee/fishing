import { describe, expect, it } from "vitest";
import { nearTwinLures } from "./suggestions";

describe("nearTwinLures", () => {
  it("folds a slip into the name used most", () => {
    expect(nearTwinLures([{ lure: "Spiner", count: 1 }, { lure: "Spinner", count: 6 }, { lure: "Crankbait", count: 3 }])).toEqual([{ from: "Spiner", into: "Spinner" }]);
  });

  it("leaves sizes of one lure, and names far apart", () => {
    expect(nearTwinLures([{ lure: "Jig 5g", count: 2 }, { lure: "Jig 9g", count: 1 }, { lure: "Spoon", count: 1 }, { lure: "Popper", count: 1 }])).toEqual([]);
    expect(nearTwinLures([{ lure: "Hair jig", count: 2 }, { lure: "Hair rig", count: 1 }])).toEqual([]);
  });
});

describe("nearTwinLures with pairs kept apart", () => {
  it("pairs a name with its next slip once the first pair is kept apart", () => {
    const tally = [{ lure: "Spoon", count: 5 }, { lure: "Spook", count: 2 }, { lure: "Spoom", count: 1 }];
    expect(nearTwinLures(tally)).toEqual([{ from: "Spook", into: "Spoon" }]);
    expect(nearTwinLures(tally, (a, b) => [a, b].sort().join() === "Spook,Spoon")).toEqual([{ from: "Spoom", into: "Spoon" }]);
  });
});
