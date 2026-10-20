import { afterEach, describe, expect, it, vi } from "vitest";
import { sampleLogbook, type CatchEntry, type Logbook } from "@stillwater/shared";
import { reloadLang, setLang } from "../i18n";
import { catchesCsv, tripsCsv } from "./catchCsv";
import { tripWhen } from "./format";
import { kindNames } from "./speciesLink";
import { stillGoing } from "./tripDates";
import { yearSummary } from "./summaries";
import { FIELD_NEWS } from "./fieldNews";
import { NEWS_ITEMS } from "../game/whatsNew";

afterEach(() => {
  vi.useRealTimers();
  setLang("en");
  reloadLang();
});

const base = sampleLogbook(new Date(2026, 9, 1)).catches[0]!;
const fish = (id: string, at: Date, species: string, tripId: string | null, spotId = "own"): CatchEntry => ({
  ...base,
  id,
  caughtAt: at.toISOString(),
  species,
  lure: "Jig ",
  tripId,
  spotId,
  measure: { kind: "length", inches: 20 },
});
const book: Logbook = {
  spots: [{ ...sampleLogbook(new Date(2026, 9, 1)).spots[0]!, id: "own", name: "Own Lake" }],
  trips: [
    { id: "morning", date: "2026-10-19", spotId: "own", title: "Morning perch", note: "" },
    { id: "night", date: "2026-10-18", spotId: "own", title: "Night zander", note: "" },
  ],
  catches: [
    fish("a", new Date(2026, 9, 19, 7), "Zander ", "morning"),
    fish("b", new Date(2026, 9, 19, 8, 30), "zander", "morning"),
    fish("c", new Date(2026, 9, 19, 15), "Zander", null),
    fish("d", new Date(2026, 9, 19, 16), "Zander", null),
  ],
};

describe("round 96: yesterday's outing in the small hours", () => {
  it("reads Last night only while it is still going", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 20, 1, 30));
    // Its fish came at 07:00 and 08:30, seventeen hours ago: a morning outing, long over.
    expect(stillGoing(book, book.trips[0]!)).toBe(false);
    // One with a fish at 22:00 is still out.
    const evening = { ...book, catches: [...book.catches, fish("e", new Date(2026, 9, 19, 22), "Zander", "morning")] };
    expect(stillGoing(evening, book.trips[0]!)).toBe(true);
    expect(tripWhen("2026-10-19", "2026-10-20", "2026-10-21", false)).toBe("Yesterday");
    setLang("pl");
    expect(tripWhen("2026-10-19", "2026-10-20", "2026-10-21", false)).toBe("Wczoraj");
    expect(tripWhen("2026-10-19", "2026-10-20", "2026-10-21")).toBe("Zeszłej nocy");
    vi.setSystemTime(new Date(2026, 9, 20, 9));
    expect(stillGoing(evening, book.trips[0]!)).toBe(false);
  });
});

describe("round 96: the exports", () => {
  it("names one kind written two ways once, in the reader's language", () => {
    setLang("pl");
    expect(kindNames(book.catches)(" zander")).toBe("Sandacz");
    const rows = catchesCsv(book).trimEnd().split("\r\n").slice(1);
    expect(rows.every((row) => row.split(";")[3] === "Sandacz" && row.split(";")[6] === "Jig")).toBe(true);
  });

  it("counts the fish logged loose that day on the outing's water in the outings sheet", () => {
    const rows = tripsCsv(book, "2026-10-20").trimEnd().split("\r\n");
    expect(rows[1]).toBe("2026-10-19,Morning perch,Own Lake,4,0,Zander ×4,Jig ×4,0,0,");
  });

  it("writes the year's longest without a stray space, and the goal line without a full stop", () => {
    const text = yearSummary(book, "2026", "2026-10-20", 3);
    expect(text).toContain("Longest: Zander, 20 in");
    expect(text).toContain("Goal reached: 4 of 3 fish in 2026\n");
  });
});

describe("round 96: Home's news", () => {
  it("finds field-log lines among the news", () => {
    // Other threads add the game's lines on top, so not only the newest line is checked.
    expect(NEWS_ITEMS.filter((item) => FIELD_NEWS.has(item)).length).toBeGreaterThanOrEqual(2);
  });
});
