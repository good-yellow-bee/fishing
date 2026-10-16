import { describe, expect, it } from "vitest";
import { draftWorthKeeping, parseEditDraft, parseKeptDraft, type KeptDraft } from "./catchDraft";

const now = new Date("2026-10-15T09:00:00Z");

const draft: KeptDraft = {
  species: "Pike",
  measureKind: "length",
  amount: "28",
  lure: "#5 Mepps",
  spotId: "spot-cedar",
  tripId: "",
  caughtAt: "2026-10-15T07:30",
  note: "",
  sky: "",
  wind: "",
  waterTemp: "",
  timeTouched: true,
  units: "imperial",
  savedAt: "2026-10-15T08:00:00Z",
};

describe("kept catch draft", () => {
  it("comes back while it is fresh and has something typed", () => {
    expect(parseKeptDraft(JSON.stringify(draft), now)).toEqual(draft);
  });

  it("is let go after a day", () => {
    expect(parseKeptDraft(JSON.stringify({ ...draft, savedAt: "2026-10-14T08:00:00Z" }), now)).toBeNull();
  });

  it("is not worth keeping with only the presets filled", () => {
    expect(draftWorthKeeping({ species: " ", amount: "", note: "" })).toBe(false);
    expect(parseKeptDraft(JSON.stringify({ ...draft, species: "", amount: "" }), now)).toBeNull();
    expect(draftWorthKeeping({ species: "", amount: "", note: "Lost it at the net" })).toBe(true);
    expect(draftWorthKeeping({ species: "", amount: "", alsoAmount: "3.2", note: "" })).toBe(true);
  });

  it("ignores broken or foreign data", () => {
    expect(parseKeptDraft(null, now)).toBeNull();
    expect(parseKeptDraft("{oops", now)).toBeNull();
    expect(parseKeptDraft(JSON.stringify({ ...draft, measureKind: "girth" }), now)).toBeNull();
    expect(parseKeptDraft(JSON.stringify({ ...draft, amount: 28 }), now)).toBeNull();
    expect(parseKeptDraft(JSON.stringify([draft]), now)).toBeNull();
  });
});

describe("kept changes to a fish", () => {
  const kept = JSON.stringify({ "catch-pike": { ...draft, catchId: "catch-pike", base: "as opened" }, "catch-perch": { ...draft, species: "Perch", catchId: "catch-perch", base: "perch" } });

  it("come back for the same fish while it reads as it did", () => {
    expect(parseEditDraft(kept, "catch-pike", "as opened", now)).toMatchObject({ catchId: "catch-pike", amount: "28" });
  });

  it("are not offered for another fish, or once the fish was changed elsewhere", () => {
    expect(parseEditDraft(kept, "catch-bass", "as opened", now)).toBeNull();
    // Each fish keeps its own.
    expect(parseEditDraft(kept, "catch-perch", "perch", now)?.species).toBe("Perch");
    expect(parseEditDraft(kept, "catch-pike", "changed since", now)).toBeNull();
  });
});
