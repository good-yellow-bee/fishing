// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TackleList } from "./gear/TackleList";
import { TackleProvider } from "./gear/TackleState";

afterEach(() => vi.unstubAllGlobals());

describe("round 115 ideas: a packed piece that took fish on the outing's water", () => {
  it("says how many, a lure however written one count", () => {
    const stored = JSON.stringify({ items: [{ id: "a", tripId: "t", label: "Spinner", packed: true }] });
    vi.stubGlobal("localStorage", { getItem: (key: string) => (key === "stillwater.tackle.v1" ? stored : null), setItem: () => undefined, removeItem: () => undefined });
    const html = renderToStaticMarkup(
      <TackleProvider>
        <TackleList tripId="t" suggest={["Spinner", "spinners"]} suggestCounts={new Map([["Spinner", 3], ["spinners", 1]])} />
      </TackleProvider>,
    );
    expect(html).toContain("4 fish here");
  });
});
