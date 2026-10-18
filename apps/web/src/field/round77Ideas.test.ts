import { describe, expect, it } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { photoYears } from "./PhotosPage";
import { sameDayBefore } from "./sameDayBefore";
import { bookFishDay } from "./tripMonths";

const fish = (id: string, caughtAt: string) =>
  ({ id, species: "Zander", lure: "Jig", spotId: "home", tripId: null, caughtAt: new Date(caughtAt).toISOString(), measure: { kind: "length", inches: 20 }, notes: "" }) as unknown as CatchEntry;

describe("round 77 ideas: a fish's page says how the same day went in an earlier year", () => {
  const catches = [fish("now", "2026-10-18T09:00:00"), fish("a", "2025-10-18T07:00:00"), fish("b", "2025-10-18T08:00:00"), fish("c", "2024-10-18T08:00:00"), fish("d", "2025-10-17T08:00:00")];
  const book = { spots: [], trips: [], catches } as unknown as Logbook;
  const all = new Set(catches.map((entry) => entry.id));

  it("names the latest earlier year and its fish, searched by that day", () => {
    expect(sameDayBefore(book, "2026-10-18", all, "sample")).toEqual({ day: "2025-10-18", count: 2, search: "2025-10-18" });
  });

  it("says nothing on the first such day", () => {
    expect(sameDayBefore(book, "2024-10-18", all, "sample")).toBeNull();
  });

  it("counts only the fish counted", () => {
    expect(sameDayBefore(book, "2026-10-18", new Set(["now", "c"]), "sample")?.day).toBe("2024-10-18");
  });
});

describe("round 77 ideas: Photos by year", () => {
  it("counts each year's photos, newest first, a night fish on its outing's day", () => {
    const nye = fish("n", "2026-01-01T00:40:00");
    const book = { spots: [], trips: [{ id: "t", date: "2025-12-31", spotId: "home", title: "", note: "" }], catches: [{ ...nye, tripId: "t" }, fish("x", "2026-06-01T09:00:00")] } as unknown as Logbook;
    expect(photoYears(book.catches, (entry) => bookFishDay(book, entry).slice(0, 4))).toEqual([["2026", 1], ["2025", 1]]);
  });
});
