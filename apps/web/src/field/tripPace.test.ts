import { describe, expect, it } from "vitest";
import { busiestHour, fishPace, sinceLastFish, totalWeight } from "./tripPace";

describe("fish pace", () => {
  it("gives the usual wait between fish on one day", () => {
    expect(fishPace("2026-10-10T12:00:00.000Z", "2026-10-10T13:00:00.000Z", 3)).toBe("one every 30 min on average");
    expect(fishPace("2026-10-10T08:00:00.000Z", "2026-10-10T14:00:00.000Z", 3)).toBe("one every 3 h on average");
  });

  it("keeps the pace of a night session past midnight", () => {
    expect(fishPace("2026-10-10T23:00:00", "2026-10-11T00:20:00", 3)).toBe("one every 40 min on average");
  });

  it("says nothing for two fish, fish at the same minute, or fish on different days", () => {
    expect(fishPace("2026-10-10T12:00:00.000Z", "2026-10-10T13:00:00.000Z", 2)).toBeNull();
    expect(fishPace("2026-10-10T12:00:00.000Z", "2026-10-10T12:00:00.000Z", 4)).toBeNull();
    expect(fishPace("2026-10-10T12:00:00.000Z", "2026-10-12T12:00:00.000Z", 4)).toBeNull();
  });
});

describe("since the last fish", () => {
  const now = new Date(2026, 9, 17, 12, 0);
  it("says how long it has been quiet, in minutes then hours", () => {
    expect(sinceLastFish(new Date(2026, 9, 17, 11, 20).toISOString(), now)).toBe("Last fish 40 min ago");
    expect(sinceLastFish(new Date(2026, 9, 17, 9, 0).toISOString(), now)).toBe("Last fish 3 h ago");
  });
  it("says nothing for a fish just in, or one from long ago", () => {
    expect(sinceLastFish(new Date(2026, 9, 17, 11, 59, 40).toISOString(), now)).toBeNull();
    expect(sinceLastFish(new Date(2026, 9, 16, 20, 0).toISOString(), now)).toBeNull();
  });
});

describe("busiest hour and total weight", () => {
  const at = (h: number, m: number) => new Date(2026, 9, 17, h, m).toISOString();
  it("finds the hour with the most fish, once three came in it and not all of them", () => {
    expect(busiestHour([at(6, 0), at(7, 10), at(7, 30), at(8, 5), at(10, 0)])).toEqual({ count: 3, from: at(7, 10) });
    expect(busiestHour([at(6, 0), at(6, 10), at(6, 20)])).toBeNull();
    expect(busiestHour([at(6, 0), at(8, 0), at(10, 0), at(12, 0)])).toBeNull();
  });
  it("adds up the weighed fish once two were weighed", () => {
    expect(totalWeight([1.5, null, 2.25])).toEqual({ pounds: 3.75, count: 2 });
    expect(totalWeight([1.5, null])).toBeNull();
  });
});
