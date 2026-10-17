import { describe, expect, it } from "vitest";
import { sameSizeSearch } from "./sizeQuery";

describe("sameSizeSearch", () => {
  it("keeps a whole weight to its tenth, a length to the tenth of an inch or the whole cm", () => {
    expect(sameSizeSearch({ kind: "weight", pounds: 1 }, false)).toBe(">0.95 lb + <1.05 lb");
    expect(sameSizeSearch({ kind: "weight", pounds: 0.6 }, false)).toBe(">0.595 lb + <0.605 lb");
    expect(sameSizeSearch({ kind: "length", inches: 17.2 }, false)).toBe(">17.15 in + <17.25 in");
    expect(sameSizeSearch({ kind: "length", inches: 28 }, false)).toBe(">27.95 in + <28.05 in");
    expect(sameSizeSearch({ kind: "length", inches: 17 }, true)).toBe(">42.5 cm + <43.5 cm");
  });
});
