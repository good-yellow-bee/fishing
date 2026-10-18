// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Logbook } from "@stillwater/shared";
import { t } from "../i18n";
import { SeasonRecapBox } from "./bests/SeasonRecap";
import { emptyText } from "./CatchSearch";

const fish = (id: string, caughtAt: string, tripId: string) =>
  ({ id, caughtAt: new Date(caughtAt).toISOString(), spotId: "own", tripId, species: "Zander", lure: "Jig", measure: { kind: "length", value: 20, unit: "in" }, released: false, note: "" });

const book = {
  spots: [{ id: "own", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" }],
  trips: [
    { id: "nye", date: "2025-12-31", spotId: "own", title: "", note: "" },
    { id: "may", date: "2025-05-04", spotId: "own", title: "", note: "" },
  ],
  catches: [fish("a", "2025-12-31T23:10:00", "nye"), fish("b", "2026-01-01T00:40:00", "nye"), fish("c", "2025-05-04T09:00:00", "may")],
} as unknown as Logbook;

describe("round 74 ideas: a season's recap names its best day", () => {
  it("counts a night outing's small hours on its day", () => {
    const html = renderToStaticMarkup(<SeasonRecapBox book={book} year="2025" today="2026-01-20" />);
    expect(html).toContain("Best day: Wed, Dec 31, 2025 · 2 fish");
  });

  it("leaves it out when no day had more than one fish", () => {
    const one = { ...book, catches: book.catches.slice(2) } as Logbook;
    expect(renderToStaticMarkup(<SeasonRecapBox book={one} year="2025" today="2026-01-20" />)).not.toContain("Best day");
  });
});

describe("round 74 ideas: a year search with no fish says why", () => {
  it("says where the book starts for a year before it", () => {
    expect(emptyText(book, "2024", t)).toBe("No fish in 2024. The book starts in 2025.");
  });

  it("says only that the year had none after the book began", () => {
    expect(emptyText(book, "2026", t)).toBe("No fish in 2026.");
  });

  it("keeps the plain line for other searches", () => {
    expect(emptyText(book, "trout", t)).toBe("Nothing in the book matches that.");
  });
});
