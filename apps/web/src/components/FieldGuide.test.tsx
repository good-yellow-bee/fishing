import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FISH, type CatchStat } from "@stillwater/shared";
import { FieldGuide } from "./FieldGuide";

function cards(stats: CatchStat[]) {
  const page = JSDOM.fragment(renderToStaticMarkup(<FieldGuide stats={stats} />));
  const articles = [...page.querySelectorAll("article")];
  return (id: string) => {
    const card = articles[FISH.findIndex((fish) => fish.id === id)]!;
    return { text: card.textContent ?? "", lines: [...card.querySelectorAll("p")].map((line) => line.textContent), trophy: card.querySelector(".guide-trophy") };
  };
}

const stat = (speciesId: string, heaviest: number): CatchStat => ({ speciesId, caught: 2, heaviest, lastAt: "2026-10-01T12:00:00.000Z" });

describe("field guide card", () => {
  it("shows unknown fish only their shadow, banks, and best time", () => {
    const catfish = cards([])("catfish");
    expect(catfish.lines).toEqual(["Large shadow · best at night", "Dock · Drop-off"]);
    expect(catfish.text).toContain("Unknown");
    expect(catfish.text).not.toContain("Channel catfish");
    expect(catfish.text).not.toContain("Trophy");
  });

  it("adds the lure size per bank and the trophy weight once a fish is logged", () => {
    const bass = cards([stat("smallmouth-bass", 2.4)])("smallmouth-bass");
    expect(bass.lines).toEqual([
      "2 landed · PB 2.4 lb",
      "Trophy ≥ 3.6 lb",
      "Medium shadow · best at dusk",
      "Dock: any lure",
      "Drop-off: small lure",
    ]);
    expect(bass.trophy).toBeNull();
  });

  it("marks a fish whose best catch reached trophy size", () => {
    const guide = cards([stat("carp", 15.9), stat("perch", 1)]);
    expect(guide("carp").trophy?.textContent).toBe("Trophy");
    expect(guide("carp").lines).toContain("Dock: big lure");
    expect(guide("perch").trophy).toBeNull();
  });
});
