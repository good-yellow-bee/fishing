import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { CatchEntry } from "@stillwater/shared";
import { MonthBars } from "./MonthBars";

const fish = (id: string, caughtAt: string) => ({ id, caughtAt: new Date(caughtAt).toISOString(), spotId: "own", tripId: null, species: "Zander", lure: "Jig", measure: { kind: "length", inches: 20 }, released: false, note: "" }) as unknown as CatchEntry;

const draw = (catches: CatchEntry[]) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <MonthBars catches={catches} within="water:&quot;Own&quot;" />
    </MemoryRouter>,
  );

describe("round 75 ideas: Through the year names the best month", () => {
  it("says which month gave most, out of all", () => {
    const html = draw([fish("a", "2025-10-04T09:00:00"), fish("b", "2026-10-10T09:00:00"), fish("c", "2026-05-02T09:00:00")]);
    expect(html).toContain("Best month: October (2 of 3)");
  });

  it("leaves it out on a tie", () => {
    expect(draw([fish("a", "2025-10-04T09:00:00"), fish("c", "2026-05-02T09:00:00")])).not.toContain("Best month");
  });
});
