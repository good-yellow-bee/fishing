// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { parseCatchDraft, sampleLogbook, type CatchDraft, type CatchEntry, type Logbook } from "@stillwater/shared";
import { setLang, setUnits } from "../i18n";
import { lengthText } from "../i18n/content";
import { catchBadge } from "./catchBadge";
import { catchNews } from "./catchNews";
import { PagedCatches } from "./PagedCatches";

afterEach(() => {
  setLang("en");
  setUnits("imperial");
});

const ownLake = { id: "own-lake", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" } as Logbook["spots"][number];

describe("round 89: an outing of their own retires the sample week on the fish pages too", () => {
  it("leaves the sample's heaviest without a book record, as Home and Bests count it", () => {
    const sample = sampleLogbook(new Date());
    const book: Logbook = { ...sample, spots: [...sample.spots, ownLake], trips: [...sample.trips, { id: "plan", date: "2099-01-01", spotId: "own-lake", title: "", note: "" }] };
    const heaviest = [...sample.catches].filter((entry) => entry.measure.kind === "weight").sort((a, b) => (b.measure as { pounds: number }).pounds - (a.measure as { pounds: number }).pounds)[0]!;
    expect(catchBadge(sample, heaviest)).toBe("book");
    expect(catchBadge(book, heaviest)).toBeNull();
  });
});

describe("round 89: a fish's time", () => {
  const book: Logbook = { spots: [ownLake], trips: [{ id: "dawn", date: "2026-09-20", spotId: "own-lake", title: "Dawn", note: "" }], catches: [] };
  const draft: CatchDraft = { species: "Zander", measureKind: "length", amount: "20", lure: "Jig", spotId: "own-lake", tripId: "", caughtAt: "1026-10-18T08:00", note: "", sky: "", wind: "", waterTemp: "" };

  it("refuses a year before 1900", () => {
    expect(parseCatchDraft(draft, book)).toMatchObject({ ok: false, field: "caughtAt", message: "Check the year." });
  });

  it("keeps an edited fish's stored instant, on its outing, whatever day this zone reads it on", () => {
    const stored = "2026-09-20T05:30:00.000Z";
    // Read in another zone, the same instant falls the evening before the outing's day.
    const edited = { ...draft, tripId: "dawn", caughtAt: "2026-09-19T22:30", keptAt: stored };
    expect(parseCatchDraft(edited, book)).toMatchObject({ ok: true, value: { caughtAt: stored, tripId: "dawn" } });
    expect(parseCatchDraft({ ...edited, keptAt: undefined }, book)).toMatchObject({ ok: false, field: "tripId" });
  });
});

describe("round 89: Catches' month headings count the angler's own fish", () => {
  const items = ["a", "s1", "s2"];
  const html = (counted: (item: string) => boolean) =>
    renderToStaticMarkup(
      <PagedCatches items={items} monthOf={() => "2026-10"} headLevel={2} counted={counted}>
        {(item) => <p key={item}>{item}</p>}
      </PagedCatches>,
    );

  it("and says the sample week's and the game's apart", () => {
    expect(html((item) => item === "a")).toContain("October 2026 · 1 fish · +2 from the sample week or the game");
  });

  it("names a month of only those as theirs", () => {
    setLang("pl");
    expect(html(() => false)).toContain("Październik 2026 · 3 z przykładowego tygodnia lub z gry");
  });
});

describe("round 89: metric lengths", () => {
  it("come back to the tenth as typed", () => {
    setLang("pl");
    setUnits("metric");
    expect(lengthText(Number((45.5 / 2.54).toFixed(3)))).toBe("45,5 cm");
    expect(lengthText(28)).toBe("71,1 cm");
    expect(lengthText(Number((50 / 2.54).toFixed(3)))).toBe("50 cm");
  });

  it("never print a new best the same size as the one it beat", () => {
    setUnits("metric");
    const fish = (id: string, inches: number) => ({ id, species: "Zander", measure: { kind: "length", inches }, lure: "Jig", spotId: "own-lake", tripId: null, caughtAt: "2026-10-01T08:00:00.000Z", note: "", weather: null }) as CatchEntry;
    const book: Logbook = { spots: [ownLake], trips: [], catches: [fish("a", 45.2 / 2.54)] };
    expect(catchNews(book, fish("b", 45.4 / 2.54))).toContain("45.4 cm (was 45.2 cm)");
    expect(catchNews(book, fish("c", 45.21 / 2.54)) ?? "").not.toContain("was");
  });
});
