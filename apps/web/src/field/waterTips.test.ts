import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { packingTips, speciesLures, waterSpecies, waterTips } from "./waterTips";

describe("water tips", () => {
  const book = sampleLogbook(new Date(2026, 9, 1));

  it("stays quiet on a water with only a fish or two", () => {
    expect(waterTips(book.catches.slice(0, 2))).toBeNull();
  });

  it("names the best lures and the busiest time of day", () => {
    const base = book.catches[0]!;
    const fish = (id: string, lure: string, hour: number) => ({ ...base, id, lure, caughtAt: `2026-10-01T${String(hour).padStart(2, "0")}:00:00` });
    const tips = waterTips([fish("a", "Spinnerbait", 6), fish("b", "spinnerbait", 7), fish("c", "Jig", 19), fish("d", "Spoon", 5), fish("e", "Tube", 12)])!;
    expect(tips.lures[0]).toMatchObject({ count: 2 });
    expect(tips.lures).toHaveLength(3);
    expect(tips.time).toMatchObject({ id: "dawn", count: 3 });
  });

  it("breaks a tie in time of day toward the earlier band", () => {
    const at = (iso: string, id: string) => ({ ...book.catches[0]!, id, caughtAt: iso });
    const tips = waterTips([at("2026-10-01T06:00:00", "a"), at("2026-10-01T19:00:00", "b"), at("2026-10-01T12:00:00", "c")])!;
    expect(tips.time?.id).toBe("dawn");
  });

  it("names the sky most fish came under, only when one clearly leads", () => {
    const under = (id: string, sky: "clear" | "overcast" | null) => ({
      ...book.catches[0]!,
      id,
      weather: sky ? { sky, wind: "calm" as const, waterTempF: 60 } : null,
    });
    expect(waterTips([under("a", "overcast"), under("b", "overcast"), under("c", "clear")])!.sky).toBe("overcast");
    expect(waterTips([under("a", "overcast"), under("b", "clear"), under("c", null)])!.sky).toBeNull();
    expect(waterTips([under("a", "overcast"), under("b", null), under("c", null)])!.sky).toBeNull();
  });

  it("names the season most fish came in, only once they span more than one", () => {
    const on = (id: string, month: number) => ({ ...book.catches[0]!, id, caughtAt: `2026-${String(month).padStart(2, "0")}-10T09:00:00` });
    expect(waterTips([on("a", 10), on("b", 10), on("c", 7)])!.season).toBe("fall");
    expect(waterTips([on("a", 10), on("b", 10), on("c", 10)])!.season).toBeNull();
    expect(waterTips([on("a", 10), on("b", 7), on("c", 4)])!.season).toBeNull();
  });
});

describe("packing tips", () => {
  const book = sampleLogbook(new Date(2026, 9, 1));
  const trip = { id: "trip-ahead", date: "2026-11-01", spotId: "spot-cedar", title: "Ahead", note: "" };
  const fish = (id: string, lure: string) => ({ ...book.catches[0]!, id, spotId: "spot-cedar", lure });
  const fished = { ...book, catches: [fish("a", "Jig"), fish("b", "Jig"), fish("c", "Spoon")] };

  it("offers the water's best lures for an outing ahead", () => {
    expect(packingTips(fished, trip, "2026-10-15")).toEqual(["Jig", "Spoon"]);
  });

  it("offers nothing for an outing already past", () => {
    expect(packingTips(fished, trip, "2026-11-02")).toEqual([]);
  });
});

describe("catch form picks", () => {
  const book = sampleLogbook(new Date(2026, 9, 1));
  const base = book.catches.find((entry) => entry.spotId === "spot-mill")!;
  const here = [
    { ...base, id: "a", species: "Brook trout", lure: "Pheasant tail" },
    { ...base, id: "b", species: "brook trout", lure: "Pheasant tail" },
    { ...base, id: "c", species: "Brook trout", lure: "Elk hair caddis" },
    { ...base, id: "d", species: "Rainbow trout", lure: "Woolly bugger" },
  ];

  it("names the kinds a water has given, most first, as one", () => {
    expect(waterSpecies(here)).toEqual(["Brook trout", "Rainbow trout"]);
  });

  it("names the lures that took the kind being logged", () => {
    expect(speciesLures(here, " brook TROUT")).toEqual(["Pheasant tail", "Elk hair caddis"]);
    expect(speciesLures(here, "Northern pike")).toEqual([]);
    expect(speciesLures(here, "")).toEqual([]);
  });
});
