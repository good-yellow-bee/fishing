import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { t } from "../i18n";
import { bookBadges } from "./catchBadge";
import { findCatches } from "./CatchSearch";

describe("record in a search", () => {
  const book = sampleLogbook(new Date(2026, 9, 15));

  it("finds the fish that carry a best badge", () => {
    const badged = [...bookBadges(book).keys()].sort();
    expect(badged.length).toBeGreaterThan(0);
    expect(findCatches(book, "record", t).map((entry) => entry.id).sort()).toEqual(badged);
    expect(findCatches(book, "PB", t)).toHaveLength(badged.length);
    expect(findCatches(book, "rekordy", t)).toHaveLength(badged.length);
  });
});
