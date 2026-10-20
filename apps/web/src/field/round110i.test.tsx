// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { SeasonRecapBox } from "./bests/SeasonRecap";

const fish = (id: string, spotId: string): CatchEntry => ({ id, species: "Perch", measure: { kind: "length", inches: 9 }, lure: "Jig", spotId, tripId: null, caughtAt: "2026-08-20T08:00:00.000Z", note: "", weather: null });

describe("round 110 ideas: the season's best water", () => {
  it("is named once one water clearly led, opening its fish", () => {
    const book: Logbook = { spots: [{ id: "a", name: "  Home   Lake ", waterType: "lake", notes: "", bestConditions: "" }, { id: "b", name: "Deep Lake", waterType: "lake", notes: "", bestConditions: "" }], trips: [], catches: [fish("1", "a"), fish("2", "a"), fish("3", "b")] };
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SeasonRecapBox book={book} year="2026" today="2026-10-20" waterLink={(water) => `/w/${water}`} />
      </MemoryRouter>,
    );
    expect(html).toContain("Best water: Home Lake (2)");
    expect(html).toContain('href="/w/Home Lake"');
  });
});
