import { describe, expect, it } from "vitest";
import { findLink } from "./CatchSearch";

describe("find links", () => {
  it("opens the field log home with the search typed in", () => {
    expect(findLink("Brook trout")).toBe("/?find=Brook+trout");
    expect(new URLSearchParams(findLink("Pstrąg źródlany").split("?")[1]).get("find")).toBe("Pstrąg źródlany");
  });
});
