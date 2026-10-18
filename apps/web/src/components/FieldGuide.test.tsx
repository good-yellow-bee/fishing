import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { FISH, fishById, shadowSize, type CatchStat } from "@stillwater/shared";
import { FieldGuide } from "./FieldGuide";

const render = (stats: CatchStat[]) => JSDOM.fragment(renderToStaticMarkup(<FieldGuide stats={stats} />));

function cards(stats: CatchStat[]) {
  const page = render(stats);
  const articles = [...page.querySelectorAll("article")];
  return (id: string) => {
    const card = articles[FISH.findIndex((fish) => fish.id === id)]!;
    return { text: card.textContent ?? "", lines: [...card.querySelectorAll("p")].map((line) => line.textContent), trophy: card.querySelector(".guide-trophy") };
  };
}

const stat = (speciesId: string, heaviest: number): CatchStat => ({ speciesId, caught: 2, heaviest, lastAt: "2026-10-01T12:00:00.000Z" });

describe("field guide card", () => {
  it("shows unknown fish only their shadow, banks, and best time per bank", () => {
    const unknown = cards([]);
    const catfish = unknown("catfish");
    expect(catfish.lines).toEqual(["Large shadow", "Dock at night · Drop-off at night"]);
    expect(catfish.text).toContain("Unknown");
    expect(catfish.text).not.toContain("Channel catfish");
    expect(catfish.text).not.toContain("Trophy");
    // Night swells the drop-off's big-lure pool with catfish and pike, so the sturgeon's share peaks by day.
    expect(unknown("sturgeon").lines).toEqual(["Huge shadow", "Drop-off at high sun · Open water at high sun"]);
    expect(unknown("perch").lines).toEqual(["Small shadow", "Dock at dawn · Reeds at high sun · Drop-off at high sun · Open water at dawn"]);
  });

  it("adds the lure size per bank and the trophy weight once a fish is logged", () => {
    const bass = cards([stat("smallmouth-bass", 2.4)])("smallmouth-bass");
    expect(bass.lines).toEqual([
      fishById("smallmouth-bass")!.lore,
      "2 landed · PB 2.4 lb",
      "Trophy ≥ 3.6 lb",
      "Medium shadow",
      "Dock: big lure at dusk",
      "Drop-off: small lure at dusk",
      "Draws on: Topwater (dawn, dusk), Spinner (dusk, dawn), Crankbait, Jig",
      "Bites: runs off with it, sliding the float away",
      "Jumper: every second run is a leap, so let go when it comes up",
      "Scrapper: pound for pound it fights hardest, so it tires slowly",
      "Charger: once a fight it runs straight at you, so reel fast to keep the line tight",
      "Fights hard: guarding its nest at the Reeds or the Dock in spring, in the Inlet's current",
      "Runs in summer",
    ]);
    expect(bass.trophy).toBeNull();
  });

  it("marks a fish whose best catch reached trophy size", () => {
    const guide = cards([stat("carp", 15.9), stat("perch", 1)]);
    expect(guide("carp").trophy?.textContent).toBe("Trophy");
    expect(guide("carp").lines).toContain("Dock: big lure at night");
    expect(guide("perch").trophy).toBeNull();
  });

  it("names the lures that draw a logged fish, and keeps them hidden until then", () => {
    expect(cards([stat("catfish", 4)])("catfish").lines).toContain("Draws on: Live bait (night)");
    expect(cards([])("catfish").text).not.toContain("Draws on");
    expect(cards([stat("sturgeon", 40)])("sturgeon").text).not.toContain("Draws on");
  });

  it("says how a logged fish bites, only for the ones with their own bite", () => {
    expect(cards([stat("bluegill", 0.5)])("bluegill").lines).toContain("Bites: pecks in quick taps before it pulls");
    expect(cards([stat("pike", 6)])("pike").lines).toContain("Bites: hits from nowhere, with no nibble first");
    expect(cards([stat("brook-trout", 0.4)])("brook-trout").lines).toContain("Bites: snatches it and lets go fast, so strike quick");
    expect(cards([stat("salmon", 3)])("salmon").lines).toContain("Bites: rolls on it at the top in a big splash");
    expect(cards([])("bluegill").text).not.toContain("Bites:");
    expect(cards([stat("golden-shiner", 0.2)])("golden-shiner").text).not.toContain("Bites:");
  });

  it("names the season a logged fish runs in, and says nothing for a fish with no season", () => {
    expect(cards([stat("salmon", 8)])("salmon").lines).toContain("Runs in fall");
    expect(cards([stat("burbot", 3)])("burbot").lines).toContain("Runs in winter");
    expect(cards([])("salmon").text).not.toContain("Runs in");
    expect(cards([stat("golden-shiner", 0.2)])("golden-shiner").text).not.toContain("Runs in");
  });

  it("says the clues are for a cast released in the band", () => {
    expect(render([]).querySelector(".guide-note")?.textContent).toBe("Lure and time clues assume a cast released in the band. Most fish tire sooner in winter's cold.");
  });

  it("lists a logged fish's own fight habits, as the fight card does, and keeps them hidden until then", () => {
    expect(cards([stat("pike", 4)])("pike").lines).toContain("Roller: at the net it rolls on the line instead of running");
    expect(cards([stat("crappie", 0.6)])("crappie").lines).toContain("Soft mouth: reel in the red and the hook tears out");
    expect(cards([])("pike").text).not.toContain("Roller:");
    expect(cards([stat("golden-shiner", 0.2)])("golden-shiner").lines.filter((line) => /^(Jumper|Breacher|Roller|Tail-walker|Scrapper|Circler|Quitter|Head-shaker|Bottom-sticker|Darter|Cover-diver|Long runner|Soft mouth):/.test(line))).toEqual([]);
  });

  it("says when a logged fish schools or comes to groundbait, and keeps it hidden until then", () => {
    const shiner = cards([stat("golden-shiner", 0.2)])("golden-shiner");
    expect(shiner.lines).toContain("Schools: land one and more are still there, so cast again quickly");
    expect(shiner.lines).toContain("Feeder: it comes in to feed on groundbait");
    expect(cards([stat("perch", 0.5)])("perch").lines).toContain("Schools: land one and more are still there, so cast again quickly");
    expect(cards([stat("perch", 0.5)])("perch").text).not.toContain("Feeder:");
    expect(cards([stat("carp", 8)])("carp").lines).toContain("Feeder: it comes in to feed on groundbait");
    expect(cards([stat("pike", 4)])("pike").text).not.toMatch(/Schools:|Feeder:/);
    expect(cards([])("golden-shiner").text).not.toMatch(/Schools:|Feeder:/);
  });

  it("says when a logged fish fights hard or tires sooner, and keeps it hidden until then", () => {
    expect(cards([stat("burbot", 3)])("burbot").lines).toContain("Fights hard: in winter's cold, after dark, in rain");
    expect(cards([stat("walleye", 3)])("walleye").lines).toContain("Tires sooner: in spring, after spawning");
    expect(cards([])("burbot").text).not.toContain("Fights hard");
    expect(cards([stat("golden-shiner", 0.2)])("golden-shiner").text).not.toMatch(/Fights hard|Tires sooner/);
  });

  it("shows each species' own shadow at its weight-range size without revealing its lore", () => {
    const articles = [...render([]).querySelectorAll("article")];
    FISH.forEach((fish, index) => {
      const card = articles[index]!;
      const svg = card.querySelector("svg")!;
      expect(svg.classList.contains(`shadow-${shadowSize(fish)}`)).toBe(true);
      expect(svg.getAttribute("viewBox")).toBe("0 0 80 36");
      expect(svg.getAttribute("aria-hidden")).toBe("true");
      expect(svg.querySelector("path")?.getAttribute("d")).toBe(fish.silhouette);
      expect(svg.querySelector("path")?.getAttribute("fill")).toBe("#161310");
      expect(card.textContent).not.toContain(fish.lore);
      expect(card.textContent).not.toContain(fish.name);
    });
  });

  it("colours a caught species' mark and reveals its lore", () => {
    const fish = fishById("catfish")!;
    const page = render([stat(fish.id, 4)]);
    const card = page.querySelectorAll("article")[FISH.indexOf(fish)]!;
    expect(card.querySelector("path")?.getAttribute("d")).toBe(fish.silhouette);
    expect(card.querySelector("path")?.getAttribute("fill")).toBe(fish.color);
    expect(card.querySelector("svg")?.getAttribute("class")).toBe("guide-fish");
    expect(card.querySelector(".guide-lore")?.textContent).toBe(fish.lore);
  });

  it("links a logged kind to its field log page when the book on this device holds some", () => {
    const page = JSDOM.fragment(
      renderToStaticMarkup(
        <MemoryRouter>
          <FieldGuide stats={[stat("smallmouth-bass", 2.4), stat("perch", 0.4)]} inBook={(name) => (name === "Smallmouth bass" ? 3 : 0)} />
        </MemoryRouter>,
      ),
    );
    const links = [...page.querySelectorAll(".guide-book a")];
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([["In your field log: 3", "/species/Smallmouth%20bass"]]);
  });
});
