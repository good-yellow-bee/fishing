import { describe, expect, it } from "vitest";
import { pieceKey } from "./pieceKey";

describe("pieceKey", () => {
  it("takes one piece however it was written", () => {
    expect(pieceKey("Spinnerbaits")).toBe(pieceKey(" spinnerbait"));
    expect(pieceKey("Polarized glasses")).toBe("polarized glass");
    expect(pieceKey("Floss")).toBe("floss");
    expect(pieceKey("Long  nose pliers")).toBe("long nose plier");
  });
});
