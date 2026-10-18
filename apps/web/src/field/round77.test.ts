import { describe, expect, it } from "vitest";
import { sampleLogbook, type CatchEntry, type Logbook } from "@stillwater/shared";
import { t } from "../i18n";
import { anotherCatchLink } from "./anotherCatch";
import { catchList, largestList } from "./catchList";
import { largestFirst } from "./largestFirst";
import { longGap } from "./sizeRank";
import { bookFishDay } from "./tripMonths";

const fish = (id: string, caughtAt: string, extra: Partial<CatchEntry> = {}) =>
  ({ id, species: "Zander", lure: "Jig", spotId: "home", tripId: null, caughtAt, measure: { kind: "length", inches: 20 }, notes: "", ...extra }) as unknown as CatchEntry;

describe("round 77: a night fish's gap counts from its outing's day", () => {
  const nye = { id: "nye", date: "2025-12-31", spotId: "home", title: "NYE", note: "" };
  const night = fish("c2", new Date(2026, 0, 1, 0, 40).toISOString(), { tripId: "nye" });
  const summer = fish("e2", new Date(2026, 7, 15, 9).toISOString());
  const book = { spots: [], trips: [nye], catches: [night, summer] } as unknown as Logbook;

  it("reads 227 days from Dec 31, not 226 from the clock's Jan 1", () => {
    expect(longGap(book.catches, summer)?.days).toBe(226);
    expect(longGap(book.catches, summer, (entry) => bookFishDay(book, entry))?.days).toBe(227);
  });
});

describe("round 77: a search shown largest first steps largest first", () => {
  const book = sampleLogbook(new Date(2026, 9, 15));
  const none = () => false;
  const pike = largestFirst(book.catches.filter((entry) => entry.species === "Northern pike"));

  it("keeps to the search, biggest down, and leads back to the same order", () => {
    const list = catchList(book, "catches-largest:pike", pike[0]!.id, t, none)!;
    expect(list.rows.map((row) => row.id)).toEqual(largestFirst(list.rows).map((row) => row.id));
    expect(list.rows[0]!.id).toBe(pike[0]!.id);
    expect(list.back).toBe("/catches?find=pike&order=largest");
    expect(catchList(book, "find-largest:pike", pike[0]!.id, t, none)?.back).toBe("/?find=pike&order=largest");
    expect(largestList(list.key)).toBe(true);
    expect(largestList("catches:pike")).toBe(false);
  });
});

describe("round 77: another like a sample fish isn't put on its made-up water", () => {
  it("leaves the water out of the form's link when none is given", () => {
    const link = anotherCatchLink({ spotId: "", species: "Northern pike", lure: "Spinnerbait", tripId: null, measure: { kind: "weight" } });
    expect(link).not.toContain("spot=");
    expect(link).toContain("species=Northern+pike");
  });
});
