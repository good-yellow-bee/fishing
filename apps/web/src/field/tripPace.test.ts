import { describe, expect, it } from "vitest";
import { fishPace } from "./tripPace";

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
