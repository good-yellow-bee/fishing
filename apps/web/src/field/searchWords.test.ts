import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { t } from "../i18n";
import { findCatches } from "./CatchSearch";

describe("search words without +", () => {
  const book = sampleLogbook(new Date(2026, 9, 15));
  const ids = (needle: string) => findCatches(book, needle, t).map((entry) => entry.id).sort();

  it("finds the fish every word finds when the words together find nothing", () => {
    expect(ids("cedar pike")).toEqual(ids("cedar + pike"));
    expect(ids("cedar pike").length).toBeGreaterThan(0);
    expect(ids("pike cedar + overcast")).toEqual(ids("pike + cedar + overcast"));
  });

  it("keeps a whole phrase that finds something, and leaves sizes whole", () => {
    expect(ids("Northern pike")).toEqual(ids("Northern pike + pike"));
    expect(ids("> 90 lb")).toEqual([]);
    expect(ids("cedar zebra")).toEqual([]);
  });

  it("finds a moon week by any of its words, and a time of day by the words anglers use", () => {
    for (const phase of ["new moon", "full moon"]) expect(ids(phase)).toEqual(ids(`near the ${phase}`));
    expect(ids("dusk")).toEqual(ids("evening"));
    expect(ids("sunrise")).toEqual(ids("dawn"));
    expect(ids("dawn").length).toBeGreaterThan(0);
  });

  it("doesn't take the words every moon week shares for a phase", () => {
    // Notes, waters and outings cleared, so only the moon could match.
    const bare = { spots: book.spots.map((spot) => ({ ...spot, name: "X", notes: "", bestConditions: "" })), trips: [], catches: book.catches.map((entry) => ({ ...entry, note: "", tripId: null })) };
    expect(findCatches(bare, "moon", t)).toEqual([]);
    expect(findCatches(bare, "full moon", t).length + findCatches(bare, "new moon", t).length).toBeGreaterThan(0);
  });
});
