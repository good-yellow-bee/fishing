import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MapLoading } from "./MapOffline";

describe("the map while its code loads", () => {
  it("keeps the page's heading and says the map is coming", () => {
    const html = renderToStaticMarkup(<MapLoading />);
    expect(html).toContain("<h1>Map</h1>");
    expect(html).toMatch(/role="status"[^>]*>Fog lifting…</);
  });

  it("stands in for the map on its route", () => {
    const app = readFileSync(`${import.meta.dirname}/../../App.tsx`, "utf8");
    expect(app).toContain("<Suspense fallback={<MapLoading />}>");
  });
});
