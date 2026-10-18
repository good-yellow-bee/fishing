// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { isShortMapLink, parseSpotPlace, type CatchEntry, type Logbook, type TackleItem } from "@stillwater/shared";
import { setLang } from "../i18n";
import { renamedTackle } from "./gear/renamedTackle";
import { foldedTackle } from "./gear/foldedTackle";
import { undoneTackle } from "./gear/undoneTackle";
import { pieceRecords } from "./gear/pieceRecord";
import { shownPieceKey } from "./gear/pieceKey";
import { labelShifts } from "./map/ownSheet";

const item = (id: string, tripId: string, label: string, packed = false): TackleItem => ({ id, tripId, label, packed });

describe("round 73: undoing a merge takes back the merge and nothing packed since", () => {
  it("puts a renamed piece's name back and keeps a later piece and ticks", () => {
    const before = [item("a", "t1", "Spinerbait"), item("b", "t2", "Landing net"), item("c", "t2", "Pliers")];
    const after = renamedTackle(before, "Spinerbait", "Spinnerbait")!;
    const since = [...after.map((each) => (each.tripId === "t2" ? { ...each, packed: true } : each)), item("d", "t2", "Spare leader")];
    const undone = undoneTackle(since, before, after);
    expect(undone.find((each) => each.id === "a")!.label).toBe("Spinerbait");
    expect(undone.filter((each) => each.tripId === "t2").map((each) => [each.label, each.packed])).toEqual([
      ["Landing net", true],
      ["Pliers", true],
      ["Spare leader", false],
    ]);
  });

  it("brings back a piece the rename dropped from a list that held the new name", () => {
    const before = [item("a", "t1", "Spinerbait"), item("b", "t1", "Spinnerbait")];
    const after = renamedTackle(before, "Spinerbait", "Spinnerbait")!;
    expect(after.map((each) => each.id)).toEqual(["b"]);
    expect(undoneTackle(after, before, after).map((each) => each.id).sort()).toEqual(["a", "b"]);
  });

  it("takes away only the pieces a water merge folded in", () => {
    const before = [item("a", "gone", "Spoon", true), item("b", "kept", "Net")];
    let next = 0;
    const after = foldedTackle(before, new Map([["gone", "kept"]]), () => `new${next++}`)!;
    const since = [...after, item("x", "kept", "Pliers")];
    expect(undoneTackle(since, before, after).map((each) => each.id)).toEqual(["a", "b", "x"]);
  });
});

describe("round 73: Polish reads a piece in either number as one piece", () => {
  afterEach(() => setLang("en"));
  it("matches Wobler with Woblery", () => {
    setLang("pl");
    expect(shownPieceKey("Wobler")).toBe(shownPieceKey("Woblery"));
  });
});

describe("round 73: the lure record counts every spelling it shows", () => {
  it("counts both spellings' fish", () => {
    const fish = (id: string, lure: string, caughtAt: string) =>
      ({ id, lure, caughtAt, spotId: "own", tripId: "t1", species: "Northern pike", measure: { kind: "length", value: 30, unit: "in" }, released: false, note: "" }) as unknown as CatchEntry;
    const book = {
      spots: [{ id: "own", name: "Own", waterType: "lake", notes: "", bestConditions: "" }],
      trips: [{ id: "t1", date: "2026-10-05", spotId: "own", title: "", note: "" }],
      catches: [fish("f1", "Spinnerbait", "2026-10-05T09:00:00.000Z"), fish("f2", "Spinnerbaits", "2026-10-05T10:00:00.000Z")],
    } as unknown as Logbook;
    expect(pieceRecords(book, [item("a", "t1", "Spinnerbait", true)], "2026-10-18")[0]!.fish).toBe(2);
  });
});

describe("round 73: map places", () => {
  it("reads degrees, minutes and seconds as a place card shows them", () => {
    expect(parseSpotPlace(`53°48'00.0"N 21°36'00.0"E`)).toEqual({ lat: 53.8, lng: 21.6 });
    expect(parseSpotPlace(`46°51.0'N 94°14.4'W`)).toEqual({ lat: 46.85, lng: -94.24 });
  });

  it("knows a Share link that has no place written in it", () => {
    expect(isShortMapLink("https://maps.app.goo.gl/T4f8bq1yWgTzKfQu9")).toBe(true);
    expect(isShortMapLink("https://maps.apple/p/abc123")).toBe(true);
    expect(isShortMapLink("https://www.openstreetmap.org/#map=14/53.8/21.6")).toBe(false);
  });

  it("gives three pins close together three different label places", () => {
    expect(labelShifts([{ x: 500, y: 300 }, { x: 505, y: 300 }, { x: 510, y: 300 }, { x: 515, y: 300 }], 0.9)).toEqual([0, 1, 2, 3]);
    // Far apart on a wide sheet: each in its own place.
    expect(labelShifts([{ x: 100, y: 100 }, { x: 600, y: 400 }], 0.9)).toEqual([0, 0]);
  });
});
