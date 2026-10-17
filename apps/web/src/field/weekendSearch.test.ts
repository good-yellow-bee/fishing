import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { t } from "../i18n";
import { findCatches } from "./CatchSearch";

describe("weekend in a search", () => {
  const book = sampleLogbook(new Date(2026, 9, 15));

  it("finds the fish caught on a Saturday or a Sunday", () => {
    const found = findCatches(book, "weekend", t);
    const expected = book.catches.filter((entry) => [0, 6].includes(new Date(entry.caughtAt).getDay())).length;
    expect(found).toHaveLength(expected);
    expect(findCatches(book, "Weekendy", t)).toHaveLength(expected);
  });
});
