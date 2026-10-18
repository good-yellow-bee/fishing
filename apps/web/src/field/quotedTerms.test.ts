import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { t } from "../i18n";
import { findCatches } from "./CatchSearch";
import { exactTerm } from "./findLinks";

describe("a quoted name in a search", () => {
  const base = sampleLogbook(new Date(2026, 9, 15));
  const first = base.catches[0]!;
  const book = {
    ...base,
    spots: [...base.spots, { ...base.spots[0]!, id: "spot-north", name: "Mille Lacs - north shore" }],
    trips: [...base.trips, { ...base.trips[0]!, id: "trip-opener", spotId: "spot-north", title: "Opener - dawn" }],
    catches: [
      ...base.catches,
      { ...first, id: "mine-rapala", lure: "Rapala - silver", spotId: "spot-north", tripId: "trip-opener" },
      { ...first, id: "mine-kopyto", lure: "Kopyto 8 cm perłowe" },
      { ...first, id: "mine-grub", lure: "Grub 3 in white" },
    ],
  };
  const ids = (needle: string) => findCatches(book, needle, t).map((entry) => entry.id).sort();

  it("keeps a dash or a size inside the name as part of it", () => {
    expect(ids(exactTerm("lure", "Rapala - silver"))).toEqual(["mine-rapala"]);
    expect(ids(exactTerm("water", "Mille Lacs - north shore"))).toEqual(["mine-rapala"]);
    expect(ids(exactTerm("outing", `${base.trips[0]!.date} Opener - dawn`))).toEqual(["mine-rapala"]);
    expect(ids(exactTerm("lure", "Kopyto 8 cm perłowe"))).toEqual(["mine-kopyto"]);
    expect(ids(exactTerm("lure", "Grub 3 in white"))).toEqual(["mine-grub"]);
  });

  it("still leaves out and joins around a quoted name", () => {
    expect(ids(`${exactTerm("lure", "Rapala - silver")} + ${exactTerm("water", "Mille Lacs - north shore")}`)).toEqual(["mine-rapala"]);
    expect(ids(`${exactTerm("water", "Mille Lacs - north shore")} -${exactTerm("lure", "Rapala - silver")}`)).toEqual([]);
  });
});
