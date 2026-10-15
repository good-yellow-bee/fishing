import { afterEach, describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { setLang } from "../i18n";
import { localizeSample } from "./sampleText";

describe("the sample week in the reader's language", () => {
  afterEach(() => setLang("en"));

  it("puts the sample's waters, trips and notes into Polish and leaves the player's own words", () => {
    setLang("pl");
    const book = sampleLogbook(new Date(2026, 9, 1));
    const mill = book.spots.find((spot) => spot.id === "spot-mill")!;
    const mine = { ...mill, id: "mine", name: "Lake" };
    const shown = localizeSample({ ...book, spots: [...book.spots, mine] });
    expect(shown.spots.find((spot) => spot.id === "spot-mill")!.name).toBe("Młynówka");
    expect(shown.spots.find((spot) => spot.id === "mine")!.name).toBe("Lake");
    expect(shown.trips.find((trip) => trip.title === "Pod młynem")).toBeTruthy();
    expect(shown.catches.some((entry) => entry.note === "Wzięła na łuku przez wypłycenie.")).toBe(true);
  });

  it("changes nothing in English", () => {
    const book = sampleLogbook(new Date(2026, 9, 1));
    expect(localizeSample(book)).toEqual(book);
  });
});
