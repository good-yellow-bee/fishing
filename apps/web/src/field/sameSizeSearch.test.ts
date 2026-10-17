import { describe, expect, it } from "vitest";
import { sameSizeSearch } from "./sizeQuery";

describe("sameSizeSearch", () => {
  it("keeps a whole weight to its tenth, and a length to the whole unit", () => {
    expect(sameSizeSearch({ kind: "weight", pounds: 1 }, false)).toBe(">0.95 lb + <1.05 lb");
    expect(sameSizeSearch({ kind: "weight", pounds: 0.6 }, false)).toBe(">0.595 lb + <0.605 lb");
    expect(sameSizeSearch({ kind: "length", inches: 17.2 }, false)).toBe(">16.5 in + <17.5 in");
    expect(sameSizeSearch({ kind: "length", inches: 17 }, true)).toBe(">42.5 cm + <43.5 cm");
  });
});
