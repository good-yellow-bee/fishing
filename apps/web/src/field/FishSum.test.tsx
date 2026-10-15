import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { sampleLogbook, type CatchEntry } from "@stillwater/shared";
import { FishSum } from "./FishSum";

const render = (catches: readonly CatchEntry[], oneKind = false) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <FishSum catches={catches} oneKind={oneKind} />
    </MemoryRouter>,
  );

describe("fish sum", () => {
  const catches = sampleLogbook(new Date(2026, 9, 1)).catches.slice(0, 3);

  it("counts released fish only when there are some", () => {
    expect(render(catches)).not.toContain("released");
    const marked = catches.map((entry, index) => (index < 2 ? { ...entry, released: true } : entry));
    expect(render(marked)).toContain(" · 2 released · ");
  });

  it("leaves the species out on a page about one kind", () => {
    const one = catches.filter((entry) => entry.species === catches[0]!.species);
    const html = render(one, true);
    expect(html).not.toContain("species");
    expect(html).toContain("Largest: ");
    expect(html).not.toContain(`Largest: ${one[0]!.species}`);
  });

  it("links the largest fish to its catch page", () => {
    const html = render(catches);
    expect(html).toMatch(/<a href="\/catches\/[^"]+"[^>]*>Largest: /);
  });
});
