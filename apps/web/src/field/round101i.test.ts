import { afterEach, describe, expect, it } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { setLang } from "../i18n";
import { afterOneBefore } from "./CatchPages";
import { toBookAmount } from "./unitsInput";

const fish = (id: string, caughtAt: string, tripId: string | null = "t"): CatchEntry => ({
  id,
  species: "Perch",
  measure: { kind: "length", inches: 10 },
  lure: "Jig",
  spotId: "own",
  tripId,
  caughtAt,
  note: "",
  weather: null,
});

afterEach(() => setLang("en"));

describe("round 101 ideas: the wait since the fish before", () => {
  const book: Logbook = {
    spots: [],
    trips: [{ id: "t", date: "2026-08-20", spotId: "own", title: "Home Lake", note: "" }],
    catches: [fish("a", "2026-08-20T18:00:00.000Z"), fish("b", "2026-08-20T19:05:00.000Z"), fish("c", "2026-08-20T19:45:00.000Z"), fish("loose", "2026-08-20T19:50:00.000Z", null)],
  };

  it("names it from the outing's third fish on", () => {
    expect(afterOneBefore(book, book.catches[2]!)).toBe("40 min after the one before");
    expect(afterOneBefore(book, book.catches[1]!)).toBeNull();
    expect(afterOneBefore(book, book.catches[3]!)).toBeNull();
  });

  it("reads in Polish", () => {
    setLang("pl");
    expect(afterOneBefore(book, book.catches[2]!)).toBe("40 min po poprzedniej");
  });
});

describe("round 101 ideas: a length in feet and inches", () => {
  it("reads in any units", () => {
    for (const units of ["imperial", "metric"] as const) {
      expect(toBookAmount("1 ft 2 in", "length", units)).toBe("14");
      expect(toBookAmount(`2' 3"`, "length", units)).toBe("27");
      expect(toBookAmount("2 ft", "length", units)).toBe("24");
      expect(toBookAmount("2ft 3.5", "length", units)).toBe("27.5");
      expect(toBookAmount("2’ 3”", "length", units)).toBe("27");
      expect(toBookAmount("2′ 3″", "length", units)).toBe("27");
    }
  });

  it("leaves inches past a foot and weights for the form to refuse", () => {
    expect(toBookAmount("1 ft 14 in", "length", "imperial")).toBe("1 ft 14 in");
    expect(toBookAmount("2 ft", "weight", "imperial")).toBe("2 ft");
  });
});
