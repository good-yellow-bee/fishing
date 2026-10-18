import { describe, expect, it } from "vitest";
import { pluralOf, singularStems } from "./pluralWord";

describe("plural words in a search", () => {
  it("reads a typed plural as the name it comes from", () => {
    expect(pluralOf("szczupaki", "szczupak")).toBe(true);
    expect(pluralOf("okonie", "okon")).toBe(true);
    expect(pluralOf("bluegills", "bluegill")).toBe(true);
    expect(pluralOf("szczupak", "szczupak")).toBe(false);
    expect(pluralOf("pikeperches", "pike")).toBe(false);
    expect(pluralOf("ab", "a")).toBe(false);
  });

  it("offers the shorter forms down to four letters", () => {
    expect(singularStems("szczupaki")).toEqual(["szczupak", "szczupa", "szczup"]);
    expect(singularStems("jigs")).toEqual([]);
    expect(singularStems("2026-09")).toEqual([]);
    expect(singularStems("plocie")).toEqual(["ploci", "ploc"]);
  });
});
