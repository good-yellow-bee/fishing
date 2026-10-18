import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { Logbook } from "@stillwater/shared";
import { DayCalendar } from "./bests/DayCalendar";

const spot = { id: "own-lake", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" };
const fish = (id: string, caughtAt: string, tripId: string) =>
  ({ id, caughtAt: new Date(caughtAt).toISOString(), spotId: "own-lake", tripId, species: "Zander", lure: "Jig", measure: { kind: "length", value: 20, unit: "in" }, released: false, note: "" });

const book = {
  spots: [spot],
  trips: [
    { id: "a", date: "2026-10-04", spotId: "own-lake", title: "", note: "" },
    { id: "b", date: "2026-10-10", spotId: "own-lake", title: "", note: "" },
    { id: "c", date: "2026-10-18", spotId: "own-lake", title: "", note: "" },
    { id: "d", date: "2026-10-25", spotId: "own-lake", title: "", note: "" },
  ],
  catches: [fish("x", "2026-10-04T09:00:00", "a"), fish("y", "2026-10-04T10:00:00", "a")],
} as unknown as Logbook;

const draw = (today: string) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <DayCalendar book={book} year="2026" today={today} />
    </MemoryRouter>,
  );

describe("round 72 ideas: the calendar marks today and counts each month's days out", () => {
  it("names today's day and marks it as the current date", () => {
    const html = draw("2026-10-18");
    expect(html).toMatch(/class="day-planned day-today"/);
    expect(html).toMatch(/aria-current="date"/);
    expect(html).toMatch(/, today: an outing ahead/);
  });

  it("counts a fished day and a past blank outing as days out, not one still ahead", () => {
    const html = draw("2026-10-18");
    // The 4th (fish) and the 10th (a blank already past); today's and the 25th are still ahead.
    expect(html).toContain("2 days out");
    expect(html).toContain("2 fish");
  });
});
