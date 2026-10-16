import { describe, expect, it } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { renameInBook } from "./bookRename";

const renameSpecies = (book: Logbook, from: string, typed: string) => renameInBook(book, "species", from, typed);

const fish = (id: string, species: string): CatchEntry => ({
  id,
  species,
  measure: { kind: "length", inches: 20 },
  lure: "Jig",
  spotId: "spot-a",
  tripId: null,
  caughtAt: "2026-10-01T10:00:00.000Z",
  note: "",
  weather: null,
});
const book: Logbook = { spots: [], trips: [], catches: [fish("a", "Pike"), fish("b", "pike "), fish("c", "Northern pike"), fish("d", "Perch")] };

describe("renameInBook", () => {
  it("renames every fish of the kind, whatever its case", () => {
    const result = renameSpecies(book, "Pike", "  Jack   pike ");
    expect(result).toMatchObject({ ok: true, name: "Jack pike", count: 2 });
    if (result.ok) expect(result.book.catches.map((entry) => entry.species)).toEqual(["Jack pike", "Jack pike", "Northern pike", "Perch"]);
  });

  it("merges into a name already in the book, written the book's way", () => {
    const result = renameSpecies(book, "pike", "northern PIKE");
    expect(result).toMatchObject({ ok: true, name: "Northern pike", count: 2 });
    if (result.ok) expect(new Set(result.book.catches.map((entry) => entry.species))).toEqual(new Set(["Northern pike", "Perch"]));
  });

  it("joins a lake fish's name and can fix only the case of its own", () => {
    expect(renameSpecies(book, "Perch", "yellow perch")).toMatchObject({ ok: true, name: "Yellow perch", count: 1 });
    expect(renameSpecies(book, "Perch", "perch")).toMatchObject({ ok: true, name: "perch", count: 1 });
  });

  it("refuses a name too short or too long", () => {
    expect(renameSpecies(book, "Pike", " p ")).toMatchObject({ ok: false });
    expect(renameSpecies(book, "Pike", "x".repeat(41))).toMatchObject({ ok: false });
  });

  it("renames a lure on every fish caught on it, merging into one already in the book", () => {
    const lures: Logbook = { ...book, catches: [{ ...fish("a", "Pike"), lure: "Spiner" }, { ...fish("b", "Perch"), lure: "Spinner" }] };
    const result = renameInBook(lures, "lure", "spiner", "SPINNER");
    expect(result).toMatchObject({ ok: true, name: "Spinner", count: 1 });
    if (result.ok) expect(result.book.catches.map((entry) => [entry.species, entry.lure])).toEqual([["Pike", "Spinner"], ["Perch", "Spinner"]]);
    expect(renameInBook(lures, "lure", "Spiner", "")).toMatchObject({ ok: false, message: "What was on the line?" });
  });
});
