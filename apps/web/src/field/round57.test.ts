import { describe, expect, it } from "vitest";
import type { CatchEntry, Logbook, TackleItem } from "@stillwater/shared";
import { tripSummary } from "./summaries";
import { tripIcs } from "./tripIcs";
import { intoMergedWaters, mergeFolds, mergeWaters } from "./waterMerge";
import { foldedTackle } from "./gear/foldedTackle";
import { lastOutByWater } from "./spotOrder";

const spot = (id: string, name = id) => ({ id, name, waterType: "lake" as const, notes: "", bestConditions: "" });
const trip = (id: string, spotId: string, date: string, title = "") => ({ id, spotId, date, title, note: "" });
const fish = (id: string, spotId: string, tripId: string | null, caughtAt: string): CatchEntry => ({
  id,
  species: "Northern pike",
  measure: { kind: "length", inches: 24 },
  lure: "Jig",
  spotId,
  tripId,
  caughtAt,
  note: "",
  weather: null,
});

describe("round 57", () => {
  it("leaves an untitled outing's water name out of its copied first line", () => {
    const head = tripSummary(trip("t", "cedar", "2026-10-10", "Cedar Pond"), "Cedar Pond", []).split("\n")[0]!;
    expect(head.match(/Cedar Pond/g)).toHaveLength(1);
    expect(head.startsWith("Cedar Pond")).toBe(false);
    expect(tripSummary(trip("t", "cedar", "2026-10-10", "Dawn"), "Cedar Pond", []).split("\n")[0]).toMatch(/^Dawn · .* · Cedar Pond$/);
  });

  it("escapes a lone carriage return in a calendar note", () => {
    const text = tripIcs({ ...trip("t", "cedar", "2026-10-31", "Dawn"), note: "net\rrod" }, null, new Date("2026-10-15T04:00:00.000Z"));
    expect(text).toContain("DESCRIPTION:net\\nrod\r\n");
  });

  it("folds a merged-away outing from a later file into the one it joined here", () => {
    const here = { spots: [spot("cedar")], trips: [trip("ta", "cedar", "2026-10-10")], catches: [fish("f1", "cedar", "ta", "2026-10-10T10:00:00.000Z")] } as Logbook;
    const file = { spots: [spot("lake")], trips: [trip("tb", "lake", "2026-10-10"), trip("tc", "lake", "2026-10-12")], catches: [fish("f2", "lake", "tb", "2026-10-10T12:00:00.000Z"), fish("f3", "lake", "tc", "2026-10-12T12:00:00.000Z")] } as Logbook;
    const next = intoMergedWaters(file, here, { lake: "cedar" });
    expect(next.trips.map((each) => each.id)).toEqual(["tc"]);
    expect(next.catches.map((each) => [each.spotId, each.tripId])).toEqual([["cedar", "ta"], ["cedar", "tc"]]);
  });

  it("carries a folded outing's tackle onto the outing it joined, without doubles", () => {
    const book = { spots: [spot("a"), spot("b")], trips: [trip("ta", "a", "2026-10-10"), trip("tb", "b", "2026-10-10"), trip("tc", "a", "2026-10-11")], catches: [] } as Logbook;
    const folds = new Map([...mergeFolds(book, "a", "b")].map(([id, host]) => [id, host.id]));
    expect([...folds]).toEqual([["ta", "tb"]]);
    expect(mergeWaters(book, "a", "b").trips.map((each) => each.id)).toEqual(["tb", "tc"]);
    const items: TackleItem[] = [
      { id: "1", tripId: "ta", label: "Jig", packed: true },
      { id: "2", tripId: "ta", label: "Net", packed: false },
      { id: "3", tripId: "tb", label: "net", packed: true },
    ];
    let n = 0;
    const next = foldedTackle(items, folds, () => `new-${++n}`)!;
    expect(next.filter((item) => item.tripId === "tb").map((item) => [item.label, item.packed])).toEqual([["net", true], ["Jig", true]]);
    expect(next.filter((item) => item.tripId === "ta")).toHaveLength(2);
    expect(foldedTackle(items, new Map(), () => "x")).toBeNull();
  });

  it("dates a water's last day out by a night fish's outing", () => {
    const book = { spots: [spot("a")], trips: [trip("t", "a", "2026-10-10")], catches: [fish("f", "a", "t", new Date(2026, 9, 11, 0, 30).toISOString())] } as Logbook;
    expect(lastOutByWater(book, "2026-10-15").get("a")).toBe("2026-10-10");
  });
});
