import { describe, expect, it } from "vitest";
import { catchesForTrip, sampleLogbook } from "@stillwater/shared";
import { t } from "../i18n";
import { catchLink, catchList } from "./catchList";
import { neighborsIn } from "./catchNeighbors";

describe("catchList", () => {
  const book = sampleLogbook(new Date(2026, 9, 15));
  const none = () => false;

  it("reads the list a catch was opened from, and where it lives", () => {
    const pike = book.catches.find((entry) => entry.species === "Northern pike")!;
    const list = catchList(book, "species:Northern pike", pike.id, t, none)!;
    expect(list.rows.every((row) => row.species === "Northern pike")).toBe(true);
    expect(list.back).toBe("/species/Northern%20pike");
    const search = catchList(book, "find:pike", pike.id, t, none)!;
    expect(search.back).toBe("/catches?find=pike");
    expect(neighborsIn(search.rows, pike.id).older?.species ?? "Northern pike").toBe("Northern pike");
  });

  it("follows an outing's fish and a water's fish", () => {
    const fish = book.catches.find((entry) => entry.tripId)!;
    expect(catchList(book, `trip:${fish.tripId}`, fish.id, t, none)?.rows).toEqual(catchesForTrip(book, fish.tripId!));
    expect(catchList(book, `water:${fish.spotId}`, fish.id, t, none)?.back).toBe(`/spots/${fish.spotId}`);
  });

  it("falls back to the whole book for no list, a bad one, or one the fish isn't in", () => {
    const fish = book.catches[0]!;
    expect(catchList(book, null, fish.id, t, none)).toBeNull();
    expect(catchList(book, "nonsense", fish.id, t, none)).toBeNull();
    expect(catchList(book, "find:zzzz", fish.id, t, none)).toBeNull();
  });

  it("writes the list into the catch link", () => {
    expect(catchLink("c1")).toBe("/catches/c1");
    expect(catchLink("c1", "find:pike + >2 lb")).toBe("/catches/c1?in=find%3Apike%20%2B%20%3E2%20lb");
  });
});
