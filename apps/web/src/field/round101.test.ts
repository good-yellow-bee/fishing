import { afterEach, describe, expect, it } from "vitest";
import { personalBests, type CatchEntry, type Logbook } from "@stillwater/shared";
import { setLang, t } from "../i18n";
import { findCatches } from "./CatchSearch";
import { catchesCsv } from "./catchCsv";
import { pieceName } from "./gear/pieceKey";
import { tripForFish } from "./suggestions";

const fish = (id: string, over: Partial<CatchEntry> = {}): CatchEntry => ({
  id,
  species: "Perch",
  measure: { kind: "length", inches: 11 },
  lure: "Spinner",
  spotId: "own",
  tripId: null,
  caughtAt: "2026-08-20T08:00:00.000Z",
  note: "",
  weather: null,
  ...over,
});

afterEach(() => setLang("en"));

describe("round 101: a dawn and a dusk on one water", () => {
  const at = (hh: string) => new Date(`2026-08-20T${hh}`).toISOString();
  const book: Logbook = {
    spots: [{ id: "own", name: "Home Lake", waterType: "lake", notes: "", bestConditions: "" }],
    trips: [
      { id: "dawn", date: "2026-08-20", spotId: "own", title: "Dawn", note: "" },
      { id: "dusk", date: "2026-08-20", spotId: "own", title: "Dusk", note: "" },
    ],
    catches: [fish("d1", { tripId: "dawn", caughtAt: at("05:40") }), fish("k1", { tripId: "dusk", caughtAt: at("20:20") }), fish("k2", { tripId: "dusk", caughtAt: at("20:50") })],
  };

  it("files a loose fish on the outing whose fish came nearest its time", () => {
    expect(tripForFish(book, "own", "2026-08-20T20:35")?.id).toBe("dusk");
    expect(tripForFish(book, "own", "2026-08-20T06:10")?.id).toBe("dawn");
  });

  it("gives a dusk with no fish yet its first one, hours after the dawn's", () => {
    const fresh = { ...book, catches: book.catches.filter((entry) => entry.tripId === "dawn") };
    expect(tripForFish(fresh, "own", "2026-08-20T20:30")?.id).toBe("dusk");
    expect(tripForFish(fresh, "own", "2026-08-20T06:30")?.id).toBe("dawn");
  });
});

describe("round 101: a lure or kind however it was typed", () => {
  it("reads as the dictionary's name in Polish, trimmed in English", () => {
    expect(pieceName("spinner ")).toBe("spinner");
    setLang("pl");
    expect(pieceName("spinner ")).toBe(t("Spinner"));
    expect(pieceName("walleye ")).toBe(t("Walleye"));
  });

  it("is found under its Polish name", () => {
    setLang("pl");
    const book: Logbook = { spots: [], trips: [], catches: [fish("a"), fish("b", { lure: "spinner " }), fish("c", { species: "walleye " }), fish("d", { species: "Walleye" })] };
    const ids = (needle: string) => findCatches(book, needle, t).map((entry) => entry.id).sort();
    expect(ids(t("Spinner").toLowerCase())).toEqual(["a", "b", "c", "d"]);
    expect(ids(`species:"${t("Walleye")}"`)).toEqual(["c", "d"]);
  });

  it("goes in the CSV under one name", () => {
    setLang("pl");
    const csv = catchesCsv({ spots: [], trips: [], catches: [fish("a"), fish("b", { lure: "spinner " })] });
    expect(csv).not.toMatch(/,spinner ?,/);
  });
});

describe("round 101: of two fish the same size", () => {
  it("the one caught first holds the mark, whatever order the book stored them in", () => {
    const later = fish("late", { caughtAt: "2026-08-20T08:00:00.000Z" });
    const first = fish("first", { caughtAt: "2026-01-27T08:00:00.000Z" });
    expect(personalBests({ spots: [], trips: [], catches: [later, first] }).longest?.id).toBe("first");
  });
});
