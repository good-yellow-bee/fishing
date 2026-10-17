import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { t } from "../i18n";
import { findCatches } from "./CatchSearch";

describe("first in a search", () => {
  const book = sampleLogbook(new Date(2026, 9, 15));

  it("finds the earliest fish of each kind", () => {
    const kinds = new Set(book.catches.map((entry) => entry.species.trim().toLowerCase()));
    const found = findCatches(book, "first", t);
    expect(found).toHaveLength(kinds.size);
    for (const entry of found) {
      expect(book.catches.some((other) => other.species === entry.species && other.caughtAt < entry.caughtAt)).toBe(false);
    }
    expect(findCatches(book, "pierwsze", t)).toHaveLength(kinds.size);
  });
});
