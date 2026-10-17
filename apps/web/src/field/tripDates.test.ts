import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { datePicks, pastTitles } from "./tripDates";

describe("one-tap outing days", () => {
  it("adds the coming Saturday when it is neither today nor tomorrow", () => {
    // Wednesday 14 October 2026.
    expect(datePicks(new Date(2026, 9, 14, 9))).toEqual([
      { label: "Today", date: "2026-10-14" },
      { label: "Tomorrow", date: "2026-10-15" },
      { label: "Saturday", date: "2026-10-17" },
    ]);
  });

  it("offers the Saturday after on a Friday or a Saturday", () => {
    expect(datePicks(new Date(2026, 9, 16, 9)).at(-1)).toEqual({ label: "Next Saturday", date: "2026-10-24" });
    expect(datePicks(new Date(2026, 9, 17, 9)).at(-1)).toEqual({ label: "Next Saturday", date: "2026-10-24" });
  });
});

describe("names of earlier outings", () => {
  it("lists this water's names first, each once, never the game's", () => {
    const book = sampleLogbook(new Date(2026, 9, 14));
    const [first, second] = book.spots;
    book.trips = [
      { id: "tz1", date: "2026-10-01", spotId: second!.id, title: "Evening run", note: "" },
      { id: "tz2", date: "2026-09-01", spotId: first!.id, title: "Dawn patrol", note: "" },
      { id: "tz3", date: "2026-08-01", spotId: first!.id, title: "dawn patrol ", note: "" },
      { id: "tz4", date: "2026-10-05", spotId: "spot-stillwater", title: "Game day", note: "" },
      { id: "tz5", date: "2026-10-06", spotId: first!.id, title: " ", note: "" },
    ];
    expect(pastTitles(book, first!.id)).toEqual(["Dawn patrol", "Evening run"]);
  });
});
