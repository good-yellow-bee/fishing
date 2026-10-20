import { afterEach, describe, expect, it, vi } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { tripsCsv } from "./catchCsv";

afterEach(() => vi.useRealTimers());

describe("round 114 ideas: the outings sheet's fish times", () => {
  it("say when each outing's fish came, first to last", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 20, 12, 0));
    const fish = (id: string, tripId: string, hour: number, minute: number): CatchEntry => ({ id, species: "Perch", measure: { kind: "length", inches: 9 }, lure: "Jig", spotId: "a", tripId, caughtAt: new Date(2026, 9, 18, hour, minute).toISOString(), note: "", weather: null });
    const book: Logbook = {
      spots: [{ id: "a", name: "Pine Pond", waterType: "pond", notes: "", bestConditions: "" }],
      trips: [{ id: "dawn", date: "2026-10-18", spotId: "a", title: "Dawn", note: "" }, { id: "dusk", date: "2026-10-18", spotId: "a", title: "Dusk", note: "" }],
      catches: [fish("1", "dawn", 5, 30), fish("2", "dawn", 6, 10), fish("3", "dusk", 18, 0)],
    };
    const csv = tripsCsv(book, "2026-10-20");
    expect(csv).toContain("05:30–06:10");
    expect(csv).toMatch(/Dusk[^\n]*,18:00,/);
  });
});
