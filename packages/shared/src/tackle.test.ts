import { describe, expect, it } from "vitest";
import { sampleLogbook } from "./logbook.ts";
import {
  LURE_CLASSES,
  lureClass,
  lureClassesFor,
  lurePull,
  isTackleBox,
  itemsForTrip,
  luresPacked,
  packedCount,
  parseTackleLabel,
  sampleTackle,
  isLureLabel,
  withPacked,
  withTripUnpacked,
  withTackleItem,
  withoutTackleItem,
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

  it("unpacks one outing's list and leaves the other lists packed", () => {
    const packed = withPacked(withPacked(withPacked(items, "gear-dawn-spinner", true), "gear-dawn-mepps", true), "gear-mill-rod", true);
    const next = withTripUnpacked(packed, "trip-dawn");
    expect(packedCount(itemsForTrip(next, "trip-dawn"))).toBe(0);
    expect(packedCount(itemsForTrip(next, "trip-mill"))).toBe(1);
    expect(next).toHaveLength(items.length);
  });

  it("takes one piece off its list and leaves the rest", () => {
    const next = withoutTackleItem(items, "gear-dawn-leader");
    expect(next).toHaveLength(items.length - 1);
    expect(itemsForTrip(next, "trip-dawn").map((item) => item.id)).not.toContain("gear-dawn-leader");
    expect(withoutTackleItem(items, "no-such-piece")).toEqual(items);
  });

  it("accepts a stored bag and rejects a broken one", () => {
    const box = { items: withPacked(items, "gear-mill-rod", true) };
    expect(isTackleBox(box)).toBe(true);
    expect(isTackleBox(JSON.parse(JSON.stringify(box)))).toBe(true);
    expect(isTackleBox({ items: [{ id: "x", tripId: "trip-dawn", label: "Net", packed: "yes" }] })).toBe(false);
    expect(isTackleBox({ items: "rod" })).toBe(false);
    expect(isTackleBox(null)).toBe(false);
    const piece = { id: "x", tripId: "trip-dawn", label: "Net", packed: false };
    expect(isTackleBox({ items: [piece, { ...piece, label: "Rod" }] })).toBe(false);
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
    for (const tool of ["Landing net", "Headlamp", "Long-nose pliers", "Steel leader", "5x tippet", "Forceps", "Floatant", "5-weight fly rod"]) {
      expect(luresPacked(sample)).not.toContain(tool);
    }

    const packed = withPacked(withPacked(sample, "gear-dawn-mepps", true), "gear-duck-crawlers", true);
    expect(luresPacked(packed)).toEqual(["#5 Mepps", "Nightcrawlers"]);

    const bothSpinners = withPacked(withPacked(sample, "gear-dawn-spinner", true), "gear-cedar-eve-spinner", true);
    expect(luresPacked(bothSpinners)).toEqual(["Spinnerbait"]);
  });

  it("keeps a lure the angler typed and drops packed tools", () => {
    const sample = sampleTackle();
    const typed = { id: "mine", tripId: "trip-dawn", label: "Rapala minnow", packed: true };
    const pliers = withPacked(sample, "gear-dawn-pliers", true);
    expect(luresPacked([...pliers, typed])).toEqual(["Rapala minnow"]);
    expect(luresPacked(pliers)).toEqual(luresPacked(sample));
  });

  it("tells typed lures from tools and line", () => {
    for (const lure of ["In-line spinner", "Lamprey", "Live scale shad", "Knife jig", "Spreader bar", "Rapala minnow", "Mister Twister", "Size 8 hooks", "Woolly buggers"]) {
      expect(isLureLabel(lure), lure).toBe(true);
    }
    for (const tool of [
      "Steel leader", "Steel leaders", "6x tippet", "6x tippets", "Braided line", "Euro nymph leader", "Streamer leader",
      "Landing net", "Landing nets", "Jaw spreaders", "Headlamp", "Headlamps", "5-weight fly rod", "Fly rods",
      "Spinning reel", "Spinning reels", "Hemostats", "Polarized sunglasses", "Nipper",
    ]) {
      expect(isLureLabel(tool), tool).toBe(false);
    }
  });

  it("asks for a short name", () => {
    expect(parseTackleLabel("  spare leader  ")).toEqual({ ok: true, value: "spare leader" });
    expect(parseTackleLabel(" ")).toMatchObject({ ok: false });
    expect(parseTackleLabel("a")).toMatchObject({ ok: false });
  });
});

describe("lure classes", () => {
  /** The size rule before lure classes, kept here to prove every label still lands on the same half. */
  const oldLarge = (label: string) => {
    const text = label.toLowerCase();
    if (/bobber|worm|crawler|popper|pheasant|caddis|size\s*8/.test(text)) return false;
    return /spinner|spoon|mepps|crank|tube|bugger/.test(text);
  };

  it("keeps every packed sample lure on the half the old size rule put it", () => {
    const labels = [
      ...sampleTackle().map((item) => item.label).filter(isLureLabel),
      "Bobber", "Worm", "Spoon", "Elk hair caddis", "Mystery lure", "Spinner with a worm",
    ];
    for (const label of labels) expect(lureClass(label).size, label).toBe(oldLarge(label) ? "large" : "small");
  });

  it("names each sample lure's class", () => {
    expect(lureClass("#5 Mepps").id).toBe("spinner");
    expect(lureClass("Nightcrawlers").id).toBe("worm");
    expect(lureClass("Pencil bobbers").id).toBe("bobber");
    expect(lureClass("Pheasant tails").id).toBe("fly");
    expect(lureClass("Woolly buggers").id).toBe("streamer");
    expect(lureClass("Green pumpkin tubes").id).toBe("jig");
    expect(lureClass("Crayfish crankbait").id).toBe("crank");
    expect(lureClass("Mystery lure").id).toBe("plain");
  });

  it("pulls only at the hours a class works", () => {
    const popper = lureClass("Popper");
    expect(lurePull(popper, "smallmouth-bass", "dusk")).toBeCloseTo(0.8);
    expect(lurePull(popper, "smallmouth-bass", "night")).toBe(0);
    expect(lurePull(popper, "carp", "dusk")).toBe(0);
    expect(lurePull(lureClass("Spoon"), "pike", "night")).toBeCloseTo(0.6);
  });

  it("lists the classes that draw a species, with their best hours", () => {
    expect(lureClassesFor("catfish")).toEqual([{ lure: lureClass("Nightcrawlers"), hours: ["night"] }]);
    expect(lureClassesFor("salmon").map((one) => one.lure.id)).toEqual(["streamer", "spoon"]);
    expect(lureClassesFor("sturgeon")).toEqual([]);
    expect(new Set(LURE_CLASSES.map((one) => one.id)).size).toBe(LURE_CLASSES.length);
  });
});
