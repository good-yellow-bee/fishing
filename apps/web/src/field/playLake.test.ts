import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { withoutPlayLake } from "./playLake";
import { findCatches } from "./CatchSearch";
import { kindOnPage, pageCounts } from "./speciesLink";

describe("leaving the game's lake out of a search", () => {
  const book = sampleLogbook(new Date(2026, 9, 1));
  const played = { ...book, spots: [...book.spots, { ...book.spots[0]!, id: "spot-stillwater", name: "Stillwater" }] };

  it("adds the left-out water only when a game fish is among the rows", () => {
    expect(withoutPlayLake(played, "2026", [{ spotId: "spot-stillwater" }])).toBe('2026 -water:"Stillwater"');
    expect(withoutPlayLake(played, "2026", [{ spotId: book.spots[0]!.id }])).toBe("2026");
    expect(withoutPlayLake(book, "2026", [{ spotId: "spot-stillwater" }])).toBe("2026");
  });

  it("leaves nothing out by name when a real water shares the game lake's name", () => {
    const twin = { ...played, spots: [...played.spots, { ...book.spots[0]!, id: "real-stillwater", name: "stillwater " }] };
    expect(withoutPlayLake(twin, "2026", [{ spotId: "spot-stillwater" }])).toBe("2026");
  });

  it("opens just the angler's own fish of that year", () => {
    const fish = played.catches[0]!;
    const year = String(new Date(fish.caughtAt).getFullYear());
    const game = { ...fish, id: "game-fish", spotId: "spot-stillwater" };
    const both = { ...played, catches: [game, ...played.catches] };
    const same = (rows: readonly { id: string }[]) => rows.map((row) => row.id);
    const term = withoutPlayLake(both, year, [game]);
    expect(same(findCatches(both, term, (text) => text, () => false))).toEqual(same(findCatches(played, year, (text) => text, () => false)));
  });
});

describe("a kind's page and the chips that open it", () => {
  const book = sampleLogbook(new Date(2026, 9, 1));
  const fish = book.catches[0]!;
  const game = (id: string, species: string) => ({ ...fish, id, species, spotId: "spot-stillwater" });
  const played = { ...book, catches: [game("g1", fish.species), game("g2", "Game-only fish"), ...book.catches] };

  it("lists the angler's own fish of a kind, or its game fish when that is all", () => {
    expect(kindOnPage(played, fish.species).some((entry) => entry.id === "g1")).toBe(false);
    expect(kindOnPage(played, "Game-only fish").map((entry) => entry.id)).toEqual(["g2"]);
  });

  it("counts each chip as its page does", () => {
    const counts = new Map(pageCounts(played.catches).map((row) => [row.species, row.count]));
    expect(counts.get(fish.species)).toBe(kindOnPage(played, fish.species).length);
    expect(counts.get("Game-only fish")).toBe(1);
  });
});
