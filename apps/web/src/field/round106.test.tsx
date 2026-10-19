// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { CatchEntry } from "@stillwater/shared";
import { FishSum } from "./FishSum";
import { tripSummary } from "./summaries";
import { sameName } from "./tripDates";

const fish = (id: string, species: string, inches: number): CatchEntry => ({ id, species, measure: { kind: "length", inches }, lure: "Jig", spotId: "own", tripId: "t", caughtAt: "2026-08-20T08:00:00.000Z", note: "", weather: null });

describe("round 106: an outing's fish line", () => {
  it("counts a kind once however it was typed, named as most of its fish are", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <FishSum catches={[fish("a", "Perch", 9), fish("b", "perch ", 8), fish("c", "Perches", 10)]} />
      </MemoryRouter>,
    );
    expect(html).toContain("1 species");
    expect(html).toContain("Largest: Perch, 10 in");
  });
});

describe("round 106: an untitled outing on a water with stray spaces", () => {
  it("names the water once", () => {
    expect(sameName("  Pine   Pond ", "Pine Pond")).toBe(true);
    const trip = { id: "t", date: "2026-08-20", spotId: "own", title: "Pine Pond", note: "" };
    expect(tripSummary(trip, "  Pine   Pond ", []).split("\n")[0]).toMatch(/^[^·]+ · Pine Pond$/);
  });
});
