import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { FishSum } from "./FishSum";

describe("fish sum", () => {
  const catches = sampleLogbook(new Date(2026, 9, 1)).catches.slice(0, 3);

  it("counts released fish only when there are some", () => {
    expect(renderToStaticMarkup(<FishSum catches={catches} />)).not.toContain("released");
    const marked = catches.map((entry, index) => (index < 2 ? { ...entry, released: true } : entry));
    expect(renderToStaticMarkup(<FishSum catches={marked} />)).toContain(" · 2 released · ");
  });
});
