import { describe, expect, it } from "vitest";
import { pieceKey, shownPieceKey } from "./pieceKey";

describe("pieceKey", () => {
  it("takes one piece however it was written", () => {
    expect(pieceKey("Spinnerbaits")).toBe(pieceKey(" spinnerbait"));
    expect(pieceKey("Polarized glasses")).toBe("polarized glass");
    expect(pieceKey("Floss")).toBe("floss");
    expect(pieceKey("Long  nose pliers")).toBe("long nose plier");
    expect(pieceKey("Leeches")).toBe(pieceKey("leech"));
    expect(pieceKey("Tackle boxes")).toBe(pieceKey("tackle box"));
  });

  it("takes a Polish plural for its singular, whichever word carries it", () => {
    expect(shownPieceKey("Nimfy pheasant tail", "pl")).toBe(shownPieceKey("Nimfa pheasant tail", "pl"));
    expect(shownPieceKey("Rosówki", "pl")).toBe(shownPieceKey("Rosówka", "pl"));
    expect(shownPieceKey("Woblery", "pl")).toBe(shownPieceKey("Wobler", "pl"));
    expect(shownPieceKey("Jig", "pl")).toBe("jig");
  });
});
