import { describe, expect, it } from "vitest";
import type { CatchEntry } from "@stillwater/shared";
import { nextBookMark } from "./milestones";
import { unpicturedBests } from "./PhotosPage";
import { PLAY_LAKE_ID } from "./playLake";

const fish = (id: string, pounds: number, inches?: number): CatchEntry => ({
  id,
  species: "Northern pike",
  measure: inches !== undefined ? { kind: "length", inches } : { kind: "weight", pounds },
  lure: "Spoon",
  spotId: "spot-own",
  tripId: null,
  caughtAt: "2026-10-10T12:00:00.000Z",
  note: "",
  weather: null,
});

describe("next book milestone", () => {
  it("names the next milestone only once it is a few fish away", () => {
    expect(nextBookMark(3)).toBeNull();
    expect(nextBookMark(47)).toEqual({ left: 3, mark: 50 });
    expect(nextBookMark(98)).toEqual({ left: 2, mark: 100 });
    expect(nextBookMark(47, 2)).toBeNull();
  });
});

describe("best fish without a photo", () => {
  it("names the heaviest and the longest fish missing a picture, once each", () => {
    const book = [fish("heavy", 9), fish("light", 2), fish("long", 0, 40)];
    expect(unpicturedBests(book, () => false).map((row) => [row.entry.id, row.kind])).toEqual([
      ["heavy", "weight"],
      ["long", "length"],
    ]);
    expect(unpicturedBests(book, (id) => id === "heavy").map((row) => row.entry.id)).toEqual(["long"]);
  });

  it("leaves out the game's fish", () => {
    expect(unpicturedBests([{ ...fish("lake", 9), spotId: PLAY_LAKE_ID }], () => false)).toEqual([]);
  });
});
