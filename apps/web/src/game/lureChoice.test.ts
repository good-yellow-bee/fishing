import { describe, expect, it } from "vitest";
import { lureCanChange } from "./lureChoice";

describe("lure choice", () => {
  it("can change while standing and stays tied once the cast is away", () => {
    expect(lureCanChange("idle")).toBe(true);
    expect(lureCanChange("casting")).toBe(true);
    expect(lureCanChange("waiting")).toBe(false);
    expect(lureCanChange("hookset")).toBe(false);
    expect(lureCanChange("fight")).toBe(false);
    expect(lureCanChange("result")).toBe(false);
  });
});
