import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { t } from "../i18n";
import { findCatches } from "./CatchSearch";
import { parseExactTerm } from "./findLinks";
import { readSizePlus } from "./sizePlus";

describe("round 61 search fixes", () => {
  it("reads a typed name with its own dash as the name, not as leaving out", () => {
    const book = sampleLogbook(new Date(2026, 9, 15));
    const base = book.catches[0]!;
    const withLures = {
      ...book,
      catches: [...book.catches, { ...base, id: "silver", lure: "Rapala - silver" }, { ...base, id: "gold", lure: "Rapala - gold" }],
    };
    expect(findCatches(withLures, "Rapala - silver", t).map((entry) => entry.id)).toEqual(["silver"]);
    // A dash before a word that is no name in the book still leaves it out.
    expect(findCatches(withLures, "rapala -silver", t).map((entry) => entry.id)).toEqual(["gold"]);
  });

  it("does not take a term with an exclusion after it for one name", () => {
    expect(parseExactTerm('lure:"Jig" -water:"Stillwater"')).toBeNull();
    expect(parseExactTerm('lure:"Jig"')).toEqual({ field: "lure", name: "Jig" });
    expect(parseExactTerm('lure:"4" Senko - green"')).toEqual({ field: "lure", name: '4" Senko - green' });
  });

  it("reads a 30-plus size before splitting on “+”", () => {
    expect(readSizePlus("pike 30in+")).toBe("pike >30in");
    expect(readSizePlus("pike 20+ in")).toBe("pike >20 in");
    expect(readSizePlus("pike + jig")).toBe("pike + jig");
  });
});
