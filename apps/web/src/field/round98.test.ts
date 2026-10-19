import { afterEach, describe, expect, it, vi } from "vitest";
import { sampleLogbook, type CatchEntry, type Logbook } from "@stillwater/shared";
import { reloadLang, setLang, t } from "../i18n";
import { kindNames } from "./speciesLink";
import { seasonRecap } from "./bests/seasonRecap";
import { kindPairs } from "./bests/kindPairs";
import { hookTally } from "./hookTally";
import { yearSummary } from "./summaries";
import { bookSpelling } from "./gear/pieceKey";

afterEach(() => {
  vi.useRealTimers();
  setLang("en");
  reloadLang();
});

const base = sampleLogbook(new Date(2026, 9, 1)).catches[0]!;
const fish = (id: string, at: Date, species: string, tripId: string | null, lure = "Spinners"): CatchEntry => ({
  ...base,
  id,
  caughtAt: at.toISOString(),
  species,
  lure,
  tripId,
  spotId: "own",
  measure: { kind: "length", inches: 20 },
});
const book: Logbook = {
  spots: [{ ...sampleLogbook(new Date(2026, 9, 1)).spots[0]!, id: "own", name: "Own Lake" }],
  trips: [
    { id: "sat", date: "2026-10-03", spotId: "own", title: "Saturday", note: "", lost: 1 },
    { id: "wed", date: "2026-10-14", spotId: "own", title: "Wednesday", note: "" },
    { id: "eve", date: "2026-10-19", spotId: "own", title: "Evening perch", note: "" },
  ],
  catches: [
    fish("a", new Date(2026, 9, 3, 7), "zander ", "sat"),
    // Logged loose on the Saturday outing's water that day: that outing's fish, as Trips counts it.
    fish("b", new Date(2026, 9, 3, 9), "Zander", null, "Spinner"),
  ],
};

describe("round 98: just after midnight, last evening's outing is not yet a blank", () => {
  it("leaves it out of the season's days and outings until four", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 20, 0, 20));
    const recap = seasonRecap(book, "2026", "2026-10-20");
    expect(recap.days).toBe(2);
    expect(recap.outings).toBe(2);
    expect(yearSummary(book, "2026", "2026-10-20", null)).toContain("Outings: 2");
    vi.setSystemTime(new Date(2026, 9, 20, 9));
    expect(seasonRecap(book, "2026", "2026-10-20").days).toBe(3);
  });
});

describe("round 98: fish an outing counts fish logged loose on its water that day", () => {
  it("in the season box and the landed of hooked line", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 20, 9));
    expect(seasonRecap(book, "2026", "2026-10-20").outingFish).toBe(2);
    expect(hookTally(book)?.landed).toBe(2);
  });
});

describe("round 98: kinds and lures read in the reader's language however they were typed", () => {
  it("names zander as Sandacz and Spinners as one piece in Polish", () => {
    setLang("pl");
    expect(kindNames(book.catches)("zander ")).toBe("Sandacz");
    expect(t(bookSpelling("Spinners"))).toBe(t("Spinner"));
    expect(yearSummary(book, "2026", "2026-10-20", null)).toContain("Obrotówka (2)");
  });

  it("offers to join a kind typed by hand with its Polish name", () => {
    const inPolish = (name: string) => (bookSpelling(name) === "Zander" ? "Sandacz" : name);
    const pairs = kindPairs([...book.catches, fish("c", new Date(2026, 9, 14, 8), "Sandacz", "wed")], (name) => name, inPolish);
    expect(pairs).toHaveLength(1);
  });

  it("says the goal box lines in Polish as labels", () => {
    setLang("pl");
    expect(t("By this date last year: {n}", { n: 4 })).toBe("Rok temu do tego dnia: 4");
    expect(t("On pace for {pace} by the year's end", { pace: 9 })).toBe("W tym tempie do końca roku: 9");
  });
});
