import { describe, expect, it } from "vitest";
import type { Logbook, Trip } from "@stillwater/shared";
import { findTrips } from "./tripSearch";
import { isTimeWord } from "./CatchSearch";
import { tripIcs } from "./tripIcs";
import { daysAheadLabel } from "./format";

const trip = (id: string, date: string, note = "") => ({ id, date, spotId: "own", title: "", note }) as Trip;
const id = (text: string) => text.split("|")[0]!;

describe("round 82 ideas: the outing search reads a time of day", () => {
  const book = {
    spots: [{ id: "own", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" }],
    trips: [trip("late", "2026-10-10"), trip("early", "2026-10-11"), trip("said", "2026-10-12", "stayed into the night")],
    catches: [],
  } as unknown as Logbook;
  const nightFish = new Set(["late"]);
  const find = (needle: string) =>
    findTrips(book, needle, () => 0, "2026-10-18", id, new Date(2026, 9, 18, 12), undefined, (part) => (isTimeWord(part, id) ? nightFish : null)).map((each) => each.id);

  it("knows the words for a time of day, from three letters", () => {
    expect(isTimeWord("night", id)).toBe(true);
    expect(isTimeWord("nocą", id)).toBe(true);
    expect(isTimeWord("dusk", id)).toBe(true);
    expect(isTimeWord("ni", id)).toBe(false);
    expect(isTimeWord("pike", id)).toBe(false);
  });

  it("finds the outings with a fish then, and those whose note says it", () => {
    expect(find("night")).toEqual(["said", "late"]);
  });
});

describe("round 82 ideas: the calendar file carries what to know before going", () => {
  it("adds the lines after the note", () => {
    const text = tripIcs({ ...trip("t", "2026-10-25", "Bring the waders"), title: "Own Lake" }, "Own Lake", new Date(2026, 9, 18), undefined, ["Works here: Jig", "Still to pack: Net"]);
    expect(text).toContain("DESCRIPTION:Bring the waders\\nWorks here: Jig\\nStill to pack: Net");
  });
});

describe("round 82 ideas: a plan says how many days are left", () => {
  it("counts from two days ahead", () => {
    expect(daysAheadLabel("2026-10-25", "2026-10-18")).toBe("in 7 days");
    expect(daysAheadLabel("2026-10-19", "2026-10-18")).toBe("");
    expect(daysAheadLabel("2026-10-10", "2026-10-18")).toBe("");
  });
});
