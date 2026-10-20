// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { CatchEntry } from "@stillwater/shared";
import { LureChips, SpeciesChips } from "./SpeciesChips";
import { catchesCsv } from "./catchCsv";

const fish = (id: string): CatchEntry => ({ id, species: "perch ", measure: { kind: "length", inches: 9 }, lure: "spinner", spotId: "a", tripId: "t", caughtAt: "2026-10-17T05:00:00.000Z", note: "", weather: null });

describe("round 112: an outing's chips and sheet", () => {
  it("name kinds and lures as the book does", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SpeciesChips catches={[fish("1"), fish("2")]} outing={{ date: "2026-10-17", title: "Dawn" }} kindName={() => "Perch"} />
        <LureChips catches={[fish("1"), fish("2")]} outing={{ date: "2026-10-17", title: "Dawn" }} lureName={() => "Spinner"} />
      </MemoryRouter>,
    );
    expect(html).toContain("Perch (2)");
    expect(html).toContain("Spinner (2)");
    const csv = catchesCsv({ spots: [], trips: [], catches: [fish("1")] }, { kindName: () => "Perch", lureName: () => "Spinner" });
    expect(csv).toContain("Perch");
    expect(csv).toContain("Spinner");
  });
});
