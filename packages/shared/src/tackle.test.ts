import { describe, expect, it } from "vitest";
import { sampleLogbook } from "./logbook.ts";
import {
  isTackleBox,
  itemsForTrip,
  luresPacked,
  packedCount,
  parseTackleLabel,
  sampleTackle,
  withPacked,
  withTackleItem,
} from "./tackle.ts";

const now = new Date(2026, 9, 1, 8, 30, 0);

describe("tackle", () => {
  const items = sampleTackle();

  it("packs a list for every sample outing", () => {
    const book = sampleLogbook(now);
    expect(book.trips.length).toBeGreaterThan(0);
    for (const trip of book.trips) {
      const rows = itemsForTrip(items, trip.id);
      expect(rows.length).toBeGreaterThanOrEqual(4);
      expect(rows.every((row) => row.packed === false)).toBe(true);
      expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
      expect(new Set(rows.map((row) => row.label)).size).toBe(rows.length);
    }
    const known = new Set(book.trips.map((trip) => trip.id));
    expect(items.every((item) => known.has(item.tripId))).toBe(true);
  });

  it("checks one piece and leaves the rest of the bag alone", () => {
    const next = withPacked(items, "gear-dawn-spinner", true);
    expect(items.find((item) => item.id === "gear-dawn-spinner")?.packed).toBe(false);
    expect(next.find((item) => item.id === "gear-dawn-spinner")?.packed).toBe(true);
    expect(packedCount(itemsForTrip(next, "trip-dawn"))).toBe(1);
    expect(packedCount(itemsForTrip(next, "trip-mill"))).toBe(0);
    expect(next).toHaveLength(items.length);
  });

  it("accepts a stored bag and rejects a broken one", () => {
    const box = { items: withPacked(items, "gear-mill-rod", true) };
    expect(isTackleBox(box)).toBe(true);
    expect(isTackleBox(JSON.parse(JSON.stringify(box)))).toBe(true);
    expect(isTackleBox({ items: [{ id: "x", tripId: "trip-dawn", label: "Net", packed: "yes" }] })).toBe(false);
    expect(isTackleBox({ items: "rod" })).toBe(false);
    expect(isTackleBox(null)).toBe(false);
  });

  it("adds a piece onto one outing", () => {
    const added = withTackleItem(items, {
      id: "gear-extra",
      tripId: "trip-dawn",
      label: "Rag",
      packed: false,
    });
    expect(itemsForTrip(added, "trip-dawn").at(-1)?.label).toBe("Rag");
    expect(itemsForTrip(added, "trip-mill")).toHaveLength(itemsForTrip(items, "trip-mill").length);
  });

  it("offers packed tackle, or the sample list when nothing is packed", () => {
    const sample = sampleTackle();
    expect(luresPacked(null)).toEqual(luresPacked(sample));
    expect(luresPacked([])).toEqual(luresPacked(sample));
    expect(luresPacked(sample)[0]).toBe("Spinnerbait");
    expect(luresPacked(sample)).toContain("#5 Mepps");
    expect(luresPacked(sample)).toContain("Nightcrawlers");
    expect(new Set(luresPacked(sample)).size).toBe(luresPacked(sample).length);

    const packed = withPacked(withPacked(sample, "gear-dawn-mepps", true), "gear-duck-crawlers", true);
    expect(luresPacked(packed)).toEqual(["#5 Mepps", "Nightcrawlers"]);

    const bothSpinners = withPacked(withPacked(sample, "gear-dawn-spinner", true), "gear-cedar-eve-spinner", true);
    expect(luresPacked(bothSpinners)).toEqual(["Spinnerbait"]);
  });

  it("asks for a short name", () => {
    expect(parseTackleLabel("  spare leader  ")).toEqual({ ok: true, value: "spare leader" });
    expect(parseTackleLabel(" ")).toMatchObject({ ok: false });
    expect(parseTackleLabel("a")).toMatchObject({ ok: false });
  });
});
