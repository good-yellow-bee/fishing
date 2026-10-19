// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import type { Logbook } from "@stillwater/shared";
import { setLang } from "../i18n";
import { calendarNotes } from "./TripPages";

afterEach(() => setLang("en"));

describe("round 91: what is still to pack, in the reader's language", () => {
  it("names the list's pieces as the page does, in the calendar notes and the copied plan", () => {
    setLang("pl");
    const book: Logbook = { spots: [{ id: "own-lake", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" }], trips: [{ id: "p", date: "2026-10-24", spotId: "own-lake", title: "Next Sat", note: "" }], catches: [] };
    const items = [
      { id: "a", tripId: "p", label: "Landing net", packed: false },
      { id: "b", tripId: "p", label: "Spoon", packed: false },
      { id: "c", tripId: "p", label: "Jig", packed: true },
    ];
    expect(calendarNotes(book, book.trips[0]!, items)).toContain("Do spakowania: Podbierak, Wahadłówka");
  });
});
