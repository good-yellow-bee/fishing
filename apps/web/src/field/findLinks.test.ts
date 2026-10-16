import { describe, expect, it } from "vitest";
import { exactTerm, findWithLink, parseExactTerm } from "./findLinks";

describe("exact search terms", () => {
  it("round-trips a name through its term, quotes and plus signs included", () => {
    expect(parseExactTerm(exactTerm("species", "Bass"))).toEqual({ field: "species", name: "Bass" });
    expect(parseExactTerm(' Lure:"Pond + creek special" ')).toEqual({ field: "lure", name: "Pond + creek special" });
  });

  it("leaves any other search alone", () => {
    expect(parseExactTerm('time:"Dawn"')).toEqual({ field: "time", name: "Dawn" });
    expect(parseExactTerm("Bass")).toBeNull();
    expect(parseExactTerm('colour:"red"')).toBeNull();
    expect(parseExactTerm('species:""')).toBeNull();
  });

  it("joins two terms into one search link", () => {
    const link = findWithLink(exactTerm("water", "Mill Race"), exactTerm("species", "Bass"));
    expect(new URLSearchParams(link.slice(link.indexOf("?"))).get("find")).toBe('water:"Mill Race" + species:"Bass"');
  });
});
