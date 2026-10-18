import { afterEach, describe, expect, it, vi } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { COPY_AGAIN_AFTER, COPY_AGAIN_DAYS, FIRST_COPY_AT, bookSignature, changedDaysSince, clearCopiedAt, copyNudge, hasSampleFish, hasSampleLeft, isSampleOnly, isSampleTrip, ownCatches, upcomingRealTrips, withoutSample, readCopiedAt, readCopyMark, saveCopiedAt } from "./bookCopy";

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

  it("keeps the fingerprint copies already saved, with the book hashed once", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    // The fingerprint as it was first written: FNV-1a over the whole text at once.
    const whole = (text: string) => {
      let hash = 0x811c9dc5;
      for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
      }
      return (hash >>> 0).toString(16);
    };
    expect(bookSignature(book)).toBe(whole(JSON.stringify([book, [], [], null])));
    expect(bookSignature(book, [], ["b", "a"], { 2026: 40 })).toBe(whole(JSON.stringify([book, [], ["a", "b"], { 2026: 40 }])));
    // Asked again for the same book, the answer is the same.
    expect(bookSignature(book, [], ["b", "a"], { 2026: 40 })).toBe(whole(JSON.stringify([book, [], ["a", "b"], { 2026: 40 }])));
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

describe("a book that is still only the sample", () => {
  it("takes the sample week out, keeping what holds the player's own fish", () => {
    const book = sampleLogbook(new Date());
    const trip = book.trips[0]!;
    const own = { ...book.catches[0]!, id: "own-zq1", tripId: trip.id, spotId: trip.spotId };
    const left = withoutSample({ ...book, catches: [...book.catches, own] });
    expect(left.catches.map((entry) => entry.id)).toEqual(["own-zq1"]);
    expect(left.trips.map((each) => each.id)).toEqual([trip.id]);
    expect(left.spots.map((spot) => spot.id)).toEqual([trip.spotId]);
    expect(hasSampleFish(left)).toBe(false);
    expect(hasSampleLeft(left)).toBe(false);
    expect(hasSampleLeft({ ...book, catches: [own] })).toBe(true);
    expect(hasSampleFish(book)).toBe(true);
  });

  it("knows the sample week's outings", () => {
    expect(isSampleTrip(sampleLogbook(new Date()).trips[0]!.id)).toBe(true);
    expect(isSampleTrip("trip-my-own-zz")).toBe(false);
  });

  it("is the sample until the player's own water or fish arrives", () => {
    const sample = sampleLogbook(new Date(2026, 9, 15));
    expect(isSampleOnly(sample)).toBe(true);
    expect(isSampleOnly({ ...sample, catches: [...sample.catches, { ...sample.catches[0]!, id: "mine" }] })).toBe(false);
    expect(isSampleOnly({ ...sample, trips: [...sample.trips, { ...sample.trips[0]!, id: "mine" }] })).toBe(false);
    expect(isSampleOnly({ ...sample, spots: [...sample.spots, { ...sample.spots[0]!, id: "my-pond" }] })).toBe(false);
    expect(isSampleOnly({ spots: [], trips: [], catches: [] })).toBe(false);
    // A round on the game's lake leaves it the sample.
    const lake = { id: "spot-stillwater", name: "Stillwater", waterType: "lake" as const, notes: "", bestConditions: "" };
    const played = { spots: [...sample.spots, lake], trips: [...sample.trips, { ...sample.trips[0]!, id: "play", spotId: lake.id }], catches: [...sample.catches, { ...sample.catches[0]!, id: "landed", spotId: lake.id }] };
    expect(isSampleOnly(played)).toBe(true);
  });
});

describe("the outings still ahead", () => {
  it("leaves the sample's planned outings out once the book has anything of the angler's own", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const today = "2026-10-15";
    const sampleAhead = upcomingRealTrips(book, today);
    expect(sampleAhead.length).toBeGreaterThan(0);
    const own = { ...sampleAhead[0]!, id: "zq-own", date: "2026-10-17" };
    expect(upcomingRealTrips({ ...book, trips: [...book.trips, own] }, today).map((trip) => trip.id)).toEqual(["zq-own"]);
  });
});
