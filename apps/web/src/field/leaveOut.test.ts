import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { t } from "../i18n";
import { findCatches, splitLeftOut } from "./CatchSearch";

describe("leaving fish out of a search", () => {
  const book = sampleLogbook(new Date(2026, 9, 15));
  const ids = (needle: string) => findCatches(book, needle, t).map((entry) => entry.id).sort();

  it("drops what a part or a word after “-” finds", () => {
    const pike = ids("pike");
    const overcast = new Set(ids("overcast"));
    const expected = pike.filter((id) => !overcast.has(id));
    expect(expected.length).toBeLessThan(pike.length);
    expect(ids("pike + -overcast")).toEqual(expected);
    expect(ids("pike -overcast")).toEqual(expected);
  });

  it("leaves out of the whole book when there is nothing else to find", () => {
    expect(ids("-pike").length).toBe(book.catches.length - ids("pike").length);
  });

  it("keeps a minus before a number, and a lone dash", () => {
    expect(splitLeftOut(["<-5°C"])).toEqual({ keep: ["<-5°C"], drop: [] });
    expect(splitLeftOut(["-5"])).toEqual({ keep: ["-5"], drop: [] });
    expect(splitLeftOut(["pike -"])).toEqual({ keep: ["pike -"], drop: [] });
    expect(splitLeftOut(['-species:"Perch"', "cedar"])).toEqual({ keep: ["cedar"], drop: ['species:"Perch"'] });
  });
});
