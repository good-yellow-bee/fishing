import { describe, expect, it } from "vitest";
import { outingName, outingNameById } from "./format";

describe("outingName", () => {
  const spots = [{ id: "s1", name: "Cedar Lake" }];

  it("uses the title, then the water's name, then a plain word", () => {
    expect(outingName({ title: " Dawn patrol ", spotId: "s1" }, spots)).toBe("Dawn patrol");
    expect(outingName({ title: "", spotId: "s1" }, spots)).toBe("Cedar Lake");
    expect(outingName({ title: "  ", spotId: "gone" }, spots)).toBe("Outing");
    expect(outingNameById({ trips: [{ id: "t1", title: "", spotId: "s1" }], spots }, "t1")).toBe("Cedar Lake");
    expect(outingNameById({ trips: [], spots }, "t1")).toBeNull();
  });
});
