import { beforeEach, describe, expect, it, vi } from "vitest";
import { PHOTO_STORAGE_KEY, readStoredPhotos, savePhotos } from "./photoStore";
import { AUTO_PHOTO_STORAGE_KEY, markReleasedInBook, noteSnapshots, saveLandedCatch, saveLandedPhoto, snapshotsIn } from "./keepCatch";
import { LOGBOOK_STORAGE_KEY, UNREADABLE_BOOK_KEY, readStoredLogbook, saveLogbook, setAsideCatchIds, storedBookUnreadable } from "./storage";
import { CATCH_PHOTO_BOOK_HEADROOM_CHARS, CATCH_PHOTO_QUOTA_CHARS, CATCH_PHOTO_STORE_MAX_CHARS, sampleLogbook } from "@stillwater/shared";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => data.clear(),
    key: (index: number) => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    },
  };
}

const landed = {
  id: "catch-play-1",
  species: "Bluegill",
  pounds: 0.4,
  bank: "dock",
  caughtAt: "2026-10-07T18:00:00.000Z",
};

describe("save a landed fish", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
  });

  it("writes the catch into the field log and leaves photos empty", () => {
    saveLandedCatch(landed);
    const book = readStoredLogbook();
    const kept = book?.catches.find((entry) => entry.id === landed.id);
    expect(localStorage.getItem(LOGBOOK_STORAGE_KEY)).toContain(landed.id);
    expect(kept).toMatchObject({
      species: "Bluegill",
      measure: { kind: "weight", pounds: 0.4 },
      spotId: "spot-stillwater",
      weather: null,
    });
    expect(localStorage.getItem(PHOTO_STORAGE_KEY)).toBeNull();
  });

  it("marks a fish let go from the card as released, and leaves other books alone", () => {
    markReleasedInBook(landed.id);
    expect(localStorage.getItem(LOGBOOK_STORAGE_KEY)).toBeNull();
    saveLandedCatch(landed);
    markReleasedInBook("not-in-the-book");
    expect(readStoredLogbook()?.catches[0]?.released).toBeUndefined();
    markReleasedInBook(landed.id);
    expect(readStoredLogbook()?.catches.find((entry) => entry.id === landed.id)?.released).toBe(true);
    saveLandedCatch(landed);
    expect(readStoredLogbook()?.catches.find((entry) => entry.id === landed.id)?.released).toBe(true);
  });

  it("starts a fresh browser's book with the real catch alone, no sample fish", () => {
    saveLandedCatch(landed);
    const book = readStoredLogbook()!;
    expect(book.catches.map((entry) => entry.id)).toEqual([landed.id]);
    expect(book.spots.map((spot) => spot.id)).toEqual(["spot-stillwater"]);
    expect(book.trips).toEqual([]);
  });

  it("appends to the book already on this browser and does not duplicate the same landing", () => {
    const seeded = sampleLogbook(new Date(2026, 9, 1));
    saveLogbook(seeded);
    saveLandedCatch(landed);
    saveLandedCatch(landed);
    const book = readStoredLogbook();
    const kept = book?.catches.filter((entry) => entry.id === landed.id);
    expect(book?.catches).toHaveLength(seeded.catches.length + 1);
    expect(kept).toHaveLength(1);
    expect(book?.spots).toEqual([...seeded.spots, expect.objectContaining({ id: "spot-stillwater" })]);
    expect(localStorage.getItem(PHOTO_STORAGE_KEY)).toBeNull();
  });

  it("saves a point catch in the field log and leaves the rest of the book", () => {
    const seeded = sampleLogbook(new Date(2026, 9, 1));
    saveLogbook(seeded);
    saveLandedCatch({
      id: "catch-play-point",
      species: "Bluegill",
      pounds: 0.4,
      bank: "Point",
      caughtAt: "2026-10-07T19:00:00.000Z",
    });
    const book = readStoredLogbook();
    const kept = book?.catches.find((entry) => entry.id === "catch-play-point");
    expect(localStorage.getItem(LOGBOOK_STORAGE_KEY)).toContain("Landed at the point.");
    expect(kept).toMatchObject({
      species: "Bluegill",
      measure: { kind: "weight", pounds: 0.4 },
      spotId: "spot-stillwater",
      note: "Landed at the point.",
    });
    expect(book?.catches).toHaveLength(seeded.catches.length + 1);
    expect(book?.spots).toEqual([...seeded.spots, expect.objectContaining({ id: "spot-stillwater" })]);
    expect(book?.trips).toEqual(seeded.trips);
    expect(book?.catches.filter((entry) => entry.id !== "catch-play-point")).toEqual(seeded.catches);
    expect(localStorage.getItem(PHOTO_STORAGE_KEY)).toBeNull();
  });

  it("stores the lure that was tied on", () => {
    saveLandedCatch({ ...landed, lure: "#5 Mepps" });
    const kept = readStoredLogbook()?.catches.find((entry) => entry.id === landed.id);
    expect(kept?.lure).toBe("#5 Mepps");
    expect(localStorage.getItem(LOGBOOK_STORAGE_KEY)).toContain("#5 Mepps");
  });

  it("pins the scene's photo to the landed catch", () => {
    saveLandedCatch(landed);
    expect(saveLandedPhoto(landed.id, "data:image/jpeg;base64,AAAA")).toBe(true);
    expect(readStoredPhotos()[landed.id]).toBe("data:image/jpeg;base64,AAAA");
  });

  it("leaves a photo the player chose and skips catches not in the book", () => {
    saveLandedCatch(landed);
    saveLandedPhoto(landed.id, "data:image/jpeg;base64,AAAA");
    expect(saveLandedPhoto(landed.id, "data:image/jpeg;base64,BBBB")).toBe(false);
    expect(readStoredPhotos()[landed.id]).toBe("data:image/jpeg;base64,AAAA");
    expect(saveLandedPhoto("catch-missing", "data:image/jpeg;base64,CCCC")).toBe(false);
    expect(readStoredPhotos()["catch-missing"]).toBeUndefined();
  });

  it("makes room for a new snapshot by dropping the game's oldest, but not a best fish or the player's photo", () => {
    const shot = (letter: string) => `data:image/jpeg;base64,${letter.repeat(60_000)}`;
    const land = (id: string, pounds: number) => saveLandedCatch({ ...landed, id, pounds });
    land("small-1", 0.2);
    land("small-2", 0.3);
    land("best", 2);
    land("new", 0.5);
    expect(saveLandedPhoto("best", shot("A"))).toBe(true);
    expect(saveLandedPhoto("small-1", shot("B"))).toBe(true);
    expect(saveLandedPhoto("small-2", shot("C"))).toBe(true);
    // The player swapped in their own picture on the second small fish.
    savePhotos({ ...readStoredPhotos(), "small-2": shot("D") });
    // Fill the browser so one more snapshot no longer fits.
    const used = [...Array(localStorage.length).keys()].reduce((sum, i) => sum + localStorage.getItem(localStorage.key(i)!)!.length, 0);
    localStorage.setItem("filler", "x".repeat(CATCH_PHOTO_QUOTA_CHARS - CATCH_PHOTO_BOOK_HEADROOM_CHARS - used - 30_000));
    expect(saveLandedPhoto("new", shot("E"))).toBe(true);
    const photos = readStoredPhotos();
    expect(Object.keys(photos).sort()).toEqual(["best", "new", "small-2"]);
    expect(photos["small-2"]).toBe(shot("D"));
  });

  it("makes room when the photo store reaches its own limit before the browser's", () => {
    const shot = (n: number) => `data:image/jpeg;base64,${String(n % 10).repeat(120_000)}`;
    const ids = Array.from({ length: 27 }, (_, n) => `fish-${n}`);
    // The first is the heaviest of its kind, so its snapshot is never the one to go.
    ids.forEach((id, n) => saveLandedCatch({ ...landed, id, pounds: n === 0 ? 3 : 0.2 }));
    for (const [n, id] of ids.entries()) expect(saveLandedPhoto(id, shot(n))).toBe(true);
    const kept = Object.keys(readStoredPhotos());
    expect(kept).toContain("fish-0");
    expect(kept).toContain("fish-26");
    expect(kept).not.toContain("fish-1");
    expect(JSON.stringify(readStoredPhotos()).length).toBeLessThanOrEqual(CATCH_PHOTO_STORE_MAX_CHARS);
  });

  it("still throws when nothing of the game's may go", () => {
    saveLandedCatch(landed);
    localStorage.setItem("filler", "x".repeat(CATCH_PHOTO_QUOTA_CHARS - CATCH_PHOTO_BOOK_HEADROOM_CHARS - 20_000));
    expect(() => saveLandedPhoto(landed.id, `data:image/jpeg;base64,${"A".repeat(60_000)}`)).toThrow();
    expect(readStoredPhotos()).toEqual({});
  });
});

describe("a stored book that can't be read", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
  });

  it("is set aside before a landed fish starts a new book over it", () => {
    const broken = JSON.stringify({ spots: [], trips: [], catches: [{ id: "x", pounds: null }] });
    localStorage.setItem(LOGBOOK_STORAGE_KEY, broken);
    expect(storedBookUnreadable()).toBe(true);
    saveLandedCatch(landed);
    expect(localStorage.getItem(UNREADABLE_BOOK_KEY)).toBe(broken);
    expect(readStoredLogbook()?.catches.map((entry) => entry.id)).toEqual([landed.id]);
    expect(storedBookUnreadable()).toBe(false);
  });

  it("keeps the first one set aside, not a later one", () => {
    localStorage.setItem(LOGBOOK_STORAGE_KEY, "{not json");
    readStoredLogbook();
    localStorage.setItem(LOGBOOK_STORAGE_KEY, "[]");
    readStoredLogbook();
    expect(localStorage.getItem(UNREADABLE_BOOK_KEY)).toBe("{not json");
  });
});

describe("a stored book with one bad fish", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
  });

  it("keeps the rest, sets the whole aside, and its fish keep their photo ids", () => {
    const sample = sampleLogbook(new Date(2026, 9, 10));
    const good = sample.catches[0]!;
    const broken = JSON.stringify({ ...sample, catches: [good, { id: "bad", pounds: "lots" }] });
    localStorage.setItem(LOGBOOK_STORAGE_KEY, broken);
    const book = readStoredLogbook();
    expect(book?.catches.map((entry) => entry.id)).toEqual([good.id]);
    expect(book?.spots).toHaveLength(sample.spots.length);
    expect(localStorage.getItem(UNREADABLE_BOOK_KEY)).toBe(broken);
    // Stored in place, so the game adds a landed fish to the kept fish rather than starting over.
    saveLandedCatch(landed);
    expect(readStoredLogbook()?.catches.map((entry) => entry.id)).toContain(good.id);
    expect(setAsideCatchIds()).toEqual([good.id, "bad"]);
  });
});

describe("the game's snapshots in a copy", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
  });

  it("go out with the photos they still match and join a new browser's list", () => {
    const shot = "data:image/jpeg;base64," + "A".repeat(40);
    localStorage.setItem(AUTO_PHOTO_STORAGE_KEY, JSON.stringify([{ id: "a", tail: shot.slice(-32) }, { id: "b", tail: "gone" }]));
    const out = snapshotsIn({ a: shot, b: "data:image/jpeg;base64,BBBB" });
    expect(out.map((each) => each.id)).toEqual(["a"]);
    localStorage.clear();
    noteSnapshots(out, { a: shot });
    expect(snapshotsIn({ a: shot }).map((each) => each.id)).toEqual(["a"]);
    // A photo the angler put there since is never counted as the game's.
    noteSnapshots([{ id: "c", tail: "x" }], { c: "data:image/jpeg;base64,CCCC" });
    expect(snapshotsIn({ a: shot, c: "data:image/jpeg;base64,CCCC" }).map((each) => each.id)).toEqual(["a"]);
  });
});
