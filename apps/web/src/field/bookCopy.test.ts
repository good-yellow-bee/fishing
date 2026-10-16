import { afterEach, describe, expect, it, vi } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { COPY_AGAIN_AFTER, COPY_AGAIN_DAYS, FIRST_COPY_AT, bookSignature, changedDaysSince, clearCopiedAt, copyNudge, ownCatches, readCopiedAt, readCopyMark, saveCopiedAt } from "./bookCopy";

describe("remind to download a copy of the book", () => {
  it("stays quiet until the book has some of the player's own catches", () => {
    expect(copyNudge(FIRST_COPY_AT - 1, null)).toBeNull();
    expect(copyNudge(FIRST_COPY_AT, null)).toEqual({ kind: "never" });
  });

  it("asks again once enough catches came in since the last copy", () => {
    expect(copyNudge(40, 40 - COPY_AGAIN_AFTER + 1)).toBeNull();
    expect(copyNudge(40, 40 - COPY_AGAIN_AFTER)).toEqual({ kind: "since", count: COPY_AGAIN_AFTER });
    // A book that shrank since the copy owes nothing.
    expect(copyNudge(3, 30)).toBeNull();
  });

  it("asks again a month after a copy when the book has changed since", () => {
    expect(copyNudge(12, 12, COPY_AGAIN_DAYS)).toEqual({ kind: "old", days: COPY_AGAIN_DAYS });
    expect(copyNudge(12, 12, COPY_AGAIN_DAYS - 1)).toBeNull();
    expect(copyNudge(12, 12, null)).toBeNull();
    // The sample week alone owes nothing.
    expect(copyNudge(0, 0, 90)).toBeNull();
    const book = sampleLogbook(new Date(2026, 9, 15));
    const sig = bookSignature(book);
    const at = Date.parse("2026-09-01T00:00:00Z");
    expect(changedDaysSince({ at, sig }, sig, Date.parse("2026-10-16T00:00:00Z"))).toBeNull();
    expect(changedDaysSince({ at, sig }, bookSignature({ ...book, trips: [] }), Date.parse("2026-10-16T00:00:00Z"))).toBe(45);
  });

  it("doesn't count the sample week's fish", () => {
    const sample = sampleLogbook(new Date());
    expect(ownCatches(sample)).toBe(0);
    const mine = { ...sample.catches[0]!, id: "mine-1" };
    expect(ownCatches({ ...sample, catches: [...sample.catches, mine] })).toBe(1);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("remembers the last copy and forgets it for a fresh start", () => {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    });
    saveCopiedAt(12);
    expect(readCopiedAt()).toBe(12);
    // A copy from before fingerprints can't say whether the book changed.
    expect(readCopyMark()).toBeNull();
    saveCopiedAt(12, "abc");
    expect(readCopyMark()?.sig).toBe("abc");
    clearCopiedAt();
    expect(readCopiedAt()).toBeNull();
  });
});
