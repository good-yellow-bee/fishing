import { beforeEach, describe, expect, it, vi } from "vitest";
import { PHOTO_STORAGE_KEY } from "./photoStore";
import { saveLandedCatch } from "./keepCatch";
import { LOGBOOK_STORAGE_KEY, readStoredLogbook, saveLogbook } from "./storage";
import { sampleLogbook } from "@stillwater/shared";

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
      spotId: "spot-cedar",
      weather: null,
    });
    expect(localStorage.getItem(PHOTO_STORAGE_KEY)).toBeNull();
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
    expect(book?.spots).toEqual(seeded.spots);
    expect(localStorage.getItem(PHOTO_STORAGE_KEY)).toBeNull();
  });
});
