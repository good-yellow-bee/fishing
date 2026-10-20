import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CatchEntry, Logbook, Spot, Trip } from "@stillwater/shared";
import { kindRates } from "./SpeciesPage";
import { WaterOptions } from "./WaterOptions";

const water = (id: string, name: string) => ({ id, name, waterType: "lake", notes: "", bestConditions: "" }) as Spot;
const fish = (id: string, spotId: string, tripId: string | null, species = "Roach") =>
  ({ id, species, measure: { kind: "length", inches: 8 }, lure: "Jig", spotId, tripId, caughtAt: "2026-10-01T08:00:00Z", note: "", weather: null }) as CatchEntry;
const trip = (id: string, spotId: string, date = "2026-10-01"): Trip => ({ id, date, spotId, title: "", note: "" }) as Trip;

describe("round 117 ideas: a kind's twin waters say how often their outings took it", () => {
  it("sums the twins' outings before asking for two", () => {
    const book: Logbook = { spots: [water("a", "Home Lake"), water("b", "home  lake")], trips: [trip("t1", "a"), trip("t2", "b", "2026-10-05")], catches: [fish("1", "a", "t1")] };
    const rateAt = kindRates(book, book.catches, "2026-10-19");
    // The kind's rows only name the twin that gave it: the blank twin's outing counts too, making two.
    expect(rateAt(["a"])).toEqual({ count: 1, total: 2 });
    expect(rateAt(["a", "b"])).toEqual({ count: 1, total: 2 });
  });
});

describe("round 117 ideas: a water picker tells twin waters apart", () => {
  const spots = [water("a", "Home Lake"), water("b", "home  lake"), water("c", "Deep Lake")];
  const book: Logbook = { spots, trips: [], catches: [fish("1", "a", null), fish("2", "a", null), fish("3", "b", null), fish("4", "c", null)] };
  const render = (shown: readonly Spot[]) =>
    renderToStaticMarkup(
      <select>
        <WaterOptions book={book} spots={shown} />
      </select>,
    );

  it("adds each twin's fish count, and leaves other waters as they were", () => {
    const html = render(spots);
    expect(html).toContain(">Home Lake · 2 fish<");
    expect(html).toContain(">home lake · 1 fish<");
    expect(html).toContain(">Deep Lake<");
  });

  it("says nothing when the list shows only one of them", () => {
    expect(render([spots[0]!, spots[2]!])).toContain(">Home Lake<");
  });
});
