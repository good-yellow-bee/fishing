import { describe, expect, it } from "vitest";
import { fishPace, sinceLastFish } from "./tripPace";

describe("fish pace", () => {
  it("gives the usual wait between fish on one day", () => {
    expect(fishPace("2026-10-10T12:00:00.000Z", "2026-10-10T13:00:00.000Z", 3)).toBe("one every 30 min on average");
    expect(fishPace("2026-10-10T08:00:00.000Z", "2026-10-10T14:00:00.000Z", 3)).toBe("one every 3 h on average");
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
