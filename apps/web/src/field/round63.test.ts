import { describe, expect, it } from "vitest";
import type { Trip } from "@stillwater/shared";
import { lastOutingBefore } from "./outingAverage";

const trip = (id: string, date: string): Trip => ({ id, date, spotId: "w", title: "", note: "" });

describe("round 63 outing fixes", () => {
  it("names the last outing fished before a day, today's only once it has a fish", () => {
    const trips = [trip("old", "2026-10-01"), trip("mid", "2026-10-10"), trip("today", "2026-10-18"), trip("next", "2026-10-20")];
    expect(lastOutingBefore(trips, "2026-10-25", "2026-10-18", () => 0)?.id).toBe("mid");
    expect(lastOutingBefore(trips, "2026-10-25", "2026-10-18", (id) => (id === "today" ? 2 : 0))?.id).toBe("today");
    // A day backfilled before the later outings gets the one before it.
    expect(lastOutingBefore(trips, "2026-10-05", "2026-10-18", () => 1)?.id).toBe("old");
    expect(lastOutingBefore(trips, "2026-10-01", "2026-10-18", () => 1)).toBeUndefined();
  });
});

describe("round 63 outing ideas", () => {
  it("leaves a note out of the form until its outing is over", async () => {
    const { notesHere } = await import("./outingNotes");
    const trips = [{ ...trip("a", "2026-10-10"), note: "Weed edge" }, { ...trip("b", "2026-10-18"), note: "Plan" }];
    expect(notesHere(trips, "2026-10-18", 2).map((row) => row.text)).toEqual(["Weed edge"]);
  });
});
