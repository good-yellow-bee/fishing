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
    const one = catches.filter((entry) => entry.species === catches[0]!.species && entry.measure.kind === catches[0]!.measure.kind);
    const html = render(one, true);
    expect(html).not.toContain("species");
    expect(html).toContain("Largest: ");
    expect(html).not.toContain(`Largest: ${one[0]!.species}`);
  });

  it("links the largest fish to its catch page", () => {
    const html = render(catches.filter((entry) => entry.measure.kind === catches[0]!.measure.kind));
    expect(html).toMatch(/<a href="\/catches\/[^"]+"[^>]*>Largest: /);
  });

  it("names both the heaviest and the longest when they are different fish", () => {
    const fish = catches[0]!;
    const pike = { ...fish, id: "pike", species: "Northern pike", measure: { kind: "length" as const, inches: 40 } };
    const perch = { ...fish, id: "perch", species: "Yellow perch", measure: { kind: "weight" as const, pounds: 0.5 } };
    const html = render([pike, perch]);
    expect(html).toContain('href="/catches/perch" data-discover="true">Heaviest: Yellow perch, 0.5 lb</a>');
    expect(html).toContain('href="/catches/pike" data-discover="true">Longest: Northern pike, 40 in</a>');
    expect(html).not.toContain("Largest");
    const both = { ...pike, alsoMeasure: { kind: "weight" as const, pounds: 18 } };
    expect(render([both, perch])).toContain("Largest: Northern pike, 18 lb");
  });
});
