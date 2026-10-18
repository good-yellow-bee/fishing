import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { t } from "../i18n";
import { findCatches } from "./CatchSearch";
import { countedSearch } from "./countedSearch";
import { countedFish } from "./milestones";

describe("a link that opens the fish counted", () => {
  const sample = sampleLogbook(new Date(2026, 9, 15));
  const mine = { ...sample.catches[0]!, id: "mine-1", caughtAt: new Date(2026, 9, 14, 9).toISOString() };
  const book = { ...sample, catches: [...sample.catches, mine] };

  it("leaves the sample week out once the angler has a fish of their own", () => {
    const month = "2026-10";
    const rows = book.catches.filter((entry) => entry.caughtAt.startsWith(month));
    const term = countedSearch(book, month, rows);
    const counted = new Set(countedFish(book.catches).map((entry) => entry.id));
    expect(findCatches(book, term, t).map((entry) => entry.id)).toEqual(rows.filter((entry) => counted.has(entry.id)).map((entry) => entry.id));
    expect(findCatches(book, countedSearch(book, "", book.catches).trim(), t).map((entry) => entry.id)).toEqual(["mine-1"]);
  });

  it("keeps the sample week while it is all the book has", () => {
    expect(countedSearch(sample, "2026-10", sample.catches)).toBe("2026-10");
  });
});
